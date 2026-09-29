"""Receipt tamper suite (plan sections 7 and 9, step 5).

Generates genuine and attacked receipts and runs the verifier on each. Every attacked case must
fail, and fail on the right check. Results: artifacts/evidence/tamper_results.json.
"""

from __future__ import annotations

import base64
import copy
import io
import secrets

import numpy as np
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from PIL import Image

from trustlens.common.config import Paths, load_config
from trustlens.common.io import load_npz, write_json
from trustlens.provenance.receipts import receipt_sha256, sign_receipt, verify_chain
from trustlens.provenance.verify_cli import all_ok, as_dicts, verify_receipt
from trustlens.tee.attestation_mock import pubkey_raw


def _png(img: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(img).save(buf, format="PNG")
    return buf.getvalue()


def forge_receipt(genuine: dict) -> dict:
    """An attacker outside the service signs a receipt with their own key."""
    key = Ed25519PrivateKey.generate()
    fake = copy.deepcopy(genuine)
    fake["receipt_id"] = f"rc-forged-{secrets.token_hex(3)}"
    fake["output"] = {"label": 9, "label_name": "truck", "top3": [[9, 0.99], [1, 0.005], [8, 0.005]]}
    fake["service"]["signer_pubkey"] = base64.b64encode(pubkey_raw(key.public_key())).decode()
    return sign_receipt(fake, key)


def run(cfg: dict | None = None, log=print) -> dict:
    from trustlens.api.service import InferenceService
    from trustlens.tee.measurement import measure

    cfg = cfg or load_config()
    paths = Paths.from_config(cfg)
    held = load_npz(paths.data / "heldout.npz")
    img_a, img_b = _png(held["x"][0]), _png(held["x"][1])

    genuine_svc = InferenceService(cfg)
    r1 = genuine_svc.infer(img_a)["receipt"]
    r2 = genuine_svc.infer(img_b)["receipt"]

    cases = []

    def case(name, expected, receipt, input_bytes, expect_fail_check=None, note=""):
        checks = verify_receipt(receipt, input_bytes=input_bytes, cfg=cfg)
        passed = all_ok(checks)
        failed = [c.name for c in checks if c.ok is False]
        correct = (passed if expected == "pass" else (not passed and (expect_fail_check is None or
                                                                      expect_fail_check in failed)))
        cases.append({"case": name, "expected": expected, "passed": passed, "failed_checks": failed,
                      "correct": correct, "note": note, "receipt_id": receipt.get("receipt_id"),
                      "checks": as_dicts(checks)})
        log(f"  {'OK ' if correct else 'BAD'} {name:<28} -> {'PASS' if passed else 'FAIL: ' + ', '.join(failed)}")

    case("genuine", "pass", r1, img_a, note="issued by the attested service with the approved model")

    altered = copy.deepcopy(r1)
    altered["output"]["label"] = (altered["output"]["label"] + 1) % 10
    case("output_altered", "fail", altered, img_a, "signature", "output label edited after signing")

    case("input_swapped", "fail", r1, img_b, "input_hash", "receipt presented with a different image")

    swapped_svc = InferenceService(cfg, model_dir=paths.models / "pool")
    r_swap = swapped_svc.infer(img_a)["receipt"]
    case("model_swapped", "fail", r_swap, img_a, "model_manifest",
         "service ran the substituted (pool) model instead of the approved one")

    forged = forge_receipt(r1)
    case("forged_outside_service", "fail", forged, img_a, "attestation",
         "signed with an attacker key that no attested quote binds")

    edited_measurement = measure(cfg, overrides={"trustlens/api/service.py": b"# one line edited\n"})
    rogue_svc = InferenceService(cfg, measurement=edited_measurement)
    r_rogue = rogue_svc.infer(img_a)["receipt"]
    case("modified_service_code", "fail", r_rogue, img_a, "attestation",
         "service code edited: its measurement is not on the allowlist")

    debug_svc = InferenceService(cfg, debug=True)
    r_dbg = debug_svc.infer(img_a)["receipt"]
    case("debug_enclave", "fail", r_dbg, img_a, "attestation", "quote from a debug-mode enclave")

    # key broker refuses the modified service
    broker = genuine_svc.broker
    _, ok_check = broker.release(genuine_svc.attestation(broker.challenge()))
    _, bad_check = broker.release(rogue_svc.attestation(broker.challenge()))
    replay_quote = genuine_svc.attestation(broker.challenge())
    broker.release(replay_quote)
    _, replay_check = broker.release(replay_quote)
    key_broker = {"genuine_service": ok_check.ok, "modified_service": bad_check.ok,
                  "modified_reason": bad_check.reason, "replayed_nonce": replay_check.ok,
                  "replay_reason": replay_check.reason}
    log(f"  key broker: genuine -> {'released' if ok_check.ok else 'refused'}; modified code -> "
        f"{'released' if bad_check.ok else 'refused'}; replayed nonce -> "
        f"{'released' if replay_check.ok else 'refused'}")

    chain_ok, _ = verify_chain([r1, r2])
    replay_ok, replay_detail = verify_chain([r1, r2, r1])
    chain = {"genuine_chain": chain_ok, "replayed_receipt_chain": replay_ok, "detail": replay_detail,
             "r2_prev_is_r1": r2["prev_receipt_sha256"] == receipt_sha256(r1)}

    result = {"cases": cases, "key_broker": key_broker, "chain": chain,
              "all_correct": all(c["correct"] for c in cases) and ok_check.ok and not bad_check.ok
              and not replay_check.ok and chain_ok and not replay_ok}
    write_json(paths.evidence / "tamper_results.json", result)
    write_json(paths.receipts / "demo" / "genuine.json", r1)
    write_json(paths.receipts / "demo" / "model_swapped.json", r_swap)
    write_json(paths.receipts / "demo" / "forged.json", forged)
    (paths.receipts / "demo" / "input.png").write_bytes(img_a)
    log(f"  tamper suite: {'all cases behaved as expected' if result['all_correct'] else 'SOME CASES WRONG'}")
    return result
