"""Score every detector against the ground truth (plan section 8).

This is the ONLY module that reads `gt_attack`; detectors never see it.
"""

from __future__ import annotations

import numpy as np

from trustlens.common.config import Paths, load_config
from trustlens.common.io import load_manifest, load_scores, read_json, write_json


def _pr(pred: np.ndarray, truth: np.ndarray) -> dict:
    tp = int((pred & truth).sum())
    return {"recall": tp / max(1, int(truth.sum())), "precision": tp / max(1, int(pred.sum())),
            "tp": tp, "positives": int(truth.sum()), "predicted": int(pred.sum())}


def evaluate(cfg: dict | None = None) -> dict:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg)
    gt = load_manifest(paths)[["sample_id", "gt_attack"]]
    s = load_scores(paths).merge(gt, on="sample_id")
    g = s["gt_attack"].to_numpy()
    col = lambda c: s[c].fillna(False).to_numpy(bool) if c in s else np.zeros(len(s), bool)  # noqa: E731

    res: dict = {}
    res["duplicates_C5"] = _pr(col("in_dup"), np.isin(g, ["dup", "dup_source"]))
    c4 = (s["contributor"] == "C4").to_numpy()
    res["label_flips_C4"] = {**_pr(col("label_issue"), g == "flip"),
                             "precision_within_C4": _pr(col("label_issue") & c4, g == "flip")["precision"]}
    res["ood_C5"] = _pr(col("ood_flag"), g == "ood")
    res["poison_C3"] = {"combined": _pr(col("poison_flag"), g == "badnets"),
                        "activation_clustering": _pr(col("ac_flag"), g == "badnets"),
                        "spectral_signatures": _pr(col("ss_flag"), g == "badnets")}
    for art_col in ("art_ac_flag", "art_ss_flag"):
        if art_col in s:
            res["poison_C3"][art_col] = _pr(col(art_col), g == "badnets")

    risk = read_json(paths.evidence / "risk.json", {})
    if risk:
        order = [r["contributor"] for r in risk["contributors"]]  # sorted by trust, lowest first
        attackers = ["C3", "C4", "C5"]
        res["contributors"] = {"rank_lowest_first": order,
                               "trust": {r["contributor"]: round(r["trust"], 2) for r in risk["contributors"]},
                               "attackers_are_bottom_3": set(order[:3]) == set(attackers),
                               "flagged": [r["contributor"] for r in risk["contributors"] if r["flagged"]]}

    audit = read_json(paths.evidence / "audit.json", {})
    if audit.get("neural_cleanse"):
        nc = audit["neural_cleanse"]
        target = cfg["attacks"]["C3"]["target"]
        ai = next(r["anomaly_index"] for r in nc["per_class"] if r["class"] == target)
        res["model"] = {"nc_target_found": nc["target"], "true_target": target,
                        "correct": nc["target"] == target, "anomaly_index_true_target": ai,
                        "signature_ok": audit["signature"]["ok"], "verdict": audit["verdict"]["verdict"]}

    trace = read_json(paths.evidence / "trace.json", {})
    if trace.get("status") == "traced":
        cand = col("trace_candidate")
        pr = _pr(cand, g == "badnets")
        res["trace"] = {"source": trace["source"], "correct_source": trace["source"] == "C3",
                        "recall_of_C3_poison": pr["recall"], "precision": pr["precision"],
                        "share_from_C3": float(((s["contributor"] == "C3").to_numpy() & cand).sum() / max(1, cand.sum())),
                        "n_candidates": int(cand.sum())}

    tamper = read_json(paths.evidence / "tamper_results.json")
    if tamper:
        bad = [t for t in tamper["cases"] if t["expected"] == "fail"]
        res["provenance"] = {"cases": len(tamper["cases"]),
                             "tampered_detected": sum(1 for t in bad if not t["passed"]),
                             "tampered_total": len(bad),
                             "genuine_pass": all(t["passed"] for t in tamper["cases"] if t["expected"] == "pass")}

    models = {m: read_json(paths.models / m / "config.json", {}) for m in ("reference", "pool")}
    res["models"] = {m: {"clean_acc": v.get("clean_acc"), "asr": v.get("asr"), "epochs": v.get("epochs")}
                     for m, v in models.items() if v}
    timings = read_json(paths.evidence / "timings.json")
    if timings:
        res["cost_seconds"] = timings

    write_json(paths.evidence / "eval.json", res)
    (paths.evidence / "eval.md").write_text(to_markdown(res), encoding="utf-8")
    return res


def to_markdown(r: dict) -> str:
    f = lambda v: f"{v:.3f}" if isinstance(v, float) else str(v)  # noqa: E731
    rows = []
    if "duplicates_C5" in r:
        d = r["duplicates_C5"]
        rows.append(("Duplicates (C5)", "Recall / precision of near-copies", "Recall >= 0.9",
                     f"{f(d['recall'])} / {f(d['precision'])}"))
    if "label_flips_C4" in r:
        d = r["label_flips_C4"]
        rows.append(("Label flips (C4)", "Recall / precision (within C4)", "Recall >= 0.9",
                     f"{f(d['recall'])} / {f(d['precision_within_C4'])}"))
    if "ood_C5" in r:
        d = r["ood_C5"]
        rows.append(("OOD (C5)", "Recall / precision at p99 threshold", "Report", f"{f(d['recall'])} / {f(d['precision'])}"))
    if "poison_C3" in r:
        p = r["poison_C3"]
        rows.append(("Poison (C3)", "AC / spectral / combined recall of poisoned images", "Report",
                     f"{f(p['activation_clustering']['recall'])} / {f(p['spectral_signatures']['recall'])} / "
                     f"{f(p['combined']['recall'])}"))
    if "contributors" in r:
        c = r["contributors"]
        rows.append(("Contributors", "Rank by trust (lowest first)", "C3, C4, C5 bottom 3",
                     f"{', '.join(c['rank_lowest_first'])} ({'yes' if c['attackers_are_bottom_3'] else 'NO'})"))
    if "model" in r:
        m = r["model"]
        rows.append(("Model", "NC target class; anomaly index", "Class 0, index > 2",
                     f"class {m['nc_target_found']}; {f(m['anomaly_index_true_target'])}"))
    if "trace" in r:
        t = r["trace"]
        rows.append(("Trace", "Recall of C3 poison; share of candidates from C3", ">= 0.8 recall",
                     f"{f(t['recall_of_C3_poison'])}; {f(t['share_from_C3'])} (source {t['source']})"))
    if "provenance" in r:
        p = r["provenance"]
        rows.append(("Provenance", "Tampered / forged receipts detected", "100%",
                     f"{p['tampered_detected']}/{p['tampered_total']}; genuine passes: {p['genuine_pass']}"))
    if "cost_seconds" in r:
        rows.append(("Cost", "Pipeline time (s)", "Report",
                     ", ".join(f"{k} {v:.0f}" for k, v in r["cost_seconds"].items())))
    out = ["| Area | Metric | Target (our goal) | Result |", "|---|---|---|---|"]
    out += [f"| {a} | {b} | {c} | {d} |" for a, b, c, d in rows]
    if "models" in r:
        out.append("")
        out.append("| Model | Clean accuracy | Attack success rate | Epochs |")
        out.append("|---|---|---|---|")
        out += [f"| {m} | {v['clean_acc']} | {v['asr']} | {v['epochs']} |" for m, v in r["models"].items()]
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    print(to_markdown(evaluate()))
