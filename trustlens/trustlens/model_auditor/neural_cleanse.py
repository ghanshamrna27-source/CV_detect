"""Neural Cleanse (Wang et al., S&P 2019), ported from BackdoorBench `defense/nc.py`
(CC BY-NC 4.0, see THIRD_PARTY.md). White-box: needs gradients through the model.

For each class t, optimise a mask m and pattern p so that (1-m)*x + m*p is classified as t,
while keeping ||m||_1 small. A class reachable with an abnormally small mask (MAD anomaly
index > 2, on the small side) is the backdoor target, and (m, p) is the recovered trigger.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch
import torch.nn.functional as F

EPS = 1e-7


@dataclass
class ClassResult:
    target: int
    l1: float
    attack_acc: float
    mask: np.ndarray      # (H, W) in [0, 1]
    pattern: np.ndarray   # (3, H, W) in [0, 1]
    converged: bool


def _to_param(x: torch.Tensor) -> torch.Tensor:
    """Inverse of tanh(v)/(2-eps)+0.5 so the optimisation starts at x."""
    x = x.clamp(0.02, 0.98)
    return torch.atanh((x - 0.5) * (2 - EPS))


def reverse_engineer(model, x: torch.Tensor, target: int, cfg: dict, device, log=None) -> ClassResult:
    """x: clean images, float NCHW in [0, 1] (on CPU); model outputs logits."""
    n, c, h, w = x.shape
    bs = cfg["batch_size"]
    g = torch.Generator().manual_seed(1000 + target)
    mask_p = _to_param(torch.rand(1, 1, h, w, generator=g)).to(device).requires_grad_(True)
    pattern_p = _to_param(torch.rand(1, c, h, w, generator=g)).to(device).requires_grad_(True)
    opt = torch.optim.Adam([mask_p, pattern_p], lr=cfg["lr"], betas=(0.5, 0.9))

    cost = cfg["init_cost"]
    up, down = cfg["cost_multiplier"], cfg["cost_multiplier"] ** 1.5
    patience, thr = cfg["patience"], cfg["attack_succ_threshold"]
    cost_up_counter = cost_down_counter = 0
    best = None  # (l1, acc, mask, pattern)
    round_steps = cfg.get("round_steps", 10)  # the cost schedule is checked every "round"
    tgt_full = torch.full((bs,), target, device=device, dtype=torch.long)
    x = x.to(device)

    use_amp = device.type == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)
    acc_sum = torch.zeros((), device=device)
    reg_sum = torch.zeros((), device=device)
    for step in range(1, cfg["steps"] + 1):
        # one optimisation step on a random batch of clean images
        xb = x[torch.randint(0, n, (bs,), generator=g).to(device)]
        mask = torch.tanh(mask_p) / (2 - EPS) + 0.5
        pattern = torch.tanh(pattern_p) / (2 - EPS) + 0.5
        x_adv = (1 - mask) * xb + mask * pattern
        with torch.autocast(device.type, dtype=torch.float16, enabled=use_amp):
            logits = model(x_adv)
            loss_ce = F.cross_entropy(logits.float(), tgt_full)
        loss_reg = mask.abs().sum()
        loss = loss_ce + cost * loss_reg
        opt.zero_grad(set_to_none=True)
        scaler.scale(loss).backward()
        scaler.step(opt)
        scaler.update()
        acc_sum += (logits.argmax(1) == tgt_full).float().mean().detach()
        reg_sum += loss_reg.detach()

        if step % round_steps == 0:  # sync with the GPU only once per round
            acc, reg = acc_sum.item() / round_steps, reg_sum.item() / round_steps
            acc_sum.zero_()
            reg_sum.zero_()
            if acc >= thr and (best is None or reg < best[0]):
                best = (reg, acc, mask.detach().cpu().numpy()[0, 0], pattern.detach().cpu().numpy()[0])
            if acc >= thr:
                cost_up_counter, cost_down_counter = cost_up_counter + 1, 0
            else:
                cost_up_counter, cost_down_counter = 0, cost_down_counter + 1
            if cost_up_counter >= patience:
                cost_up_counter, cost = 0, cost * up
            if cost_down_counter >= patience:
                cost_down_counter, cost = 0, cost / down
        if log and step % 200 == 0:
            log(f"    NC class {target}: step {step}/{cfg['steps']} cost {cost:.2e}"
                f" best l1 {best[0] if best else float('nan'):.1f}")

    if best is None:  # never reached the success threshold: report the final state
        with torch.no_grad():
            mask = torch.tanh(mask_p) / (2 - EPS) + 0.5
            pattern = torch.tanh(pattern_p) / (2 - EPS) + 0.5
        return ClassResult(target, float(mask.abs().sum()), float("nan"),
                           mask.cpu().numpy()[0, 0], pattern.cpu().numpy()[0], False)
    return ClassResult(target, best[0], best[1], best[2], best[3], True)


def anomaly_index(l1: np.ndarray) -> np.ndarray:
    """MAD-based anomaly index of each class's mask L1 norm (consistency constant 1.4826)."""
    med = np.median(l1)
    mad = 1.4826 * np.median(np.abs(l1 - med))
    return np.abs(l1 - med) / (mad + EPS)


def run(model, x_clean: np.ndarray, num_classes: int, cfg: dict, device, log=print) -> dict:
    """Run NC for every class. x_clean: uint8 NHWC clean held-out images."""
    for p in model.parameters():
        p.requires_grad_(False)
    model = model.to(device).eval()
    x = torch.from_numpy(x_clean).permute(0, 3, 1, 2).float().div_(255).contiguous()
    results = []
    for t in range(num_classes):
        r = reverse_engineer(model, x, t, cfg, device, log=None)
        log(f"  NC class {t}: mask L1 {r.l1:8.2f}  attack acc {r.attack_acc:.3f}"
            f"{'' if r.converged else '  (did not reach threshold)'}")
        results.append(r)
    l1 = np.array([r.l1 for r in results])
    ai = anomaly_index(l1)
    med = np.median(l1)
    flagged = [int(i) for i in range(num_classes) if l1[i] < med and ai[i] > cfg["anomaly_threshold"]]
    target = int(min(flagged, key=lambda i: l1[i])) if flagged else None
    return {
        "l1": l1, "anomaly_index": ai, "flagged_classes": flagged, "target": target,
        "attack_acc": np.array([r.attack_acc for r in results]),
        "converged": np.array([r.converged for r in results]),
        "masks": np.stack([r.mask for r in results]),
        "patterns": np.stack([r.pattern for r in results]),
    }
