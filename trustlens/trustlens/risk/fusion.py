"""Contributor trust scores from peer-relative robust z-scores (plan section 5.5).

    z_k(c)   = (x_k(c) - median_k) / (1.4826 * MAD_k + eps)     (MAD floored per metric)
    risk(c)  = sum_k w_k * max(0, z_k(c))
    trust(c) = 100 * exp(-risk(c) / 5)            flagged if any z_k(c) >= 3.5

Each contributor's result links to the evidence records behind it: its evidence pack.
"""

from __future__ import annotations

from collections import defaultdict

import numpy as np
import pandas as pd

from trustlens.common.config import Paths, load_config
from trustlens.common.hashing import sha256_file
from trustlens.common.io import write_json
from trustlens.common.schema import EvidenceWriter, read_evidence
from trustlens.data_scanner.contributor_metrics import METRICS
from trustlens.provenance.merkle_log import MerkleLog

CHECK_OF_METRIC = {"poison_rate": "trigger_poison", "label_issue_rate": "label_issue",
                   "dup_rate": "near_duplicate", "ood_rate": "out_of_distribution"}


def robust_z(values: np.ndarray, eps: float, floor: float = 0.0) -> tuple[np.ndarray, float, float]:
    med = float(np.median(values))
    spread = max(1.4826 * float(np.median(np.abs(values - med))), floor)
    return (values - med) / (spread + eps), med, spread


def fuse(metrics: pd.DataFrame, rc: dict) -> pd.DataFrame:
    out = metrics.copy()
    risk = np.zeros(len(out))
    flagged = np.zeros(len(out), bool)
    for m in METRICS:
        z, med, spread = robust_z(out[m].to_numpy(float), rc["eps"], rc.get("mad_floor", {}).get(m, 0.0))
        out[f"z_{m}"] = z
        out[f"median_{m}"] = med
        out[f"spread_{m}"] = spread
        risk += rc["weights"][m] * np.maximum(0.0, z)
        flagged |= z >= rc["flag_z"]
    out["risk"] = risk
    out["trust"] = 100.0 * np.exp(-risk / rc["trust_scale"])
    out["flagged"] = flagged
    out["flag_reasons"] = [
        [m for m in METRICS if row[f"z_{m}"] >= rc["flag_z"]] for _, row in out.iterrows()
    ]
    return out.sort_values("trust").reset_index(drop=True)


def run(cfg: dict | None = None, log=print) -> pd.DataFrame:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg)
    rc = cfg["risk"]
    metrics = pd.read_csv(paths.evidence / "contributor_metrics.csv")
    fused = fuse(metrics, rc)

    # evidence packs: flagged sample records per contributor and check
    by_contrib = defaultdict(lambda: defaultdict(list))
    for r in read_evidence(paths.evidence / "data_scanner.jsonl"):
        if r.flagged and r.contributor:
            by_contrib[r.contributor][r.check].append(r.evidence_id)

    packs = {}
    with EvidenceWriter(paths.evidence / "risk.jsonl", "risk.fusion", "rsk") as ev:
        for _, row in fused.iterrows():
            c = row["contributor"]
            ids = []
            for m in METRICS:
                check_ids = by_contrib[c].get(CHECK_OF_METRIC.get(m, ""), [])
                rec = ev.add(subject_type="contributor", subject_id=c, contributor=c, check=m,
                             score=float(row[f"z_{m}"]), threshold=rc["flag_z"],
                             flagged=bool(row[f"z_{m}"] >= rc["flag_z"]),
                             confidence="high" if row[f"z_{m}"] >= 2 * rc["flag_z"] else "medium",
                             method="peer-relative robust z-score (median / 1.4826*MAD, floored)",
                             details={"value": float(row[m]), "peer_median": float(row[f"median_{m}"]),
                                      "spread": float(row[f"spread_{m}"]), "n_sample_records": len(check_ids),
                                      "sample_evidence_ids": check_ids[:50]})
                ids.append(rec.evidence_id)
            rec = ev.add(subject_type="contributor", subject_id=c, contributor=c, check="trust_score",
                         score=float(row["trust"]), threshold=None, flagged=bool(row["flagged"]),
                         confidence="medium", method="weighted sum of positive robust z-scores -> 100*exp(-risk/5)",
                         details={"risk": float(row["risk"]), "flag_reasons": row["flag_reasons"],
                                  "metric_evidence_ids": ids})
            packs[c] = {"trust_evidence_id": rec.evidence_id, "metric_evidence_ids": ids,
                        "sample_evidence": {k: {"count": len(v), "ids": v[:200]} for k, v in by_contrib[c].items()}}

    fused.to_csv(paths.evidence / "trust_scores.csv", index=False)
    write_json(paths.evidence / "risk.json", {
        "contributors": fused.to_dict(orient="records"), "evidence_packs": packs,
        "weights": rc["weights"], "flag_z": rc["flag_z"],
        "limitations": ["With only 5 contributors the median/MAD are estimated from 5 points; raw values "
                        "and peer medians are shown next to every z-score.",
                        "A contributor who is honest but has a genuinely different class mix will show class skew."],
    })
    digest = sha256_file(paths.evidence / "risk.jsonl")
    MerkleLog(paths.ledger).append(f"risk-{digest[:16]}", "risk_report", {
        "trust": {r["contributor"]: round(float(r["trust"]), 3) for _, r in fused.iterrows()},
        "flagged": [r["contributor"] for _, r in fused.iterrows() if r["flagged"]],
        "evidence_file_sha256": digest})
    for _, r in fused.iterrows():
        log(f"  {r['contributor']}: trust {r['trust']:6.2f}  risk {r['risk']:6.2f}"
            f"  {'FLAGGED ' + ','.join(r['flag_reasons']) if r['flagged'] else ''}")
    return fused
