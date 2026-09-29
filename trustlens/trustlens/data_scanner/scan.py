"""Data scanner orchestrator (plan section 5.3).

Loads the contributed pool through the key broker (attested decryption), runs every check,
and writes per-sample score tables, sample-level evidence records, contributor metrics and
example images. Each evidence file's digest is logged to the Merkle log.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from trustlens.attacks.augment import near_copy
from trustlens.common.adapters import CIFAR10Adapter, TorchModelAdapter
from trustlens.common.config import ROOT, Paths, get_device, load_config, seed_everything
from trustlens.common.hashing import model_manifest_sha256, sha256_bytes, sha256_file
from trustlens.common.io import (load_manifest, load_npz, load_pool, load_scores, rel, save_grid,
                                 scores_path, write_json)
from trustlens.common.schema import EvidenceWriter
from trustlens.data_scanner import contributor_metrics, duplicates, embeddings, labels, ood, poison
from trustlens.provenance.merkle_log import MerkleLog


def model_features(paths, model_name: str, x: np.ndarray, device) -> np.ndarray:
    # key on the data AND the model, so a retrained model never reuses stale features
    key = sha256_bytes(x.tobytes() + model_manifest_sha256(paths.models / model_name).encode())[:16]
    cache = paths.cache / f"feats_{model_name}_{key}.npy"
    if cache.exists():
        return np.load(cache)
    feats = TorchModelAdapter.from_dir(paths.models / model_name, device).features(x).astype(np.float32)
    cache.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache, feats)
    return feats


def _log_file(ledger: MerkleLog, path, kind: str, n: int) -> None:
    digest = sha256_file(path)
    ledger.append(f"{kind}-{digest[:16]}", kind, {"file": rel(path, ROOT), "sha256": digest, "records": n})


def scan(cfg: dict | None = None, plaintext: bool = False, log=print) -> pd.DataFrame:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg).ensure()
    seed_everything(cfg["seed"])
    sc = cfg["scanner"]
    k = cfg["dataset"]["num_classes"]
    names = cfg["dataset"]["class_names"]
    device = get_device(cfg["training"]["device"])
    ledger = MerkleLog(paths.ledger)
    manifest = load_manifest(paths).set_index("sample_id")
    img_dir = paths.evidence_img

    # ---- 0. load the pool (attested key release unless --plaintext)
    attestation = None
    if plaintext:
        pool = load_pool(paths)
    else:
        from trustlens.tee.enclave import attested_pool

        pool, attestation = attested_pool(cfg)
        log(f"  attestation ok; broker released {len(attestation['released'])} batch keys")
    x, y, contrib, sids = CIFAR10Adapter(pool, k).arrays()
    if list(sids) != list(manifest.index):
        raise RuntimeError("decrypted batches do not match the manifest order")
    paths_of = manifest["path"].to_dict()

    # ---- 1. embeddings
    emb, emb_method = embeddings.embed(x, sc["embeddings"], paths, device, log)
    log(f"  embeddings: {emb.shape} via {emb_method}")

    # ---- 2. near-duplicates (+ calibration on known augmented pairs from held-out data)
    held = load_npz(paths.data / "heldout.npz")["x"][:200]
    rng = np.random.default_rng(cfg["seed"])
    aug = np.stack([near_copy(im, rng, cfg["attacks"]["C5"]["jpeg_quality"]) for im in held])
    e_h, _ = embeddings.embed(held, sc["embeddings"], paths, device, log=lambda *_: None)
    e_a, _ = embeddings.embed(aug, sc["embeddings"], paths, device, log=lambda *_: None)
    calib = duplicates.calibrate(e_h, e_a, held, aug)
    dup = duplicates.detect(emb, x, sids, sc["duplicates"], device)
    dup.to_parquet(scores_path(paths, "dup"), index=False)
    log(f"  duplicates: {int(dup['in_dup'].sum())} samples in clusters of >= {sc['duplicates']['min_cluster']}"
        f" (known augmented pairs: aligned correlation p5 {calib['aligned_ncc_p5']:.3f}, "
        f"cosine p5 {calib['cosine_p5']:.3f})")

    # ---- 3. OOD
    oo, ood_thr = ood.detect(emb, contrib, sids, sc["ood"])
    oo.to_parquet(scores_path(paths, "ood"), index=False)
    log(f"  OOD: threshold {ood_thr:.4f}, {int(oo['ood_flag'].sum())} flagged")

    # ---- 4. label issues
    lab = labels.detect(emb, y, sids, sc["labels"], cfg["seed"])
    lab.to_parquet(scores_path(paths, "labels"), index=False)
    log(f"  label issues: {int(lab['label_issue'].sum())} flagged")

    # ---- 5. poison (on the pool model's penultimate features)
    feats = model_features(paths, "pool", x, device)
    poi, poi_info = poison.detect(feats, y, sids, k, sc["poison"], cfg["seed"],
                                  independent_pred=lab["suggested_label"].to_numpy())
    poi.to_parquet(scores_path(paths, "poison"), index=False)
    log(f"  poison: AC suspicious classes {poi_info['suspicious_classes']}, "
        f"{int(poi['poison_flag'].sum())} samples flagged")

    # ---- 6. sample-level evidence + example images
    scores = load_scores(paths)
    ev_path = paths.evidence / "data_scanner.jsonl"
    with EvidenceWriter(ev_path, "data_scanner", "dat") as ev:
        # duplicate clusters: one montage per large cluster (top 6 per contributor)
        dup_rows = scores[scores["in_dup"].fillna(False)]
        montage_of: dict[int, str] = {}
        for c, g in dup_rows.groupby("contributor"):
            top = g.groupby("dup_cluster").size().sort_values(ascending=False).head(6).index
            for cl in top:
                members = scores.index[scores["dup_cluster"] == cl][:12]
                p = save_grid(img_dir / "dup" / f"{c}_cluster{cl}.png", x[members],
                              [str(sids[i]).split("/")[0] for i in members], cols=6)
                montage_of[int(cl)] = rel(p, ROOT)
        for i in np.flatnonzero(scores["in_dup"].fillna(False).to_numpy()):
            r = scores.iloc[i]
            cl = int(r["dup_cluster"])
            ev.add(module="data_scanner.duplicates", subject_type="sample", subject_id=r["sample_id"],
                   contributor=r["contributor"], check="near_duplicate", score=r["nn_aligned_ncc"],
                   threshold=sc["duplicates"]["aligned_ncc"], flagged=True,
                   confidence="high" if r["nn_aligned_ncc"] >= 0.97 else "medium",
                   method=f"FAISS kNN (k={sc['duplicates']['k']}) on {emb_method} proposes pairs (cosine >= "
                          f"{sc['duplicates']['cosine']}); flip/shift-aligned pixel correlation confirms",
                   artefacts=[paths_of[r["sample_id"]]] + ([montage_of[cl]] if cl in montage_of else []),
                   details={"nearest": r["nn_id"], "cluster": cl, "cluster_size": int(r["dup_cluster_size"]),
                            "cosine": float(r["nn_cos"]),
                            "phash_distance": int(r["nn_phash_dist"])})

        for i in np.flatnonzero(scores["ood_flag"].fillna(False).to_numpy()):
            r = scores.iloc[i]
            ev.add(module="data_scanner.ood", subject_type="sample", subject_id=r["sample_id"],
                   contributor=r["contributor"], check="out_of_distribution", score=r["ood_score"],
                   threshold=ood_thr, flagged=True, confidence="medium",
                   method=f"mean cosine distance to {sc['ood']['k']} nearest samples of OTHER contributors "
                          f"({emb_method}); flag above pool p{sc['ood']['percentile']}",
                   artefacts=[paths_of[r["sample_id"]]], details={"label": names[int(r["label"])]})

        for i in np.flatnonzero(scores["label_issue"].fillna(False).to_numpy()):
            r = scores.iloc[i]
            ev.add(module="data_scanner.labels", subject_type="sample", subject_id=r["sample_id"],
                   contributor=r["contributor"], check="label_issue", score=1.0 - float(r["label_quality"]),
                   threshold=None, flagged=True, confidence="high" if r["label_quality"] < 0.05 else "medium",
                   method="cleanlab find_label_issues on 5-fold out-of-fold logistic-regression "
                          f"probabilities over {emb_method}",
                   artefacts=[paths_of[r["sample_id"]]],
                   details={"given": names[int(r["label"])], "suggested": names[int(r["suggested_label"])],
                            "self_confidence": float(r["label_quality"])})

        for i in np.flatnonzero(scores["poison_flag"].fillna(False).to_numpy()):
            r = scores.iloc[i]
            both = bool(r["ac_flag"]) and bool(r["ss_flag"])
            ev.add(module="data_scanner.poison", subject_type="sample", subject_id=r["sample_id"],
                   contributor=r["contributor"], check="trigger_poison", score=float(r["ss_score"]),
                   threshold=None, flagged=True, confidence="high" if both else "medium",
                   method=f"Activation Clustering (PCA-{sc['poison']['nb_dims']}, {sc['poison']['nb_clusters']}-means; "
                          f"cluster < {sc['poison']['size_threshold']:.0%} of its class whose CLIP view disagrees "
                          f">= {sc['poison']['disagreement_min']:.0%}) + Spectral Signatures on pool-model features",
                   access_level="white-box", artefacts=[paths_of[r["sample_id"]]],
                   details={"ac_flag": bool(r["ac_flag"]), "ss_flag": bool(r["ss_flag"]),
                            "class": names[int(r["label"])]})
        n_records = len(ev.records)

    # per-contributor example grids for the dashboard
    for c in np.unique(contrib):
        sel = scores["contributor"] == c
        for check, col, cap in (("ood", "ood_score", None), ("labels", "label_issue", "suggested_label"),
                                ("poison", "poison_flag", None)):
            g = scores[sel & scores[col].fillna(False).astype(bool)] if check != "ood" else \
                scores[sel & scores["ood_flag"].fillna(False)].sort_values("ood_score", ascending=False)
            g = g.head(24)
            if len(g):
                caps = ([f"{names[int(a)][:4]}>{names[int(b)][:4]}" for a, b in zip(g["label"], g[cap])]
                        if cap else [names[int(a)][:5] for a in g["label"]])
                save_grid(img_dir / check / f"{c}.png", x[g.index.to_numpy()], caps, cols=8)

    # ---- 7. contributor metrics
    metrics = contributor_metrics.compute(scores, k, names)
    metrics.to_csv(paths.evidence / "contributor_metrics.csv", index=False)
    write_json(paths.evidence / "scan_summary.json", {
        "embedding_method": emb_method, "n_samples": int(len(sids)), "dup_calibration": calib,
        "dup_thresholds": sc["duplicates"], "ood_threshold": ood_thr, "poison": poi_info,
        "attestation": attestation, "evidence_records": n_records,
    })
    _log_file(ledger, ev_path, "evidence_batch", n_records)
    log(f"  wrote {n_records} sample-level evidence records")
    return metrics


if __name__ == "__main__":
    print(scan())
