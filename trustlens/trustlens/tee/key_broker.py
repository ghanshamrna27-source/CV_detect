"""Key broker: releases dataset and model keys only to an attested service (plan section 5.7).

Flow: the broker issues a one-time nonce -> the service returns a quote over that nonce ->
the broker verifies the quote (platform signature, allowlisted measurement, not debug,
nonce fresh and under `ttl` seconds old) -> keys are released. Every decision is logged.
"""

from __future__ import annotations

import base64
import json
import secrets
import time
from pathlib import Path

from trustlens.tee.attestation_mock import QuoteCheck, load_allowlist, verify_quote


class KeyStore:
    """Dev-only key storage (a real broker would sit behind an HSM)."""

    def __init__(self, path: str | Path):
        self.path = Path(path)

    def _read(self) -> dict:
        if not self.path.exists():
            return {}
        return json.loads(self.path.read_text(encoding="utf-8"))

    def put(self, name: str, key: bytes) -> None:
        data = self._read()
        data[name] = base64.b64encode(key).decode()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")

    def names(self) -> list[str]:
        return sorted(self._read())

    def get(self, name: str) -> bytes:
        return base64.b64decode(self._read()[name])


class KeyBroker:
    def __init__(self, store: KeyStore, platform_pub, allowlist_path: str | Path, ttl_s: float = 60,
                 ledger=None):
        self.store = store
        self.platform_pub = platform_pub
        self.allowlist_path = Path(allowlist_path)
        self.ttl_s = ttl_s
        self.ledger = ledger
        self._nonces: dict[str, float] = {}

    def challenge(self) -> str:
        nonce = secrets.token_hex(16)
        self._nonces[nonce] = time.time()
        return nonce

    def release(self, quote: dict, names: list[str] | None = None) -> tuple[dict[str, bytes], QuoteCheck]:
        """Return (keys, check). Keys are empty unless every check passes."""
        nonce = quote.get("nonce", "")
        issued = self._nonces.pop(nonce, None)  # one-time use
        check = verify_quote(quote, self.platform_pub, load_allowlist(self.allowlist_path),
                             max_age_s=self.ttl_s)
        check.add("nonce_issued_by_broker", issued is not None,
                  "nonce was issued by this broker" if issued is not None else "unknown or replayed nonce")
        if issued is not None:
            age = time.time() - issued
            check.add("nonce_fresh", age <= self.ttl_s, f"nonce age {age:.0f}s (limit {self.ttl_s:.0f}s)")

        wanted = names or self.store.names()
        keys = {n: self.store.get(n) for n in wanted if n in self.store.names()} if check.ok else {}
        if self.ledger is not None:
            self.ledger.append(f"kr-{secrets.token_hex(6)}", "key_release", {
                "decision": "released" if check.ok else "refused",
                "measurement": quote.get("measurement"),
                "quote_id": quote.get("quote_id"),
                "keys": sorted(keys) if check.ok else [],
                "reason": check.reason,
            })
        return keys, check
