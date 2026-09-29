"""TrustLens dashboard (Streamlit). Run: `trustlens dashboard` or `streamlit run trustlens/app/dashboard.py`.

Every number on these pages comes from files under artifacts/ written by the pipeline, and every
flag links back to its evidence record and method.
"""

from __future__ import annotations

import copy
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import altair as alt  # noqa: E402
import pandas as pd  # noqa: E402
import streamlit as st  # noqa: E402

from trustlens.common.config import ROOT, Paths, load_config, resolve  # noqa: E402
from trustlens.common.io import read_json, rel  # noqa: E402

st.set_page_config(page_title="TrustLens", page_icon=":material/verified_user:", layout="wide")

CFG = load_config()
P = Paths.from_config(CFG)
NAMES = CFG["dataset"]["class_names"]
SERIES = "#2a78d6"      # categorical slot 1 (reference palette)
CRITICAL = "#d03b3b"    # status: critical
GOOD = "#0ca30c"        # status: good
MUTED = "#9a9892"


# ------------------------------------------------------------------ data access

def _mtime(p: Path) -> float:
    return p.stat().st_mtime if p.exists() else 0.0


@st.cache_data(show_spinner=False)
def _json(path: str, _m: float):
    return read_json(path)


def j(name: str, base: Path | None = None):
    p = (base or P.evidence) / name
    return _json(str(p), _mtime(p))


@st.cache_data(show_spinner=False)
def _jsonl(path: str, _m: float) -> pd.DataFrame:
    p = Path(path)
    if not p.exists():
        return pd.DataFrame()
    with open(p, encoding="utf-8") as fh:
        return pd.DataFrame([json.loads(line) for line in fh if line.strip()])


def evidence(name: str) -> pd.DataFrame:
    p = P.evidence / name
    return _jsonl(str(p), _mtime(p))


@st.cache_data(show_spinner=False)
def _csv(path: str, _m: float) -> pd.DataFrame:
    return pd.read_csv(path) if Path(path).exists() else pd.DataFrame()


def csv(name: str) -> pd.DataFrame:
    p = P.evidence / name
    return _csv(str(p), _mtime(p))


def img(rel_path: str | None, **kw) -> None:
    if rel_path and (ROOT / rel_path).exists():
        st.image(str(ROOT / rel_path), **kw)


def need(obj, what: str) -> bool:
    if obj is None or (isinstance(obj, pd.DataFrame) and obj.empty):
        st.info(f"No {what} yet. Run the pipeline first: `trustlens run-all` (or `--profile quick`).")
        return False
    return True


def status(ok: bool | None, good="PASS", bad="FAIL", skip="SKIP") -> str:
    return {True: f":green[:material/check_circle: {good}]", False: f":red[:material/cancel: {bad}]",
            None: f":gray[:material/remove_circle: {skip}]"}[ok]


def ledger():
    from trustlens.provenance.merkle_log import MerkleLog

    return MerkleLog(P.ledger)


# ------------------------------------------------------------------ pages

