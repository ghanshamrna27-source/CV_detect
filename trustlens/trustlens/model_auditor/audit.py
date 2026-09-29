"""Model audit: signature -> probe fingerprint -> Neural Cleanse -> verdict (plan section 5.4).

Checks run in order of the access they need; each result states the access level it used.
Outputs: artifacts/evidence/model_auditor.jsonl, audit.json, nc.npz and trigger PNGs.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from trustlens.common.adapters import TorchModelAdapter
from trustlens.common.config import Paths, get_device, load_config, resolve, seed_everything
from trustlens.common.hashing import model_manifest_sha256, sha256_file
from trustlens.common.io import load_npz, rel, save_npz, write_json
from trustlens.common.schema import EvidenceWriter
from trustlens.common.config import ROOT
from trustlens.model_auditor import fingerprint, neural_cleanse
from trustlens.model_auditor.signature import verify_model
from trustlens.provenance.merkle_log import MerkleLog


def _save_img(arr: np.ndarray, path: Path, scale: int = 8) -> str:
    """arr: (H,W) or (3,H,W) float in [0,1]."""
    a = arr if arr.ndim == 2 else np.transpose(arr, (1, 2, 0))
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    return rel(path, ROOT)


def audit(model_dir: str | Path | None = None, access: str = "white-box", cfg: dict | None = None,
          log=print) -> dict:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg).ensure()
    seed_everything(cfg["seed"])
    ac = cfg["auditor"]
    model_dir = resolve(model_dir or ac["model_dir"])
    name = model_dir.name
    device = get_device(cfg["training"]["device"])
    adapter = TorchModelAdapter.from_dir(model_dir, device)
    k = cfg["dataset"]["num_classes"]
    class_names = cfg["dataset"]["class_names"]
    report: dict = {"model": name, "model_dir": rel(model_dir, ROOT),
                    "model_manifest_sha256": model_manifest_sha256(model_dir), "access": access}

    with EvidenceWriter(paths.evidence / "model_auditor.jsonl", "model_auditor", "mdl") as ev:
        # 1. signature (any access)
        ok, detail = verify_model(model_dir, resolve(ac["signature"]), paths.keys / "vendor.pub")
        report["signature"] = {"ok": ok, "detail": detail, "signature_file": ac["signature"]}
        ev.add(module="model_auditor.signature", subject_type="model", subject_id=name, check="signature",
               score=1.0 if ok else 0.0, threshold=1.0, flagged=not ok, confidence="high",
               method="OpenSSF model-signing (EC P-256 key, offline) over every model file",
               access_level="n/a", details={"verdict": "authentic" if ok else "substituted or modified",
                                            "detail": detail})
        log(f"  signature: {'valid' if ok else 'FAILED'} - {detail}")

        # 2. probe fingerprint (black-box)
        fp = fingerprint.compare(paths, adapter, ac["probe_size"])
        drift = fp["agreement"] < ac["agreement_threshold"] or fp["kl"] > ac["kl_threshold"]
        report["fingerprint"] = {**fp, "drift": drift, "agreement_threshold": ac["agreement_threshold"],
                                 "kl_threshold": ac["kl_threshold"]}
        ev.add(module="model_auditor.fingerprint", subject_type="model", subject_id=name,
               check="probe_fingerprint", score=fp["agreement"], threshold=ac["agreement_threshold"],
               flagged=drift, confidence="medium",
               method=f"top-1 agreement and KL vs reference outputs on {fp['probe_size']} fixed probe images",
               access_level="black-box", details=fp)
        log(f"  fingerprint: agreement {fp['agreement']:.3f}, KL {fp['kl']:.3f}{' (drift)' if drift else ''}")

        # 3. Neural Cleanse (white-box)
        nc_out = None
        if access == "white-box" and adapter.torch_module() is not None:
            held = load_npz(paths.data / "heldout.npz")["x"][: ac["nc"]["samples"]]
            log(f"  Neural Cleanse on {len(held)} clean held-out images, {k} classes ({device})")
            nc_out = neural_cleanse.run(adapter.torch_module(), held, k, ac["nc"], device, log)
            img_dir = paths.evidence_img / "nc" / name
            per_class = []
            for t in range(k):
                m, p = nc_out["masks"][t], nc_out["patterns"][t]
                per_class.append({
                    "class": t, "name": class_names[t], "l1": float(nc_out["l1"][t]),
                    "anomaly_index": float(nc_out["anomaly_index"][t]),
                    "attack_acc": float(nc_out["attack_acc"][t]),
                    "converged": bool(nc_out["converged"][t]),
                    "mask_png": _save_img(m, img_dir / f"mask_{t}.png"),
                    "pattern_png": _save_img(p, img_dir / f"pattern_{t}.png"),
                    "trigger_png": _save_img(m[None] * p, img_dir / f"trigger_{t}.png"),
                })
            save_npz(paths.evidence / f"nc_{name}.npz", **{k_: np.asarray(v) for k_, v in nc_out.items()
                                                           if k_ not in ("flagged_classes", "target")},
                     target=np.array(-1 if nc_out["target"] is None else nc_out["target"]))
            t = nc_out["target"]
            report["neural_cleanse"] = {"per_class": per_class, "flagged_classes": nc_out["flagged_classes"],
                                        "target": t, "target_name": class_names[t] if t is not None else None,
                                        "anomaly_threshold": ac["nc"]["anomaly_threshold"]}
            for row in per_class:
                flagged = row["class"] in nc_out["flagged_classes"]
                ev.add(module="model_auditor.neural_cleanse", subject_type="model",
                       subject_id=f"{name}/class_{row['class']}", check="backdoor_target_class",
                       score=row["anomaly_index"], threshold=ac["nc"]["anomaly_threshold"], flagged=flagged,
                       confidence="high" if row["anomaly_index"] > 3 else "medium",
                       method="Neural Cleanse trigger reverse-engineering + MAD anomaly index on mask L1",
                       access_level="white-box",
                       artefacts=[row["mask_png"], row["pattern_png"], row["trigger_png"]] if flagged else [],
                       details={"l1": row["l1"], "attack_acc": row["attack_acc"], "class_name": row["name"]})
            log(f"  NC target: {t if t is not None else 'none'} "
                f"(anomaly {nc_out['anomaly_index'][t]:.2f})" if t is not None else "  NC: no backdoor target")

        # 4. verdict
        if nc_out is not None and nc_out["target"] is not None:
            ai = float(nc_out["anomaly_index"][nc_out["target"]])
            verdict, conf = "backdoored", "high" if ai > 3 else "medium"
            why = f"Neural Cleanse recovered a small trigger for class {nc_out['target']} (anomaly index {ai:.2f})"
        elif not ok or drift:
            verdict, conf = "suspicious", "medium"
            why = "signature mismatch" if not ok else "behavioural drift on the probe set"
        else:
            verdict, conf = "clean", "medium" if access == "white-box" else "low"
            why = "signature valid, no drift, no backdoor target found"
        report["verdict"] = {"verdict": verdict, "confidence": conf, "reason": why,
                             "access_level": access}
        rec = ev.add(module="model_auditor.audit", subject_type="model", subject_id=name, check="model_verdict",
                     score=None, threshold=None, flagged=verdict != "clean", confidence=conf,
                     method="signature + probe fingerprint + Neural Cleanse", access_level=access,
                     details=report["verdict"])
        log(f"  verdict: {verdict} ({conf}) - {why}")

    report["limitations"] = [
        "Neural Cleanse finds patch-like triggers; invisible/sample-specific triggers (WaNet, SSBA) can evade it.",
        "A valid signature proves origin and integrity, not the absence of a backdoor.",
        "Probe agreement between two honestly trained models is typically ~0.9, so drift alone is weak evidence.",
    ]
    write_json(paths.evidence / f"audit_{name}.json", report)
    write_json(paths.evidence / "audit.json", report)
    MerkleLog(paths.ledger).append(f"audit-{name}-{rec.sha256[:12]}", "audit_report", {
        "model": name, "verdict": report["verdict"], "model_manifest_sha256": report["model_manifest_sha256"],
        "evidence_file_sha256": sha256_file(paths.evidence / "model_auditor.jsonl")})
    return report
