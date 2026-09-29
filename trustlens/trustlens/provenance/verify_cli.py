"""Receipt verifier (plan section 5.6). Says exactly WHICH check failed.

  1. signature            Ed25519 over the receipt body
  2. input hash           SHA-256 of the supplied input file == receipt.input_sha256
  3. model manifest hash  manifest digest of the approved model dir == receipt.model_manifest_sha256
  4. attestation          quote is platform-signed, allowlisted, not debug, and its report_data
                          binds the key that signed the receipt
  5. Merkle inclusion     receipt is in the log under the published root

Usage: trustlens verify receipt.json --input img.png --model artifacts/models/reference --quote quote.json
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from trustlens.common.config import Paths, load_config, resolve
from trustlens.common.hashing import canonical_json, model_manifest_sha256, sha256_bytes
from trustlens.provenance.merkle_log import MerkleLog, leaf_hash
from trustlens.provenance.receipts import verify_signature
from trustlens.tee.attestation_mock import load_allowlist, load_platform_pub, report_data_for, verify_quote


@dataclass
class Check:
    n: int
    name: str
    ok: bool | None  # None = skipped (input not supplied)
    detail: str


def find_quote(paths: Paths, quote_id: str) -> dict | None:
    p = paths.receipts / "quotes" / f"{quote_id}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def verify_receipt(receipt: dict, *, input_bytes: bytes | None = None, model_dir: str | Path | None = None,
                   quote: dict | None = None, ledger: MerkleLog | None = None, root: str | None = None,
                   cfg: dict | None = None) -> list[Check]:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg)
    checks: list[Check] = []

    ok, detail = verify_signature(receipt)
    checks.append(Check(1, "signature", ok, detail))

    if input_bytes is None:
        checks.append(Check(2, "input_hash", None, "no input supplied"))
    else:
        h = sha256_bytes(input_bytes)
        ok = h == receipt.get("input_sha256")
        checks.append(Check(2, "input_hash", ok, "input matches the receipt" if ok else
                            f"input hash {h[:16]}… != receipt {str(receipt.get('input_sha256'))[:16]}…"))

    model_dir = resolve(model_dir or cfg["inference"]["approved_model_dir"])
    if not model_dir.exists():
        checks.append(Check(3, "model_manifest", None, f"approved model dir {model_dir} not found"))
    else:
        h = model_manifest_sha256(model_dir)
        ok = h == receipt.get("model_manifest_sha256")
        checks.append(Check(3, "model_manifest", ok, "receipt was produced by the approved model" if ok else
                            f"model mismatch: receipt {str(receipt.get('model_manifest_sha256'))[:16]}… "
                            f"!= approved {h[:16]}… (model swapped)"))

    svc = receipt.get("service", {})
    quote = quote or find_quote(paths, svc.get("quote_id", ""))
    if quote is None:
        checks.append(Check(4, "attestation", False, "no attestation quote for this receipt's service"))
    else:
        qc = verify_quote(quote, load_platform_pub(paths.keys), load_allowlist(resolve(cfg["tee"]["allowlist"])),
                          expected_report_data=report_data_for(svc.get("signer_pubkey", "")) if svc.get(
                              "signer_pubkey") else "missing")
        same = quote.get("quote_id") == svc.get("quote_id") and quote.get("measurement") == svc.get("measurement")
        qc.add("quote_matches_receipt", same, "receipt names this quote" if same else
               "receipt's quote_id / measurement differ from the quote")
        checks.append(Check(4, "attestation", qc.ok, "signing key bound to an attested, allowlisted service"
                            if qc.ok else qc.reason))

    ledger = ledger or (MerkleLog(paths.ledger) if paths.ledger.exists() else None)
    if ledger is None:
        checks.append(Check(5, "merkle_inclusion", None, "no ledger available"))
    else:
        entry = ledger.get(receipt.get("receipt_id", ""))
        if entry is None:
            checks.append(Check(5, "merkle_inclusion", False, "receipt id not found in the log"))
        else:
            proof = ledger.inclusion_proof(entry["idx"])
            expected_leaf = leaf_hash(canonical_json(receipt)).hex()
            published = root or proof["root"]
            if proof["leaf_hash"] != expected_leaf:
                checks.append(Check(5, "merkle_inclusion", False,
                                    "logged receipt differs from this receipt (altered after logging)"))
            elif not MerkleLog.verify_proof(proof, published):
                checks.append(Check(5, "merkle_inclusion", False, "inclusion proof does not match the published root"))
            else:
                checks.append(Check(5, "merkle_inclusion", True,
                                    f"leaf {entry['idx']} included in tree of size {proof['tree_size']} "
                                    f"(root {published[:16]}…)"))
    return checks


def all_ok(checks: list[Check]) -> bool:
    return all(c.ok is not False for c in checks)


def as_dicts(checks: list[Check]) -> list[dict]:
    return [asdict(c) for c in checks]
