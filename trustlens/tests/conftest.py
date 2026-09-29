"""Tests run against a throwaway project home so they never touch real artifacts or keys."""

import shutil
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))


@pytest.fixture()
def home(tmp_path, monkeypatch):
    """A temp TRUSTLENS_HOME with the real code and config, plus fresh dev keys."""
    shutil.copytree(REPO / "configs", tmp_path / "configs")
    shutil.copytree(REPO / "trustlens", tmp_path / "trustlens",
                    ignore=shutil.ignore_patterns("__pycache__"))
    monkeypatch.setenv("TRUSTLENS_HOME", str(tmp_path))
    monkeypatch.delenv("TRUSTLENS_PROFILE", raising=False)
    import trustlens.common.config as config

    monkeypatch.setattr(config, "ROOT", tmp_path)
    config._load.cache_clear()
    from trustlens.tee.attestation_mock import generate_platform_key

    generate_platform_key(tmp_path / "keys")
    (tmp_path / "configs" / "allowed_measurements.yaml").unlink(missing_ok=True)
    yield tmp_path
    config._load.cache_clear()