def page_overview():
    st.title("TrustLens")
    st.caption("Which contributor in the pipeline can't be trusted, and what is the proof?  "
               "SIH PS 26228 · CIFAR-10 · 5 simulated contributors · TEE attestation is a **mock**")
    risk, audit, trace = j("risk.json"), j("audit.json"), j("trace.json")
    if not need(risk, "risk scores"):
        return
    contribs = pd.DataFrame(risk["contributors"])
    led = ledger()

    c1, c2, c3, c4 = st.columns(4)
    flagged = contribs[contribs["flagged"]]["contributor"].tolist()
    c1.metric("Contributors flagged", f"{len(flagged)} / {len(contribs)}", ", ".join(flagged) or "none",
              delta_color="off")
    if audit:
        v = audit["verdict"]
        c2.metric("Supplied model verdict", v["verdict"].upper(), f"{v['confidence']} confidence · {v['access_level']}",
                  delta_color="off")
    if trace and trace.get("status") == "traced":
        c3.metric("Backdoor source", trace["source"], f"{trace['source_share']:.0%} of trigger candidates",
                  delta_color="off")
    c4.metric("Merkle log", f"{led.size()} entries", f"root {led.root()[:12]}…", delta_color="off")

    st.subheader("Contributor trust leaderboard")
    st.caption("trust = 100 · exp(−risk / 5); risk = weighted sum of positive peer-relative robust z-scores. "
               f"Flagged if any metric z ≥ {risk['flag_z']}.")
    contribs["status"] = contribs["flagged"].map({True: "flagged", False: "ok"})
    chart = alt.Chart(contribs).mark_bar(cornerRadiusEnd=4, height=22).encode(
        x=alt.X("trust:Q", scale=alt.Scale(domain=[0, 100]), title="Trust score"),
        y=alt.Y("contributor:N", sort="-x", title=None),
        color=alt.Color("status:N", scale=alt.Scale(domain=["ok", "flagged"], range=[SERIES, CRITICAL]),
                        legend=alt.Legend(title=None, orient="top")),
        tooltip=["contributor", alt.Tooltip("trust:Q", format=".1f"), alt.Tooltip("risk:Q", format=".2f"),
                 "status"],
    )
    labels = chart.mark_text(align="left", dx=4, color="gray").encode(text=alt.Text("trust:Q", format=".1f"),
                                                                        color=alt.value("#52514e"))
    st.altair_chart((chart + labels).properties(height=220), width="stretch")

    show = contribs[["contributor", "trust", "risk", "flagged", "flag_reasons", "poison_rate", "label_issue_rate",
                     "dup_rate", "ood_rate", "class_skew", "label_confusion_pair", "poison_affected_class_name"]]
    st.dataframe(show, hide_index=True, width="stretch",
                 column_config={"trust": st.column_config.ProgressColumn("trust", min_value=0, max_value=100,
                                                                         format="%.1f")})

    if audit:
        st.subheader("Supplied model")
        a1, a2, a3 = st.columns(3)
        a1.markdown(f"**Signature** {status(audit['signature']['ok'], 'authentic', 'substituted / modified')}")
        fp = audit["fingerprint"]
        a2.markdown(f"**Probe fingerprint** agreement {fp['agreement']:.3f} · KL {fp['kl']:.3f} "
                    f"{status(not fp['drift'], 'no drift', 'drift')}")
        nc = audit.get("neural_cleanse")
        if nc:
            a3.markdown(f"**Neural Cleanse** target: **{nc['target_name'] or 'none'}**")
        st.caption(audit["verdict"]["reason"])


def page_contributors():
    st.title("Contributor drill-down")
    risk = j("risk.json")
    if not need(risk, "risk scores"):
        return
    contribs = pd.DataFrame(risk["contributors"]).sort_values("contributor")
    c = st.segmented_control("Contributor", contribs["contributor"].tolist(),
                             default=contribs.sort_values("trust")["contributor"].iloc[0])
    if not c:
        return
    row = contribs[contribs["contributor"] == c].iloc[0]
    m1, m2, m3 = st.columns(3)
    m1.metric("Trust", f"{row['trust']:.1f}")
    m2.metric("Risk", f"{row['risk']:.2f}")
    m3.markdown(f"**Status** {status(not row['flagged'], 'not flagged', 'FLAGGED')}  \n"
                f"{', '.join(row['flag_reasons']) if row['flagged'] else ''}")

    metrics = ["poison_rate", "label_issue_rate", "dup_rate", "ood_rate", "class_skew"]
    tbl = pd.DataFrame([{"metric": m, "value": row[m], "peer median": row[f"median_{m}"],
                         "robust z": row[f"z_{m}"], "flagged": row[f"z_{m}"] >= risk["flag_z"],
                         "weight": risk["weights"][m]} for m in metrics])
    st.subheader("Metrics vs peers")
    zc = alt.Chart(tbl).mark_bar(cornerRadiusEnd=4, height=18).encode(
        x=alt.X("robust z:Q", title="Robust z-score vs peer median"),
        y=alt.Y("metric:N", title=None, sort=metrics),
        color=alt.condition(alt.datum.flagged, alt.value(CRITICAL), alt.value(SERIES)),
        tooltip=["metric", alt.Tooltip("value:Q", format=".4f"), alt.Tooltip("peer median:Q", format=".4f"),
                 alt.Tooltip("robust z:Q", format=".2f")])
    rule = alt.Chart(pd.DataFrame({"z": [risk["flag_z"]]})).mark_rule(strokeDash=[4, 3], color=MUTED).encode(x="z:Q")
    st.altair_chart((zc + rule).properties(height=200), width="stretch")
    st.dataframe(tbl, hide_index=True, width="stretch")
    if isinstance(row.get("label_confusion_pair"), str):
        st.caption(f"Most common label confusion: **{row['label_confusion_pair']}** "
                   f"({int(row['label_confusion_count'])} samples)")

    tabs = st.tabs(["Duplicate clusters", "Label issues", "OOD", "Poison flags", "Evidence records"])
    with tabs[0]:
        files = sorted((P.evidence_img / "dup").glob(f"{c}_cluster*.png"))
        if not files:
            st.write("No duplicate clusters of size ≥ 3.")
        for f in files[:6]:
            st.image(str(f), caption=f.stem)
    with tabs[1]:
        st.caption("Captions: given label > suggested label (cleanlab on CLIP-embedding logistic regression)")
        img(rel(P.evidence_img / "labels" / f"{c}.png", ROOT))
    with tabs[2]:
        st.caption("Highest OOD scores (distance to other contributors' data)")
        img(rel(P.evidence_img / "ood" / f"{c}.png", ROOT))
    with tabs[3]:
        st.caption("Activation Clustering / spectral-signature flags on the pool model's features")
        img(rel(P.evidence_img / "poison" / f"{c}.png", ROOT))
    with tabs[4]:
        ev = evidence("data_scanner.jsonl")
        if need(ev, "evidence records"):
            ev = ev[ev["contributor"] == c]
            check = st.selectbox("Check", sorted(ev["check"].unique()))
            sub = ev[ev["check"] == check]
            st.caption(f"{len(sub)} records · method: {sub['method'].iloc[0] if len(sub) else ''}")
            st.dataframe(sub[["evidence_id", "subject_id", "score", "threshold", "confidence", "details",
                              "sha256"]].head(500), hide_index=True, width="stretch")
            rid = st.selectbox("Open a record", sub["evidence_id"].head(500))
            if rid:
                rec = sub[sub["evidence_id"] == rid].iloc[0].to_dict()
                cols = st.columns([1, 3])
                with cols[0]:
                    for a in rec.get("artefacts") or []:
                        img(a, width=160 if a.endswith(".png") and "/data/" in a else None)
                cols[1].json(rec)


