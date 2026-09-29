"""Signed inference receipts (plan section 5.6).

A receipt binds the exact input, model manifest and processing pipeline to the output, is
signed with an Ed25519 key that exists only inside the (attested) service, and chains to the
previous receipt through `prev_receipt_sha256`.
"""

from __future__ import annotations

import base64

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from trustlens.common.hashing import canonical_json, sha256_bytes, sha256_json

GENESIS = "0" * 64


def pipeline_sha256(preprocess: dict, code_commit: str, measurement: str) -> str:
    """SHA-256(preprocess config + code version + service measurement)."""
    return sha256_json({"preprocess": preprocess, "code_commit": code_commit, "measurement": measurement})


def signing_body(receipt: dict) -> bytes:
    return canonical_json({k: v for k, v in receipt.items() if k != "signature"})


def sign_receipt(receipt: dict, key: Ed25519PrivateKey) -> dict:
    out = {k: v for k, v in receipt.items() if k != "signature"}
    out["signature"] = base64.b64encode(key.sign(signing_body(out))).decode()
    return out


def verify_signature(receipt: dict) -> tuple[bool, str]:
    """Check the signature against the signer key named in the receipt itself.

    That the key belongs to an attested service is a separate check (the quote binding).
    """
    try:
        pub = Ed25519PublicKey.from_public_bytes(base64.b64decode(receipt["service"]["signer_pubkey"]))
        pub.verify(base64.b64decode(receipt["signature"]), signing_body(receipt))
        return True, "Ed25519 signature valid"
    except (KeyError, ValueError, TypeError):
        return False, "receipt is malformed or missing its signature / signer key"
    except InvalidSignature:
        return False, "signature does not match the receipt contents (receipt was altered)"


def receipt_sha256(receipt: dict) -> str:
    """Hash of the full signed receipt; the next receipt's `prev_receipt_sha256`."""
    return sha256_json(receipt)


def input_sha256(data: bytes) -> str:
    return sha256_bytes(data)


def build_receipt(*, receipt_id: str, issued_at: str, input_sha256: str, model_manifest_sha256: str,
                  pipeline_sha256: str, output: dict, measurement: str, quote_id: str,
                  signer_pubkey_b64: str, prev_receipt_sha256: str) -> dict:
    return {
        "receipt_id": receipt_id,
        "issued_at": issued_at,
        "input_sha256": input_sha256,
        "model_manifest_sha256": model_manifest_sha256,
        "pipeline_sha256": pipeline_sha256,
        "output": output,
        "service": {"measurement": measurement, "quote_id": quote_id, "signer_pubkey": signer_pubkey_b64},
        "prev_receipt_sha256": prev_receipt_sha256,
    }


def verify_chain(receipts: list[dict]) -> tuple[bool, str]:
    """Each receipt must point at the hash of the one before it (detects replay / reordering)."""
    for prev, cur in zip(receipts, receipts[1:]):
        if cur.get("prev_receipt_sha256") != receipt_sha256(prev):
            return False, f"{cur.get('receipt_id')} does not chain to {prev.get('receipt_id')}"
    return True, "hash chain intact"
