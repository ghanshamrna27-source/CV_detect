import numpy as np
import pandas as pd

from trustlens.common.config import load_config
from trustlens.data_scanner.contributor_metrics import jsd
from trustlens.risk.fusion import fuse, robust_z


def _metrics(overrides=None):
    overrides = overrides or {}
    rows = []
    for c in ["C1", "C2", "C3", "C4", "C5", "C6"]:
        rows.append({"contributor": c, "poison_rate": 0.010, "label_issue_rate": 0.030, "dup_rate": 0.002,
                     "ood_rate": 0.010, "class_skew": 0.001})
    df = pd.DataFrame(rows)
    rng = np.random.default_rng(0)
    for m in ["poison_rate", "label_issue_rate", "dup_rate", "ood_rate"]:
        df[m] += rng.uniform(-0.001, 0.001, len(df))
    for (c, m), v in overrides.items():
        df.loc[df["contributor"] == c, m] = v
    return df


def test_outlier_contributor_gets_lowest_trust():
    rc = load_config()["risk"]
    fused = fuse(_metrics({("C4", "poison_rate"): 0.09}), rc)
    assert fused.iloc[0]["contributor"] == "C4"
    assert fused.iloc[0]["flagged"]
    assert "poison_rate" in fused.iloc[0]["flag_reasons"]
    assert not fused.iloc[1:]["flagged"].any()


def test_clean_pool_nobody_flagged_and_high_trust():
    rc = load_config()["risk"]
    fused = fuse(_metrics(), rc)
    assert not fused["flagged"].any()
    assert (fused["trust"] > 50).all()


def test_several_attackers_ranked_below_clean():
    rc = load_config()["risk"]
    fused = fuse(_metrics({("C3", "poison_rate"): 0.05, ("C4", "label_issue_rate"): 0.08,
                             ("C5", "dup_rate"): 0.18}), rc)
    assert set(fused.iloc[:3]["contributor"]) == {"C3", "C4", "C5"}


def test_robust_z_uses_floor():
    z, med, spread = robust_z(np.array([0.0, 0.0, 0.0, 0.0, 0.001]), 1e-6, floor=0.004)
    assert spread == 0.004 and z.max() < 1


def test_jsd_bounds():
    p = np.array([1.0, 1.0, 1.0])
    assert jsd(p, p) == 0
    assert 0 < jsd(np.array([1.0, 0, 0]), p) <= 1
