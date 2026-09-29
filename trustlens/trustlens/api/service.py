"""TrustLens inference service + key broker (plan section 5.8).

| Endpoint                       | Purpose                                                     |
|--------------------------------|-------------------------------------------------------------|
| GET  /attestation?nonce=       | the service's quote (report_data binds its signing key)     |
| POST /infer (image)            | prediction + signed receipt, appended to the Merkle log     |
| GET  /ledger/root              | current Merkle root                                         |
| GET  /ledger/proof/{receipt_id}| inclusion proof                                             |
| GET  /ledger/entries           | latest log entries                                          |
| GET  /keys/challenge           | one-time nonce from the key broker                          |
| POST /keys/release             | key broker: needs a fresh, valid quote over that nonce      |

Run: uvicorn trustlens.api.service:app  (or `trustlens serve`)
"""

# No `from __future__ import annotations` here: FastAPI resolves endpoint annotations at runtime.
import base64
import io
import os
import secrets
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image
from pydantic import BaseModel

from trustlens.common.config import ROOT, Paths, get_device, load_config, resolve
from trustlens.common.hashing import model_manifest_sha256, sha256_bytes
from trustlens.common.io import write_json
from trustlens.provenance.merkle_log import MerkleLog
from trustlens.provenance.receipts import (GENESIS, build_receipt, pipeline_sha256, receipt_sha256,
                                           sign_receipt)
from trustlens.tee.enclave import EnclaveIdentity, make_broker


def code_commit() -> str:
    try:
        out = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, timeout=5)
        return out.stdout.strip() or "nogit"
    except (OSError, subprocess.SubprocessError):
        return "nogit"


def preprocess(data: bytes, pc: dict) -> np.ndarray:
    """Uploaded image bytes -> (1, 32, 32, 3) uint8, exactly as declared in the pipeline hash."""
    img = Image.open(io.BytesIO(data)).convert(pc["color"])
    if img.size != tuple(pc["resize"]):
        img = img.resize(tuple(pc["resize"]), Image.BILINEAR)
    return np.asarray(img, dtype=np.uint8)[None]


class InferenceService:
    """The attested inference service. The FastAPI app below is a thin wrapper."""

    def __init__(self, cfg: dict | None = None, model_dir: str | Path | None = None,
                 measurement: str | None = None, debug: bool | None = None):
        from trustlens.common.adapters import TorchModelAdapter

        self.cfg = cfg or load_config()
        self.paths = Paths.from_config(self.cfg).ensure()
        self.model_dir = resolve(model_dir or os.environ.get("TRUSTLENS_MODEL_DIR") or
                                 self.cfg["inference"]["model_dir"])
        self.model = TorchModelAdapter.from_dir(self.model_dir, get_device(self.cfg["training"]["device"]))
        self.model_hash = model_manifest_sha256(self.model_dir)
        self.enclave = EnclaveIdentity(self.cfg, measurement=measurement, debug=debug)
        self.ledger = MerkleLog(self.paths.ledger)
        self.broker = make_broker(self.cfg, self.ledger)
        self.pipeline_hash = pipeline_sha256(self.cfg["provenance"]["preprocess"], code_commit(),
                                             self.enclave.measurement)
        self._lock = threading.Lock()
        # the quote every receipt from this instance refers to
        self.quote = self.enclave.quote(nonce=secrets.token_hex(16))
        write_json(self.paths.receipts / "quotes" / f"{self.quote['quote_id']}.json", self.quote)
        write_json(self.paths.receipts / "quote.json", self.quote)

    def _prev_hash(self) -> str:
        last = self.ledger.entries(limit=1, kind="receipt")
        return receipt_sha256(last[0]["payload"]) if last else GENESIS

    def infer(self, data: bytes) -> dict:
        x = preprocess(data, self.cfg["provenance"]["preprocess"])
        probs = self.model.predict_proba(x)[0]
        top = np.argsort(-probs)[:3]
        names = self.cfg["dataset"]["class_names"]
        output = {"label": int(top[0]), "label_name": names[int(top[0])],
                  "top3": [[int(i), round(float(probs[i]), 6)] for i in top]}
        with self._lock:
            now = datetime.now(timezone.utc)
            rid = f"rc-{now:%Y%m%d}-{self.ledger.size():06d}-{secrets.token_hex(2)}"
            receipt = sign_receipt(build_receipt(
                receipt_id=rid, issued_at=now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                input_sha256=sha256_bytes(data), model_manifest_sha256=self.model_hash,
                pipeline_sha256=self.pipeline_hash, output=output, measurement=self.enclave.measurement,
                quote_id=self.quote["quote_id"], signer_pubkey_b64=self.enclave.pubkey_b64,
                prev_receipt_sha256=self._prev_hash()), self.enclave.signing_key)
            idx = self.ledger.append(rid, "receipt", receipt)
        write_json(self.paths.receipts / f"{rid}.json", receipt)
        (self.paths.receipts / "inputs").mkdir(parents=True, exist_ok=True)
        (self.paths.receipts / "inputs" / f"{rid}.png").write_bytes(data)
        return {"prediction": output, "receipt": receipt,
                "ledger": {"index": idx, "size": self.ledger.size(), "root": self.ledger.root()}}

    def attestation(self, nonce: str) -> dict:
        return self.enclave.quote(nonce)