def page_model():
    st.title("Model audit")
    audit = j("audit.json")
    if not need(audit, "model audit"):
        return
    st.caption(f"Model `{audit['model_dir']}` · manifest sha256 `{audit['model_manifest_sha256'][:24]}…`")
    s1, s2, s3 = st.columns(3)
    with s1:
        st.markdown("**1 · Signature** (any access)")
        st.markdown(status(audit["signature"]["ok"], "authentic", "substituted / modified"))
        st.caption(audit["signature"]["detail"])
    with s2:
        fp = audit["fingerprint"]
        st.markdown("**2 · Probe fingerprint** (black-box)")
        st.markdown(status(not fp["drift"], "no drift", "behavioural drift"))
        st.caption(f"top-1 agreement {fp['agreement']:.3f} (threshold {fp['agreement_threshold']}) · "
                   f"KL {fp['kl']:.3f} on {fp['probe_size']} probes")
    with s3:
        v = audit["verdict"]
        st.markdown("**Verdict**")
        st.markdown(f"### {v['verdict'].upper()}")
        st.caption(f"{v['confidence']} confidence · {v['access_level']} · {v['reason']}")

    nc = audit.get("neural_cleanse")
    if nc:
        st.subheader("3 · Neural Cleanse (white-box)")
        df = pd.DataFrame(nc["per_class"])
        df["flagged"] = df["class"].isin(nc["flagged_classes"])
        df["label"] = df["class"].astype(str) + " " + df["name"]
        left, right = st.columns([3, 2])
        with left:
            bars = alt.Chart(df).mark_bar(cornerRadiusEnd=4).encode(
                x=alt.X("label:N", sort=None, title=None),
                y=alt.Y("l1:Q", title="Reverse-engineered mask L1 norm"),
                color=alt.condition(alt.datum.flagged, alt.value(CRITICAL), alt.value(SERIES)),
                tooltip=["label", alt.Tooltip("l1:Q", format=".1f"), alt.Tooltip("anomaly_index:Q", format=".2f"),
                         alt.Tooltip("attack_acc:Q", format=".3f")])
            text = bars.mark_text(dy=-6, color="#52514e").encode(text=alt.Text("anomaly_index:Q", format=".1f"),
                                                                  color=alt.value("#52514e"))
            st.altair_chart((bars + text).properties(height=300), width="stretch")
            st.caption("Bar label = MAD anomaly index. A class whose mask is abnormally small "
                       f"(index > {nc['anomaly_threshold']}, small side) is the backdoor target.")
        with right:
            t = nc["target"]
            if t is not None:
                row = df[df["class"] == t].iloc[0]
                st.markdown(f"**Backdoor target: class {t} ({nc['target_name']})** · anomaly index "
                            f"{row['anomaly_index']:.2f}")
                i1, i2, i3 = st.columns(3)
                with i1:
                    img(row["mask_png"], caption="mask m")
                with i2:
                    img(row["pattern_png"], caption="pattern p")
                with i3:
                    img(row["trigger_png"], caption="m ⊙ p")
            else:
                st.success("No class has an anomalously small trigger.")
        with st.expander("All recovered triggers"):
            cols = st.columns(len(df))
            for col, (_, r) in zip(cols, df.iterrows()):
                with col:
                    img(r["trigger_png"], caption=f"{r['class']} {r['name'][:5]}")
    st.caption("Limitations: " + " ".join(audit.get("limitations", [])))


