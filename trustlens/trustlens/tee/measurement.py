"""Mock MRENCLAVE: SHA-256 over the service's code and config (plan section 5.7).

Edit one line of any measured file and the measurement changes, so the key broker refuses keys.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from trustlens.common import config
from trustlens.common.config import config_files, load_config


def measured_files(cfg: dict | None = None) -> list[Path]:
    cfg = cfg or load_config()
    files: set[Path] = set()
    for entry in cfg["tee"]["measured"]:
        p = config.ROOT / entry
        if p.is_dir():
            files.update(f for f in p.rglob("*.py") if "__pycache__" not in f.parts)
        elif p.is_file():
            files.add(p)
    files.update(config_files())
    return sorted(files, key=lambda f: f.relative_to(config.ROOT).as_posix())


def measure(cfg: dict | None = None, overrides: dict[str, bytes] | None = None) -> str:
    """Hash (relative path, file bytes) of every measured file.

    `overrides` maps a relative path to replacement bytes; the dashboard uses it to show what an
    edited service would measure without touching the file on disk.
    """
    overrides = overrides or {}
    h = hashlib.sha256()
    for f in measured_files(cfg):
        rel = f.relative_to(config.ROOT).as_posix()
        data = overrides.get(rel, f.read_bytes())
        # normalise line endings so a git checkout on Windows measures the same as on Linux
        data = data.replace(b"\r\n", b"\n")
        h.update(rel.encode() + b"\0" + hashlib.sha256(data).digest())
    return h.hexdigest()
