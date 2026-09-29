"""Model signature check with OpenSSF `model-signing` (offline EC key, plan sections 5.2 / 5.4).

A mismatch means the supplied model was substituted or modified after the vendor signed it.
A valid signature proves who signed the model and that it is unchanged; it does NOT prove the
model is free of backdoors, which is why the auditor runs further checks.
"""

from __future__ import annotations

import re
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def generate_vendor_key(keys_dir: str | Path) -> None:
    keys_dir = Path(keys_dir)
    keys_dir.mkdir(parents=True, exist_ok=True)
    priv = ec.generate_private_key(ec.SECP256R1())
    (keys_dir / "vendor.priv").write_bytes(priv.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    (keys_dir / "vendor.pub").write_bytes(priv.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))


def sign_model(model_dir: str | Path, private_key: str | Path, signature: str | Path) -> None:
    import model_signing

    Path(signature).parent.mkdir(parents=True, exist_ok=True)
    (model_signing.signing.Config()
     .use_elliptic_key_signer(private_key=Path(private_key))
     .sign(Path(model_dir), Path(signature)))


def verify_model(model_dir: str | Path, signature: str | Path, public_key: str | Path) -> tuple[bool, str]:
    """Return (ok, detail)."""
    import model_signing

    if not Path(signature).exists():
        return False, f"no signature file at {signature}"
    try:
        (model_signing.verifying.Config()
         .use_elliptic_key_verifier(public_key=Path(public_key))
         .verify(Path(model_dir), Path(signature)))
        return True, "model-signing: signature valid and every file matches the signed manifest"
    except Exception as exc:  # model_signing raises ValueError for mismatches
        msg = str(exc)
        files = re.findall(r"Hash mismatch for '([^']+)'", msg)
        if files:
            return False, f"model-signing: hash mismatch for {', '.join(sorted(set(files)))} (model substituted or modified)"
        first = msg.strip().splitlines()[0] if msg.strip() else type(exc).__name__
        return False, f"model-signing verification failed: {first[:200]}"