def page_trace():
    st.title("Trigger → source trace")
    trace = j("trace.json")
    if not need(trace, "trace result"):
        return
    if trace.get("status") != "traced":
        st.warning(trace.get("detail", "No backdoor to trace."))
        return
    st.markdown(f"### The class-{trace['target_class']} ({trace['target_name']}) backdoor was planted by "
                f"**{trace['source']}**")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Share of candidates", f"{trace['source_share']:.1%}")
    m2.metric("Candidate images", trace["n_candidates"])
    m3.metric("Recovered trigger ASR", f"{trace['trigger_asr_on_heldout']:.1%}")
    m4.metric("Threshold", f"{trace['threshold']:.3f}")
    st.caption(f"{trace['method']}. Threshold: {trace['threshold_rule']}. "
               f"Evidence `{trace.get('source_evidence_id', '')}`.")

    a, b = st.columns([2, 3])
    with a:
        st.markdown("**1 · Recovered trigger stamped on clean images**")
        img(trace["images"]["stamped_examples"], width="stretch")
        bd = pd.DataFrame(trace["breakdown"])
        bd["is_source"] = bd["contributor"] == trace["source"]
        st.markdown("**3 · Candidates by contributor**")
        ch = alt.Chart(bd).mark_bar(cornerRadiusEnd=4, height=20).encode(
            x=alt.X("candidates:Q", title="Candidate images"), y=alt.Y("contributor:N", title=None),
            color=alt.condition(alt.datum.is_source, alt.value(CRITICAL), alt.value(SERIES)),
            tooltip=["contributor", "candidates", alt.Tooltip("share_of_candidates:Q", format=".1%"),
                     "class_t_samples", alt.Tooltip("candidate_rate:Q", format=".1%")])
        st.altair_chart((ch + ch.mark_text(align="left", dx=4).encode(text="candidates:Q", color=alt.value("#52514e")))
                        .properties(height=200), width="stretch")
    with b:
        st.markdown("**2 · Training images carrying the trigger (top by score)**")
        img(trace["images"]["candidates"], width="stretch")
        h = trace["score_hist"]
        edges = [i / 30 for i in range(30)]
        hist = pd.concat([
            pd.DataFrame({"score": edges, "count": h["clean_heldout"], "set": "clean held-out (class t)"}),
            pd.DataFrame({"score": edges, "count": h["pool_class_t"], "set": "contributed pool (class t)"})])
        hc = alt.Chart(hist).mark_bar(opacity=0.85, binSpacing=1).encode(
            x=alt.X("score:Q", bin=alt.Bin(step=1 / 30), title="Trace score s"),
            y=alt.Y("count:Q", stack=None, title="Images"),
            color=alt.Color("set:N", scale=alt.Scale(range=[MUTED, SERIES]), legend=alt.Legend(orient="top", title=None)),
            tooltip=["set", alt.Tooltip("score:Q", format=".2f"), "count"])
        thr = alt.Chart(pd.DataFrame({"t": [trace["threshold"]]})).mark_rule(color=CRITICAL, strokeDash=[4, 3]).encode(x="t:Q")
        st.altair_chart((hc + thr).properties(height=220), width="stretch")
    ev = evidence("trace.jsonl")
    if not ev.empty:
        with st.expander(f"Candidate evidence records ({len(ev) - 1})"):
            st.dataframe(ev[ev["subject_type"] == "sample"][["evidence_id", "subject_id", "contributor", "score",
                                                               "confidence", "details"]],
                         hide_index=True, width="stretch")


