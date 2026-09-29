"""Trigger-poison detection on the pool model's penultimate features.

* Activation Clustering (Chen et al. 2018; ART `ActivationDefence`): per class, PCA to 10 dims
  then k-means. With 2 clusters (ART's default) the poison did not separate at full scale:
  natural sub-groups of the target class dominate. With k = 5 it forms its own, pure cluster,
  but clean classes have small clusters too. So a cluster is suspicious only if it is small
  (< `size_threshold` of its class) AND an independent view disagrees with its label: the share
  of members whose out-of-fold CLIP prediction (from the label scan) is another class is at
  least `disagreement_min`. Poison is exactly "the model groups it with class t, the content
  says it is not t".
* Spectral Signatures (Tran et al. 2018; ART `SpectralSignatureDefense`): per class, score each
  sample by its squared projection on the top singular vector of the centred features and flag
  the top `eps_multiplier * expected_pp_poison` share.

When ART is installed, `run` executes ART's own detectors on the same features (via a thin
feature-space classifier) and reports them next to ours; the flags used downstream are ours so
that results are stable across ART versions.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score


def activation_clustering(feats: np.ndarray, y: np.ndarray, independent_pred: np.ndarray, pc: dict,
                          seed: int) -> tuple[np.ndarray, dict]:
    flags = np.zeros(len(y), bool)
    per_class = {}
    for c in np.unique(y):
        idx = np.flatnonzero(y == c)
        if len(idx) < 20:
            continue
        red = PCA(n_components=pc["nb_dims"], random_state=seed).fit_transform(feats[idx])
        km = KMeans(n_clusters=pc["nb_clusters"], n_init=10, random_state=seed).fit(red)
        sub = np.random.default_rng(seed).choice(len(idx), min(3000, len(idx)), replace=False)
        clusters = []
        for k in range(pc["nb_clusters"]):
            mem = km.labels_ == k
            frac = float(mem.mean())
            disagree = float(np.mean(independent_pred[idx][mem] != c)) if mem.any() else 0.0
            suspicious = frac < pc["size_threshold"] and disagree >= pc["disagreement_min"]
            if suspicious:
                flags[idx[mem]] = True
            clusters.append({"frac": frac, "disagreement": disagree, "suspicious": suspicious})
        per_class[int(c)] = {"n": int(len(idx)), "clusters": clusters,
                             "silhouette": float(silhouette_score(red[sub], km.labels_[sub])),
                             "suspicious": any(k["suspicious"] for k in clusters),
                             "small_cluster_frac": min(k["frac"] for k in clusters),
                             "max_disagreement": max(k["disagreement"] for k in clusters)}
    return flags, per_class


def spectral_signatures(feats: np.ndarray, y: np.ndarray, pc: dict) -> tuple[np.ndarray, np.ndarray]:
    scores = np.zeros(len(y), np.float32)
    flags = np.zeros(len(y), bool)
    q = max(1.0 - pc["eps_multiplier"] * pc["expected_pp_poison"], 0.0)
    for c in np.unique(y):
        idx = np.flatnonzero(y == c)
        r = feats[idx] - feats[idx].mean(0, keepdims=True)
        _, _, vt = np.linalg.svd(r, full_matrices=False)
        s = (r @ vt[0]) ** 2
        scores[idx] = s / (s.max() + 1e-12)
        flags[idx] = s >= np.quantile(s, q)
    return scores, flags


def art_crosscheck(feats: np.ndarray, y: np.ndarray, num_classes: int, pc: dict) -> dict | None:
    """Run IBM ART's detectors on the same penultimate features. Returns None if ART is missing."""
    try:
        import torch
        from art.defences.detector.poison import ActivationDefence, SpectralSignatureDefense
        from art.estimators.classification import PyTorchClassifier
    except ImportError:
        return None

    class FeatureHead(torch.nn.Module):
        """Identity layers only, so ART's "last layer" activations are exactly our features."""

        def __init__(self):
            super().__init__()
            self.body = torch.nn.Identity()
            self.head = torch.nn.Identity()

        def forward(self, x):
            return self.head(self.body(x))

    net = FeatureHead()
    clf = PyTorchClassifier(model=net, loss=torch.nn.CrossEntropyLoss(),
                                                        input_shape=(feats.shape[1],), nb_classes=num_classes)
    onehot = np.eye(num_classes, dtype=np.float32)[y]
    out = {}
    try:
        ac = ActivationDefence(clf, feats.astype(np.float32), onehot)
        ac.activations_by_class = ac._segment_by_class(feats.astype(np.float32), onehot)  # noqa: SLF001
        # ART's own "relative-size" analyser crashes when a class has no poison cluster
        # (`x in <empty ndarray>`), so cluster with ART and apply the relative-size rule here.
        ac.detect_poison(nb_clusters=2, nb_dims=pc["nb_dims"], reduce="PCA",
                         cluster_analysis="smaller")
        index_by_class = ac._segment_by_class(np.arange(len(y)), onehot)  # noqa: SLF001
        flags = np.zeros(len(y), bool)
        for idx, clusters in zip(index_by_class, ac.clusters_by_class):
            if len(idx) == 0:
                continue
            sizes = np.bincount(clusters)
            small = int(np.argmin(sizes))
            if sizes[small] / len(idx) < pc["size_threshold"]:
                flags[np.asarray(idx, int)[clusters == small]] = True
        out["art_ac_flag"] = flags
    except Exception as exc:  # ART internals differ across versions
        out["art_ac_error"] = f"{type(exc).__name__}: {exc}"
    try:
        ss = SpectralSignatureDefense(clf, feats.astype(np.float32), onehot, batch_size=1024,
                                      eps_multiplier=pc["eps_multiplier"],
                                      expected_pp_poison=pc["expected_pp_poison"])
        _, is_clean = ss.detect_poison()
        out["art_ss_flag"] = np.asarray(is_clean) == 0
    except Exception as exc:
        out["art_ss_error"] = f"{type(exc).__name__}: {exc}"
    return out


def detect(feats: np.ndarray, y: np.ndarray, sample_ids: np.ndarray, num_classes: int, pc: dict,
           seed: int, independent_pred: np.ndarray) -> tuple[pd.DataFrame, dict]:
    ac_flag, ac_info = activation_clustering(feats, y, independent_pred, pc, seed)
    ss_score, ss_flag = spectral_signatures(feats, y, pc)
    suspicious_classes = [c for c, v in ac_info.items() if v["suspicious"]]
    in_susp = np.isin(y, suspicious_classes)
    poison_flag = ac_flag | (ss_flag & in_susp)
    df = pd.DataFrame({"sample_id": sample_ids, "ac_flag": ac_flag, "ss_score": ss_score, "ss_flag": ss_flag,
                       "poison_flag": poison_flag})
    info = {"activation_clustering": ac_info, "suspicious_classes": suspicious_classes}
    art = art_crosscheck(feats, y, num_classes, pc)
    if art is not None:
        for key in ("art_ac_flag", "art_ss_flag"):
            if key in art:
                df[key] = art[key]
                info[f"{key}_agreement_with_ours"] = float(np.mean(art[key] == df[key.replace("art_", "")]))
        info.update({k: v for k, v in art.items() if k.endswith("_error")})
    else:
        info["art"] = "adversarial-robustness-toolbox not installed; ART cross-check skipped"
    return df, info
