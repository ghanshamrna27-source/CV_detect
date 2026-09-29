import base64
import copy

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from trustlens.provenance.receipts import (GENESIS, build_receipt, receipt_sha256, sign_receipt,
                                           verify_chain, verify_signature)
from trustlens.tee.attestation_mock import pubkey_raw


def _make(key, rid, prev, label=0):
    return sign_receipt(build_receipt(
        receipt_id=rid, issued_at="2026-10-02T11:04:55Z", input_sha256="a" * 64,
        model_manifest_sha256="b" * 64, pipeline_sha256="c" * 64,
        output={"label": label, "top3": [[label, 0.97], [8, 0.02], [1, 0.01]]},
        measurement="d" * 64, quote_id="q-1",
        signer_pubkey_b64=base64.b64encode(pubkey_raw(key.public_key())).decode(),
        prev_receipt_sha256=prev), key)


@pytest.fixture()
def key():
    return Ed25519PrivateKey.generate()


def test_genuine_receipt_verifies(key):
    assert verify_signature(_make(key, "rc-1", GENESIS))[0]


@pytest.mark.parametrize("path,value", [
    (("input_sha256",), "f" * 64),
    (("model_manifest_sha256",), "e" * 64),
    (("pipeline_sha256",), "0" * 64),
    (("output", "label"), 5),
    (("issued_at",), "2030-01-01T00:00:00Z"),
    (("prev_receipt_sha256",), "1" * 64),
    (("service", "measurement"), "9" * 64),
])
def test_changing_any_field_breaks_signature(key, path, value):
    r = copy.deepcopy(_make(key, "rc-1", GENESIS))
    target = r
    for p in path[:-1]:
        target = target[p]
    target[path[-1]] = value
    ok, detail = verify_signature(r)
    assert not ok and "altered" in detail


def test_swapping_signer_key_breaks_signature(key):
    r = _make(key, "rc-1", GENESIS)
    other = Ed25519PrivateKey.generate()
    r["service"]["signer_pubkey"] = base64.b64encode(pubkey_raw(other.public_key())).decode()
    assert not verify_signature(r)[0]


def test_hash_chain_and_replay(key):
    r1 = _make(key, "rc-1", GENESIS)
    r2 = _make(key, "rc-2", receipt_sha256(r1))
    r3 = _make(key, "rc-3", receipt_sha256(r2))
    assert verify_chain([r1, r2, r3])[0]
    ok, detail = verify_chain([r1, r2, r1])  # replayed receipt
    assert not ok and "rc-1" in detail
    assert not verify_chain([r1, r3])[0]  # a receipt removed from the middle
