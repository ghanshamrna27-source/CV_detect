"""Train the reference ("vendor's clean") and pool ("substituted") models (plan section 5.2).

SGD lr 0.1, momentum 0.9, wd 5e-4, cosine schedule, batch 128, AMP. The whole training set is
kept on the GPU as uint8 and augmented there (random crop 4 px + horizontal flip), which avoids
DataLoader worker overhead on Windows laptops.
"""

from __future__ import annotations

import time

import numpy as np
import torch
import torch.nn.functional as F

from trustlens.attacks.badnets import stamp
from trustlens.common.config import Paths, get_device, load_config, seed_everything
from trustlens.common.hashing import sha256_bytes
from trustlens.common.io import load_npz
from trustlens.training.models import build_model, save_model


def _augment(xb: torch.Tensor, ops=("crop", "flip")) -> torch.Tensor:
    b = xb.shape[0]
    if "crop" not in ops:
        return _flip(xb) if "flip" in ops else xb
    xp = F.pad(xb, (4, 4, 4, 4), mode="reflect")
    dy = torch.randint(0, 9, (b,), device=xb.device)
    dx = torch.randint(0, 9, (b,), device=xb.device)
    ar = torch.arange(32, device=xb.device)
    iy = (dy[:, None] + ar[None, :])[:, :, None]
    ix = (dx[:, None] + ar[None, :])[:, None, :]
    bi = torch.arange(b, device=xb.device)[:, None, None]
    out = xp.permute(0, 2, 3, 1)[bi, iy, ix].permute(0, 3, 1, 2).contiguous()
    return _flip(out) if "flip" in ops else out


def _flip(xb: torch.Tensor) -> torch.Tensor:
    flip = torch.rand(xb.shape[0], device=xb.device) < 0.5
    xb[flip] = xb[flip].flip(3)
    return xb


@torch.no_grad()
def evaluate(model, x: np.ndarray, y: np.ndarray, device, batch: int = 512) -> float:
    model.eval()
    correct = 0
    for s in range(0, len(x), batch):
        xb = torch.from_numpy(x[s:s + batch]).to(device).permute(0, 3, 1, 2).float().div_(255)
        pred = model(xb).argmax(1).cpu().numpy()
        correct += int((pred == y[s:s + batch]).sum())
    return correct / max(1, len(x))


def attack_success_rate(model, x: np.ndarray, y: np.ndarray, target: int, patch: int, value: int, device) -> float:
    keep = y != target
    xs = stamp(x[keep], patch, value)
    return evaluate(model, xs, np.full(keep.sum(), target), device)


def train_model(x: np.ndarray, y: np.ndarray, cfg: dict, device, log=print):
    tc = cfg["training"]
    model = build_model(tc["arch"], cfg["dataset"]["num_classes"]).to(device)
    X = torch.from_numpy(x).permute(0, 3, 1, 2).contiguous().to(device)  # uint8 on device
    Y = torch.from_numpy(y.astype(np.int64)).to(device)
    n, bs = len(X), tc["batch_size"]
    steps_per_epoch = (n + bs - 1) // bs
    opt = torch.optim.SGD(model.parameters(), lr=tc["lr"], momentum=tc["momentum"],
                          weight_decay=tc["weight_decay"], nesterov=True)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=tc["lr"], total_steps=tc["epochs"] * steps_per_epoch,
                                                pct_start=0.15, anneal_strategy="cos")
    use_amp = tc["amp"] and device.type == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)
    for epoch in range(tc["epochs"]):
        model.train()
        perm = torch.randperm(n, device=device)
        total, t0 = 0.0, time.time()
        for s in range(0, n, bs):
            idx = perm[s:s + bs]
            xb = _augment(X[idx].float().div_(255), tc.get("augment", ("crop", "flip")))
            with torch.autocast(device.type, dtype=torch.float16, enabled=use_amp):
                loss = F.cross_entropy(model(xb), Y[idx])
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            sched.step()
            total += loss.item() * len(idx)
        log(f"  epoch {epoch + 1:>3}/{tc['epochs']}  loss {total / n:.4f}  ({time.time() - t0:.1f}s)")
    return model.eval()


def train(which: str = "both", cfg: dict | None = None, log=print) -> dict:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg).ensure()
    device = get_device(cfg["training"]["device"])
    evalset = load_npz(paths.data / "evalset.npz")
    atk = cfg["attacks"]["C3"]
    results = {}
    sets = {"reference": "clean.npz", "pool": "pool.npz"}
    for name in (["reference", "pool"] if which == "both" else [which]):
        seed_everything(cfg["seed"])
        data = load_npz(paths.data / sets[name])
        log(f"training {name} model on {len(data['y'])} images ({device})")
        t0 = time.time()
        model = train_model(data["x"], data["y"], cfg, device, log)
        meta = {
            "arch": cfg["training"]["arch"],
            "num_classes": cfg["dataset"]["num_classes"],
            "trained_on": name,
            "train_set_sha256": sha256_bytes(data["x"].tobytes() + data["y"].astype(np.int64).tobytes()),
            "epochs": cfg["training"]["epochs"],
            "clean_acc": round(evaluate(model, evalset["x"], evalset["y"], device), 4),
            "asr": round(attack_success_rate(model, evalset["x"], evalset["y"], atk["target"],
                                             atk["patch_size"], atk["patch_value"], device), 4),
            "train_seconds": round(time.time() - t0, 1),
            "input": "RGB float in [0,1], NCHW 32x32; normalisation inside the model",
        }
        save_model(model.cpu(), paths.models / name, meta)
        log(f"  {name}: clean acc {meta['clean_acc']:.3f}, attack success rate {meta['asr']:.3f}")
        results[name] = meta
    return results


if __name__ == "__main__":
    train()
