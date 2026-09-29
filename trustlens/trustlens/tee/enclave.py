"""The service's enclave identity and attested key release.

At start-up the service measures its own code, generates an Ed25519 receipt-signing key that
never touches disk, and puts SHA-256 of the public key into its quote's report_data.
"""

from __future__ import annotations

import base64
import io

import numpy as np
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from trustlens.common.config import Paths, load_config, resolve
from trustlens.common.io import read_json
from trustlens.provenance.merkle_log import MerkleLog
from trustlens.tee import crypto_box
from trustlens.tee.attestation_mock import (issue_quote, load_platform_priv, load_platform_pub,
                                            pubkey_raw, report_data_for)
from trustlens.tee.key_broker import KeyBroker, KeyStore
from trustlens.tee.measurement import measure


class EnclaveIdentity:
    def __init__(self, cfg: dict | None = None, measurement: str | None = None, debug: bool | None = None):
        self.cfg = cfg or load_config()
        self.paths = Paths.from_config(self.cfg)
        self.measurement = measurement or measure(self.cfg)
        self.debug = self.cfg["tee"]["debug"] if debug is None else debug
        self._signing_key = Ed25519PrivateKey.generate()  # in memory only
        self.pubkey_b64 = base64.b64encode(pubkey_raw(self._signing_key.public_key())).decode()
        self.report_data = report_data_for(self.pubkey_b64)

    @property
    def signing_key(self) -> Ed25519PrivateKey:
        return self._signing_key

    def quote(self, nonce: str) -> dict:
        # The platform key stands in for the CPU vendor's attestation key (mock only).
        q = issue_quote(load_platform_priv(self.paths.keys), self.measurement, self.report_data, nonce,
                        debug=self.debug)
        q["signer_pubkey"] = self.pubkey_b64  # convenience copy; binding is via report_data
        return q


def make_broker(cfg: dict | None = None, ledger: MerkleLog | None = None) -> KeyBroker:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg)
    return KeyBroker(KeyStore(paths.broker_store), load_platform_pub(paths.keys),
                     resolve(cfg["tee"]["allowlist"]), cfg["tee"]["nonce_ttl_s"], ledger=ledger)


def attested_pool(cfg: dict | None = None, log: bool = True) -> tuple[dict[str, np.ndarray], dict]:
    """Attest, obtain the batch keys from the broker, and decrypt every contributor batch.

    Returns (pool arrays in contributor order, attestation summary). Raises PermissionError if the
    broker refuses, e.g. because the service code was modified.
    """
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg)
    ledger = MerkleLog(paths.ledger) if log else None
    broker = make_broker(cfg, ledger)
    enclave = EnclaveIdentity(cfg)
    nonce = broker.challenge()
    quote = enclave.quote(nonce)
    batches = read_json(paths.data / "batches.json", {})
    keys, check = broker.release(quote, [f"batch:{c}" for c in batches])
    summary = {"measurement": enclave.measurement, "quote_id": quote["quote_id"], "released": sorted(keys),
               "checks": check.checks, "ok": check.ok}
    if not check.ok:
        raise PermissionError(f"key broker refused key release: {check.reason}")

    parts = {"x": [], "y": [], "contributor": [], "sample_id": []}
    for c, info in batches.items():
        blob = crypto_box.decrypt_file(keys[f"batch:{c}"], resolve(info["file"]), aad=c.encode())
        with np.load(io.BytesIO(blob)) as z:
            parts["x"].append(z["x"])
            parts["y"].append(z["y"])
            parts["sample_id"].append(z["sample_id"])
            parts["contributor"].append(np.array([c] * len(z["y"])))
    pool = {k: np.concatenate(v) for k, v in parts.items()}
    return pool, summary
