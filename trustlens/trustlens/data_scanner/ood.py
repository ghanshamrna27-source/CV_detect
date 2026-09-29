"""OOD score with a zero-trust peer reference.

Each contributor's samples are compared only with *other* contributors' data: the score is the
mean cosine distance to the k nearest peer samples. Flag above the pool's 99th percentile.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from trustlens.common.io import knn


def detect(emb: np.ndarray, contributors: np.ndarray, sample_ids: np.ndarray, oc: dict) -> tuple[pd.DataFrame, float]:
    score = np.zeros(len(emb), np.float32)
    for c in np.unique(contributors):
        mine = contributors == c
        sims, _ = knn(emb[mine], emb[~mine], oc["k"])
        score[mine] = 1.0 - sims.mean(1)
    thr = float(np.percentile(score, oc["percentile"]))
    return pd.DataFrame({"sample_id": sample_ids, "ood_score": score, "ood_flag": score > thr}), thr
