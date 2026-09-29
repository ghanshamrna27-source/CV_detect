"""Configuration loading and artifact paths.

The active config is `configs/default.yaml`, or `configs/<TRUSTLENS_PROFILE>.yaml` when the
profile variable is set. A config may `extends:` another; values are deep-merged.
"""

from __future__ import annotations

import copy
import os
import random
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import yaml

ROOT = Path(os.environ.get("TRUSTLENS_HOME", Path(__file__).resolve().parents[2]))


def _deep_merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


def _read(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh) or {}
    parent = cfg.pop("extends", None)
    if parent:
        cfg = _deep_merge(_read(path.parent / parent), cfg)
    return cfg


def config_path() -> Path:
    explicit = os.environ.get("TRUSTLENS_CONFIG")
    if explicit:
        return Path(explicit)
    profile = os.environ.get("TRUSTLENS_PROFILE", "default")
    return ROOT / "configs" / f"{profile}.yaml"


@lru_cache(maxsize=4)
def _load(path: str) -> dict:
    return _read(Path(path))


def load_config() -> dict:
    """Return a copy of the active configuration."""
    return copy.deepcopy(_load(str(config_path())))


def config_files() -> list[Path]:
    """The active config file and every file it extends (all feed the TEE measurement)."""
    files, path = [], config_path()
    while path:
        files.append(path)
        with open(path, encoding="utf-8") as fh:
            parent = (yaml.safe_load(fh) or {}).get("extends")
        path = path.parent / parent if parent else None
    return files


def resolve(p: str | Path) -> Path:
    p = Path(p)
    return p if p.is_absolute() else ROOT / p


@dataclass(frozen=True)
class Paths:
    artifacts: Path
    raw: Path
    keys: Path

    @classmethod
    def from_config(cls, cfg: dict | None = None) -> "Paths":
        cfg = cfg or load_config()
        return cls(
            artifacts=resolve(cfg["paths"]["artifacts"]),
            raw=resolve(cfg["paths"]["raw"]),
            keys=resolve(cfg["paths"]["keys"]),
        )

    @property
    def data(self) -> Path:
        return self.artifacts / "data"

    @property
    def models(self) -> Path:
        return self.artifacts / "models"

    @property
    def evidence(self) -> Path:
        return self.artifacts / "evidence"

    @property
    def evidence_img(self) -> Path:
        return self.evidence / "img"

    @property
    def receipts(self) -> Path:
        return self.artifacts / "receipts"

    @property
    def cache(self) -> Path:
        return self.artifacts / "cache"

    @property
    def broker_store(self) -> Path:
        """The key broker's vault of batch/model keys (per deployment, so per artifacts dir)."""
        return self.artifacts / "broker" / "store.json"

    @property
    def ledger(self) -> Path:
        return self.artifacts / "ledger.db"

    def ensure(self) -> "Paths":
        for d in (self.data, self.models, self.evidence, self.evidence_img, self.receipts,
                  self.cache, self.raw, self.keys):
            d.mkdir(parents=True, exist_ok=True)
        return self


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch

        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    except ImportError:
        pass


def get_device(pref: str = "auto"):
    import torch

    if pref == "cpu":
        return torch.device("cpu")
    if pref == "cuda" or (pref == "auto" and torch.cuda.is_available()):
        return torch.device("cuda")
    return torch.device("cpu")
