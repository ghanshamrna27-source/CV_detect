"""Label issues with confident learning (cleanlab).

Out-of-fold probabilities come from a logistic regression on CLIP embeddings, so this check is
independent of the possibly poisoned pool model.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from cleanlab.filter import find_label_issues
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict


def detect(emb: np.ndarray, y: np.ndarray, sample_ids: np.ndarray, lc: dict, seed: int) -> pd.DataFrame:
    clf = LogisticRegression(C=lc["C"], max_iter=lc["max_iter"])
    cv = StratifiedKFold(n_splits=lc["folds"], shuffle=True, random_state=seed)
    probs = cross_val_predict(clf, emb, y, cv=cv, method="predict_proba", n_jobs=-1)
    issues = find_label_issues(labels=y, pred_probs=probs, filter_by="prune_by_noise_rate")
    return pd.DataFrame({
        "sample_id": sample_ids,
        "label_issue": issues,
        "suggested_label": probs.argmax(1).astype(np.int64),
        "label_quality": probs[np.arange(len(y)), y].astype(np.float32),  # self-confidence
    })