@st.cache_resource(show_spinner="Starting attested inference service…")
def service():
    from trustlens.api.service import InferenceService

    return InferenceService(CFG)


def show_checks(checks) -> None:
    for c in checks:
        st.markdown(f"{status(c.ok)} **{c.n}. {c.name}** — {c.detail}")


def page_receipts():
    from trustlens.provenance.tamper_demo import forge_receipt
    from trustlens.provenance.verify_cli import all_ok, verify_receipt

    st.title("Signed inference receipts")
    st.caption("Receipts bind input, model manifest and pipeline to the output; signed by a key that exists "
               "only inside the attested service; chained and logged in the Merkle log.")
    issue, check = st.tabs(["Issue & tamper", "Verify an uploaded receipt"])
    with issue:
        up = st.file_uploader("Image to classify", type=["png", "jpg", "jpeg"], key="infer_up")
        demo_input = P.receipts / "demo" / "input.png"
        if st.button("Run inference", type="primary", disabled=up is None and not demo_input.exists()):
            data = up.getvalue() if up else demo_input.read_bytes()
            out = service().infer(data)
            st.session_state["rc"] = {"receipt": out["receipt"], "input": data}
        rc = st.session_state.get("rc")
        if rc:
            receipt, data = rc["receipt"], rc["input"]
            c1, c2 = st.columns([1, 3])
            c1.image(data, width=120, caption=f"→ {receipt['output']['label_name']}")
            c2.json(receipt, expanded=False)
            st.markdown("**Tamper with it**")
            b = st.columns(5)
            variant, inp, label = receipt, data, "genuine"
            if b[0].button("Genuine"):
                st.session_state["variant"] = "genuine"
            if b[1].button("Edit output"):
                st.session_state["variant"] = "output"
            if b[2].button("Swap input"):
                st.session_state["variant"] = "input"
            if b[3].button("Forge outside service"):
                st.session_state["variant"] = "forge"
            if b[4].button("Swapped model"):
                st.session_state["variant"] = "model"
            v = st.session_state.get("variant", "genuine")
            if v == "output":
                variant = copy.deepcopy(receipt)
                variant["output"]["label"] = (variant["output"]["label"] + 1) % 10
                label = "output label edited after signing"
            elif v == "input":
                inp = data + b"\x00"
                label = "presented with a different input file"
            elif v == "forge":
                variant, label = forge_receipt(receipt), "signed by an attacker key outside the service"
            elif v == "model":
                p = P.receipts / "demo" / "model_swapped.json"
                if p.exists():
                    variant = json.loads(p.read_text(encoding="utf-8"))
                    inp = (P.receipts / "demo" / "input.png").read_bytes()
                    label = "issued by a service running the substituted (pool) model"
            checks = verify_receipt(variant, input_bytes=inp, cfg=CFG)
            st.markdown(f"#### {'VERIFIED' if all_ok(checks) else 'REJECTED'} — {label}")
            show_checks(checks)
    with check:
        rf = st.file_uploader("receipt.json", type=["json"], key="rf")
        inf = st.file_uploader("input image", type=["png", "jpg", "jpeg"], key="inf")
        if rf:
            rec = json.loads(rf.getvalue())
            checks = verify_receipt(rec, input_bytes=inf.getvalue() if inf else None, cfg=CFG)
            st.markdown(f"#### {'VERIFIED' if all_ok(checks) else 'REJECTED'}")
            show_checks(checks)
    tr = j("tamper_results.json")
    if tr:
        with st.expander("Automated tamper suite (trustlens demo-tamper)"):
            st.dataframe(pd.DataFrame(tr["cases"])[["case", "expected", "passed", "failed_checks", "correct", "note"]],
                         hide_index=True, width="stretch")
            st.json({"key_broker": tr["key_broker"], "chain": tr["chain"]})


