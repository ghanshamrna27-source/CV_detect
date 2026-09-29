"""Hashing helpers shared by every module. SHA-256 everywhere (never MD5)."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


def canonical_json(obj) -> bytes:
    """Canonical JSON: sorted keys, no whitespace, UTF-8."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_json(obj) -> str:
    return sha256_bytes(canonical_json(obj))


def sha256_file(path: str | Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        while block := fh.read(chunk):
            h.update(block)
    return h.hexdigest()


def model_manifest(model_dir: str | Path) -> list[dict]:
    """(path, sha256) for every file of a model directory, sorted by path."""
    model_dir = Path(model_dir)
    files = sorted(p for p in model_dir.rglob("*") if p.is_file())
    return [{"path": p.relative_to(model_dir).as_posix(), "sha256": sha256_file(p)} for p in files]


def model_manifest_sha256(model_dir: str | Path) -> str:
    """Digest of the model manifest; the `model_manifest_sha256` field of every receipt."""
    return sha256_json(model_manifest(model_dir))
