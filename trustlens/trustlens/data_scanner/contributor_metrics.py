"""Aggregate per-sample findings into per-contributor metrics (plan section 5.3, last column)."""

from __future__ import annotations

from collections import Counter

import numpy as np
import pandas as pd

METRICS = ["poison_rate", "label_issue_rate", "dup_rate", "ood_rate", "class_skew"]


def jsd(p: np.ndarray, q: np.ndarray) -> float:
    """Jensen-Shannon divergence (base 2, in [0, 1])."""
    p = p / p.sum()
    q = q / q.sum()
    m = 0.5 * (p + q)

    def kl(a, b):
        nz = a > 0
        return float(np.sum(a[nz] * np.log2(a[nz] / b[nz])))

    return 0.5 * kl(p, m) + 0.5 * kl(q, m)


def compute(scores: pd.DataFrame, num_classes: int, class_names: list[str]) -> pd.DataFrame:
    pool_hist = np.bincount(scores["label"], minlength=num_classes).astype(float)
    rows = []
    for c, g in scores.groupby("contributor", sort=True):
        hist = np.bincount(g["label"], minlength=num_classes).astype(float)
        pois = g[g["poison_flag"].fillna(False).astype(bool)]
        lab = g[g["label_issue"].fillna(False).astype(bool)]
        pairs = Counter(zip(lab["label"], lab["suggested_label"]))
        top_pair = pairs.most_common(1)[0] if pairs else None
        affected = int(pois["label"].mode().iloc[0]) if len(pois) else None
        rows.append({
            "contributor": c,
            "n_samples": len(g),
            "poison_rate": float(g["poison_flag"].fillna(False).mean()),
            "label_issue_rate": float(g["label_issue"].fillna(False).mean()),
            "dup_rate": float(g["in_dup"].fillna(False).mean()),
            "ood_rate": float(g["ood_flag"].fillna(False).mean()),
            "class_skew": jsd(hist, pool_hist),
            "poison_affected_class": affected,
            "poison_affected_class_name": class_names[affected] if affected is not None else None,
            "label_confusion_pair": (f"{class_names[top_pair[0][0]]}->{class_names[top_pair[0][1]]}"
                                     if top_pair else None),
            "label_confusion_count": top_pair[1] if top_pair else 0,
            "n_dup_clusters": int(g.loc[g["in_dup"].fillna(False), "dup_cluster"].nunique()),
        })
    return pd.DataFrame(rows)
