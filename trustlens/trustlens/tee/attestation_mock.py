"""Mock remote attestation, shaped like SGX DCAP (BlindAI `client/blindai/_dcap_attestation.py`).

| Real SGX                          | Mock                                                   |
|-----------------------------------|--------------------------------------------------------|
| MRENCLAVE                         | `measurement` = SHA-256 of the service code + config   |
| Intel-signed quote                | JSON quote signed by a *platform key* (Intel stand-in) |
| report_data binds the enclave key | report_data = SHA-256(receipt-signing public key)      |
| manifest.toml of accepted enclaves| configs/allowed_measurements.yaml                      |
| allow_debug = false               | quotes with debug = true are rejected                  |

THIS IS A MOCK. Swapping in real SGX/TDX changes `issue_quote` and the platform-signature
check only; `verify_quote`'s other checks and every caller stay the same.
"""

from __future__ import annotations

import base64
import secrets
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import yaml
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from trustlens.common.hashing import canonical_json, sha256_bytes

QUOTE_FIELDS = ("version", "quote_id", "platform", "measurement", "report_data", "debug", "nonce",
                "issued_at")


def _now() -> float:
    return time.time()


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_iso(s: str) -> float:
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp()


# ------------------------------------------------------------------ keys

def generate_platform_key(keys_dir: str | Path) -> None:
    keys_dir = Path(keys_dir)
    keys_dir.mkdir(parents=True, exist_ok=True)
    priv = Ed25519PrivateKey.generate()
    (keys_dir / "platform.priv").write_bytes(priv.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    (keys_dir / "platform.pub").write_bytes(priv.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))


def load_platform_priv(keys_dir: str | Path) -> Ed25519PrivateKey:
    return serialization.load_pem_private_key((Path(keys_dir) / "platform.priv").read_bytes(), None)


def load_platform_pub(keys_dir: str | Path) -> Ed25519PublicKey:
    return serialization.load_pem_public_key((Path(keys_dir) / "platform.pub").read_bytes())


def pubkey_raw(pub: Ed25519PublicKey) -> bytes:
    return pub.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)


def report_data_for(pubkey_b64: str) -> str:
    """report_data binds the enclave's receipt-signing key: SHA-256 of its raw bytes."""
    return sha256_bytes(base64.b64decode(pubkey_b64))


# ------------------------------------------------------------------ allowlist

def load_allowlist(path: str | Path) -> list[str]:
    path = Path(path)
    if not path.exists():
        return []
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return [m["value"] for m in data.get("measurements", [])]


def add_to_allowlist(path: str | Path, measurement: str, description: str) -> None:
    path = Path(path)
    data = (yaml.safe_load(path.read_text(encoding="utf-8")) if path.exists() else None) or {}
    ms = [m for m in data.get("measurements", []) if m["value"] != measurement]
    ms.append({"value": measurement, "description": description, "added_at": _iso(_now())})
    data["measurements"] = ms
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("# Accepted service measurements (like BlindAI's manifest.toml mr_enclave).\n"
                    + yaml.safe_dump(data, sort_keys=False), encoding="utf-8")


# ------------------------------------------------------------------ quotes

def issue_quote(platform_priv: Ed25519PrivateKey, measurement: str, report_data: str, nonce: str,
                debug: bool = False, issued_at: float | None = None) -> dict:
    quote = {
        "version": 1,
        "quote_id": f"q-{secrets.token_hex(8)}",
        "platform": "mock-sgx-dcap",
        "measurement": measurement,
        "report_data": report_data,
        "debug": bool(debug),
        "nonce": nonce,
        "issued_at": _iso(issued_at if issued_at is not None else _now()),
    }
    sig = platform_priv.sign(canonical_json(quote))
    quote["platform_signature"] = base64.b64encode(sig).decode()
    return quote


@dataclass
class QuoteCheck:
    ok: bool
    checks: list[tuple[str, bool, str]] = field(default_factory=list)

    def add(self, name: str, ok: bool, detail: str = "") -> None:
        self.checks.append((name, ok, detail))
        self.ok = self.ok and ok

    @property
    def reason(self) -> str:
        failed = [f"{n}: {d}" for n, ok, d in self.checks if not ok]
        return "; ".join(failed) if failed else "ok"


def verify_quote(quote: dict, platform_pub: Ed25519PublicKey, allowlist: list[str], *,
                 expected_nonce: str | None = None, max_age_s: float | None = None,
                 expected_report_data: str | None = None, allow_debug: bool = False,
                 now: float | None = None) -> QuoteCheck:
    """The same order of checks as BlindAI's `validate_attestation`."""
    res = QuoteCheck(ok=True)
    body = {k: quote.get(k) for k in QUOTE_FIELDS}
    try:
        platform_pub.verify(base64.b64decode(quote.get("platform_signature", "")), canonical_json(body))
        res.add("platform_signature", True, "quote signed by the platform root")
    except (InvalidSignature, ValueError):
        res.add("platform_signature", False, "quote not signed by the trusted platform key")

    m = quote.get("measurement")
    res.add("measurement_allowlisted", m in allowlist,
            "measurement on the allowlist" if m in allowlist else f"measurement {str(m)[:16]}… not on the allowlist")

    dbg = bool(quote.get("debug"))
    res.add("not_debug", allow_debug or not dbg, "production mode" if not dbg else "debug-mode enclave rejected")

    if expected_report_data is not None:
        ok = quote.get("report_data") == expected_report_data
        res.add("report_data_binding", ok,
                "report_data binds the signing key" if ok else "report_data does not match the signing key")

    if expected_nonce is not None:
        ok = quote.get("nonce") == expected_nonce
        res.add("nonce", ok, "nonce matches the challenge" if ok else "nonce does not match the challenge")

    if max_age_s is not None:
        try:
            age = (now if now is not None else _now()) - _parse_iso(quote["issued_at"])
            ok = -5 <= age <= max_age_s
            res.add("fresh", ok, f"quote age {age:.0f}s (limit {max_age_s:.0f}s)")
        except (KeyError, ValueError):
            res.add("fresh", False, "missing or malformed issued_at")
    return res
