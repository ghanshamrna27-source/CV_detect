"""Trigger-to-source trace: the headline feature (plan section 5.5).

1. Take Neural Cleanse's recovered mask m, pattern p and target class t.
2. Pixel match for each training sample labelled t:  s_pix = 1 - ||m * (x - p)||_1 / ||m||_1
3. Feature match: stamp the trigger onto clean held-out images, take the mean penultimate
   feature (the trigger signature); s_feat = cos(feature(x), signature).
4. s = 0.5 * s_pix + 0.5 * s_feat. Candidates: s above the 99th percentile of s on clean
   held-out images of class t (known clean), combined with Activation Clustering flags.
5. Group candidates by contributor; the dominant contributor is reported as the source.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from trustlens.common.adapters import TorchModelAdapter
from trustlens.common.config import ROOT, Paths, get_device, load_config, seed_everything
from trustlens.common.hashing import sha256_file
from trustlens.common.io import load_npz, load_pool, load_scores, rel, save_grid, scores_path, write_json
from trustlens.common.schema import EvidenceWriter
from trustlens.data_scanner.scan import model_features
from trustlens.provenance.merkle_log import MerkleLog


def pixel_match(x: np.ndarray, mask: np.ndarray, pattern: np.ndarray) -> np.ndarray:
    """x: float NCHW in [0,1]; mask (H,W); pattern (3,H,W). Returns s_pix in [0, 1]."""
    diff = np.abs(x - pattern[None]).mean(1)  # mean over channels -> (N,H,W)
    return 1.0 - (mask[None] * diff).sum((1, 2)) / (mask.sum() + 1e-8)


def _cos(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    return (a @ b) / (np.linalg.norm(a, axis=1) * np.linalg.norm(b) + 1e-8)


def run(cfg: dict | None = None, model_name: str = "pool", log=print) -> dict:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg)
    seed_everything(cfg["seed"])
    tc = cfg["trace"]
    names = cfg["dataset"]["class_names"]
    device = get_device(cfg["training"]["device"])

    nc_path = paths.evidence / f"nc_{model_name}.npz"
    if not nc_path.exists():
        raise FileNotFoundError(f"{nc_path} missing: run the model audit (white-box) first")
    nc = load_npz(nc_path)
    t = int(nc["target"])
    if t < 0:
        result = {"status": "no_backdoor_target", "detail": "Neural Cleanse flagged no class; nothing to trace"}
        write_json(paths.evidence / "trace.json", result)
        log("  trace: NC found no backdoor target class")
        return result
    mask, pattern = nc["masks"][t].astype(np.float32), nc["patterns"][t].astype(np.float32)

    pool = load_pool(paths)
    x, y, contrib, sids = pool["x"], pool["y"], pool["contributor"], pool["sample_id"]
    held = load_npz(paths.data / "heldout.npz")
    adapter = TorchModelAdapter.from_dir(paths.models / model_name, device)

    # trigger signature from clean held-out images of other classes, stamped with the recovered trigger
    rng = np.random.default_rng(cfg["seed"])
    other = np.flatnonzero(held["y"] != t)
    sig_idx = rng.choice(other, min(tc["signature_samples"], len(other)), replace=False)
    xs = held["x"][sig_idx].astype(np.float32).transpose(0, 3, 1, 2) / 255.0
    stamped = (1 - mask[None, None]) * xs + mask[None, None] * pattern[None]
    stamped_u8 = (np.clip(stamped, 0, 1) * 255).round().astype(np.uint8).transpose(0, 2, 3, 1)
    signature = adapter.features(stamped_u8).mean(0)
    stamped_pred = adapter.predict_proba(stamped_u8).argmax(1)
    trigger_asr = float((stamped_pred == t).mean())

    def score(xu8: np.ndarray, feats: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        xf = xu8.astype(np.float32).transpose(0, 3, 1, 2) / 255.0
        s_pix = pixel_match(xf, mask, pattern)
        s_feat = _cos(feats, signature)
        return tc["w_pix"] * s_pix + tc["w_feat"] * s_feat, s_pix, s_feat

    # threshold from KNOWN-CLEAN held-out images of class t (the signature never used these)
    ht = np.flatnonzero(held["y"] == t)
    s_clean, _, _ = score(held["x"][ht], adapter.features(held["x"][ht]))
    thr = float(np.percentile(s_clean, tc["percentile"]))

    in_t = np.flatnonzero(y == t)
    feats_pool = model_features(paths, model_name, x, device)
    s, s_pix, s_feat = score(x[in_t], feats_pool[in_t])

    scores = load_scores(paths)
    ac = scores["ac_flag"].fillna(False).to_numpy(bool) if "ac_flag" in scores else np.zeros(len(y), bool)
    over = s > thr
    cand_local = over | ac[in_t]
    cand = in_t[cand_local]

    trace_score = np.full(len(y), np.nan, np.float32)
    trace_score[in_t] = s
    cand_mask = np.zeros(len(y), bool)
    cand_mask[cand] = True
    pd.DataFrame({"sample_id": sids, "trace_score": trace_score, "trace_candidate": cand_mask}).to_parquet(
        scores_path(paths, "trace"), index=False)

    counts = pd.Series(contrib[cand]).value_counts()
    class_counts = pd.Series(contrib[in_t]).value_counts()
    breakdown = [{"contributor": c, "candidates": int(counts.get(c, 0)),
                  "share_of_candidates": float(counts.get(c, 0) / max(1, len(cand))),
                  "class_t_samples": int(class_counts.get(c, 0)),
                  "candidate_rate": float(counts.get(c, 0) / max(1, class_counts.get(c, 0)))}
                 for c in sorted(np.unique(contrib))]
    source = counts.index[0] if len(counts) else None
    share = float(counts.iloc[0] / len(cand)) if len(cand) else 0.0

    # images: top candidates by score, and the recovered trigger applied to a clean image
    order = np.argsort(-trace_score[cand]) if len(cand) else np.array([], int)
    top = cand[order][:32]
    grid = save_grid(paths.evidence_img / "trace" / "candidates.png", x[top],
                     [str(sids[i]).split("/")[0] for i in top], cols=8)
    ex = save_grid(paths.evidence_img / "trace" / "stamped_examples.png", stamped_u8[:8], cols=8)

    result = {
        "status": "traced" if source else "no_candidates",
        "target_class": t, "target_name": names[t], "model": model_name,
        "source": source, "source_share": share, "n_candidates": int(len(cand)),
        "n_over_threshold": int(over.sum()), "n_ac_only": int((cand_local & ~over).sum()),
        "threshold": thr, "threshold_rule": f"p{tc['percentile']} of s on {len(ht)} clean held-out images of class {t}",
        "trigger_asr_on_heldout": trigger_asr, "mask_l1": float(mask.sum()),
        "breakdown": breakdown,
        "images": {"candidates": rel(grid, ROOT), "stamped_examples": rel(ex, ROOT)},
        "method": "0.5*pixel match to NC trigger + 0.5*cosine to trigger feature signature, "
                  "combined with Activation Clustering flags",
        "score_hist": {"pool_class_t": np.histogram(s, bins=30, range=(0, 1))[0].tolist(),
                       "clean_heldout": np.histogram(s_clean, bins=30, range=(0, 1))[0].tolist()},
        "limitations": ["Relies on Neural Cleanse recovering the trigger; invisible or input-specific triggers "
                        "would need a different reconstruction step.",
                        "Candidate images also include AC-flagged samples of class t, which may contain "
                        "natural outliers."],
    }

    with EvidenceWriter(paths.evidence / "trace.jsonl", "risk.trace", "trc") as ev:
        src = ev.add(subject_type="contributor", subject_id=source or "none", contributor=source,
                     check="backdoor_source", score=share, threshold=0.5, flagged=bool(source and share >= 0.5),
                     confidence="high" if share >= 0.8 else "medium" if share >= 0.5 else "low",
                     method=result["method"], access_level="white-box",
                     artefacts=[result["images"]["candidates"]],
                     details={k: result[k] for k in ("target_class", "target_name", "n_candidates", "breakdown",
                                                     "threshold", "trigger_asr_on_heldout")})
        for i in cand[order]:
            ev.add(subject_type="sample", subject_id=str(sids[i]), contributor=str(contrib[i]),
                   check="carries_recovered_trigger", score=float(trace_score[i]), threshold=thr,
                   flagged=True, confidence="high" if trace_score[i] > thr and ac[i] else "medium",
                   method=result["method"], access_level="white-box",
                   details={"ac_flag": bool(ac[i]), "over_threshold": bool(trace_score[i] > thr)})
        result["source_evidence_id"] = src.evidence_id

    write_json(paths.evidence / "trace.json", result)
    digest = sha256_file(paths.evidence / "trace.jsonl")
    MerkleLog(paths.ledger).append(f"trace-{digest[:16]}", "trace_report", {
        "target_class": t, "source": source, "source_share": round(share, 4), "n_candidates": int(len(cand)),
        "evidence_file_sha256": digest})
    log(f"  trace: target class {t} ({names[t]}) -> source {source} "
        f"({share:.1%} of {len(cand)} candidates; threshold {thr:.3f})")
    return result