def page_ledger():
    from trustlens.provenance.merkle_log import MerkleLog

    st.title("Merkle log")
    if not P.ledger.exists():
        need(None, "ledger")
        return
    led = ledger()
    c1, c2 = st.columns(2)
    c1.metric("Entries", led.size())
    c2.markdown(f"**Current root**  \n`{led.root()}`")
    kind = st.selectbox("Kind", ["all", "receipt", "evidence_batch", "audit_report", "risk_report", "trace_report",
                                 "key_release"])
    entries = led.entries(200, None if kind == "all" else kind)
    df = pd.DataFrame([{"idx": e["idx"], "id": e["id"], "kind": e["kind"], "leaf_hash": e["leaf_hash"][:20] + "…",
                        "created_at": e["created_at"]} for e in entries])
    st.dataframe(df, hide_index=True, width="stretch")
    if entries:
        pick = st.selectbox("Inclusion proof for", [e["id"] for e in entries])
        proof = led.proof_for(pick)
        ok = MerkleLog.verify_proof(proof, led.root())
        st.markdown(f"{status(ok, 'proof verifies against the current root', 'proof FAILS')} · leaf {proof['index']} "
                    f"of {proof['tree_size']} · {len(proof['proof'])} sibling hashes")
        st.json(proof, expanded=False)
    with st.expander("Root history"):
        st.dataframe(pd.DataFrame(led.root_history(100)), hide_index=True, width="stretch")


def page_tee():
    from trustlens.tee.attestation_mock import load_allowlist
    from trustlens.tee.enclave import EnclaveIdentity, make_broker
    from trustlens.tee.measurement import measure, measured_files

    st.title("Attestation & key broker")
    st.warning("MOCK TEE: the quote is signed by a local platform key standing in for the CPU vendor. "
               "The API mirrors SGX DCAP (BlindAI's validate_attestation) so real hardware can replace it.",
               icon=":material/science:")
    allow = load_allowlist(resolve(CFG["tee"]["allowlist"]))
    current = measure(CFG)
    st.markdown(f"**Current service measurement** `{current}`  \n"
                f"{status(current in allow, 'on the allowlist', 'NOT on the allowlist')}")
    with st.expander(f"Measured files ({len(measured_files(CFG))})"):
        st.write([f.relative_to(ROOT).as_posix() for f in measured_files(CFG)])

    st.subheader("Simulate a one-line code edit")
    files = [f.relative_to(ROOT).as_posix() for f in measured_files(CFG) if f.suffix == ".py"]
    target = st.selectbox("File", files, index=files.index("trustlens/api/service.py")
                          if "trustlens/api/service.py" in files else 0)
    edit = st.text_input("Line to append", "leak = True  # exfiltrate inputs")
    if st.button("Request keys", type="primary"):
        edited = measure(CFG, overrides={target: (ROOT / target).read_bytes() + b"\n" + edit.encode()}) if edit else current
        broker = make_broker(CFG, ledger())
        enclave = EnclaveIdentity(CFG, measurement=edited)
        keys, chk = broker.release(enclave.quote(broker.challenge()))
        st.markdown(f"Measurement `{edited[:32]}…` → {status(chk.ok, 'keys released', 'keys refused')}")
        for name, ok, detail in chk.checks:
            st.markdown(f"{status(ok)} {name} — {detail}")
        if chk.ok:
            st.caption(f"released: {', '.join(sorted(keys))}")
    st.caption("Clear the text box to request keys as the unmodified service.")


def page_eval():
    st.title("Evaluation")
    st.caption("Detectors scored against the attack ground truth (read only by the evaluator). Misses included.")
    p = P.evidence / "eval.md"
    if not need(p.exists() or None, "evaluation"):
        return
    st.markdown(p.read_text(encoding="utf-8"))
    with st.expander("Raw eval.json"):
        st.json(j("eval.json"))
    s = j("scan_summary.json")
    if s:
        with st.expander("Scan summary"):
            st.json(s)


PAGES = [  # (function, title, icon, url path)
    (page_overview, "Overview", ":material/dashboard:", "overview"),
    (page_contributors, "Contributors", ":material/groups:", "contributors"),
    (page_model, "Model audit", ":material/memory:", "model"),
    (page_trace, "Trace", ":material/target:", "trace"),
    (page_receipts, "Receipts", ":material/receipt_long:", "receipts"),
    (page_ledger, "Ledger", ":material/account_tree:", "ledger"),
    (page_tee, "Attestation", ":material/shield_lock:", "attestation"),
    (page_eval, "Evaluation", ":material/fact_check:", "evaluation"),
]
START = os.environ.get("TRUSTLENS_PAGE", "overview")  # which page opens first
pages = [st.Page(fn, title=t, icon=i, url_path=u, default=(u == START)) for fn, t, i, u in PAGES]
st.navigation(pages).run()
