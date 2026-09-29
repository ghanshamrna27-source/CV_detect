"""AES-256-GCM sealing of contributor batches and model files."""

from __future__ import annotations

import os
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAGIC = b"TLBOX1"


def new_key() -> bytes:
    return AESGCM.generate_key(bit_length=256)


def encrypt_bytes(key: bytes, data: bytes, aad: bytes = b"") -> bytes:
    nonce = os.urandom(12)
    return MAGIC + nonce + AESGCM(key).encrypt(nonce, data, aad)


def decrypt_bytes(key: bytes, blob: bytes, aad: bytes = b"") -> bytes:
    if not blob.startswith(MAGIC):
        raise ValueError("not a TrustLens sealed blob")
    nonce, ct = blob[len(MAGIC):len(MAGIC) + 12], blob[len(MAGIC) + 12:]
    return AESGCM(key).decrypt(nonce, ct, aad)


def encrypt_file(key: bytes, src: str | Path, dst: str | Path, aad: bytes = b"") -> None:
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    Path(dst).write_bytes(encrypt_bytes(key, Path(src).read_bytes(), aad))


def decrypt_file(key: bytes, src: str | Path, aad: bytes = b"") -> bytes:
    return decrypt_bytes(key, Path(src).read_bytes(), aad)