# ---------------------------------------------------------------- FastAPI app

class ReleaseRequest(BaseModel):
    """Body of POST /keys/release (module level so FastAPI can resolve it as a request body)."""

    quote: dict
    keys: list[str] | None = None


def create_app(service: InferenceService | None = None):
    from fastapi import FastAPI, File, HTTPException, UploadFile

    app = FastAPI(title="TrustLens inference service", version="0.1.0",
                  description="Attested inference with signed receipts and a Merkle log. TEE is a MOCK.")
    state: dict = {"svc": service}

    def svc() -> InferenceService:
        if state["svc"] is None:
            state["svc"] = InferenceService()
        return state["svc"]

    @app.get("/health")
    def health():
        s = svc()
        return {"status": "ok", "measurement": s.enclave.measurement, "model": s.model_dir.name,
                "model_manifest_sha256": s.model_hash, "tee": "mock-sgx-dcap"}

    @app.get("/attestation")
    def attestation(nonce: str):
        return svc().attestation(nonce)

    @app.post("/infer")
    async def infer(file: UploadFile = File(...)):
        data = await file.read()
        try:
            return svc().infer(data)
        except (OSError, ValueError) as exc:
            raise HTTPException(400, f"could not read image: {exc}") from exc

    @app.get("/ledger/root")
    def ledger_root():
        led = svc().ledger
        return {"size": led.size(), "root": led.root()}

    @app.get("/ledger/proof/{receipt_id}")
    def ledger_proof(receipt_id: str):
        proof = svc().ledger.proof_for(receipt_id)
        if proof is None:
            raise HTTPException(404, "not in the log")
        return proof

    @app.get("/ledger/entries")
    def ledger_entries(limit: int = 50, kind: str | None = None):
        return svc().ledger.entries(limit, kind)

    @app.get("/keys/challenge")
    def keys_challenge():
        return {"nonce": svc().broker.challenge(), "ttl_s": svc().broker.ttl_s}

    @app.post("/keys/release")
    def keys_release(req: ReleaseRequest):
        keys, check = svc().broker.release(req.quote, req.keys)
        if not check.ok:
            raise HTTPException(403, {"released": False, "reason": check.reason, "checks": check.checks})
        # A real broker would wrap these to the enclave's key; here they are returned base64 (dev only).
        return {"released": True, "keys": {k: base64.b64encode(v).decode() for k, v in keys.items()},
                "checks": check.checks}

    return app


app = create_app()
