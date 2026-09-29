"""Evidence record: the one shape every finding from every module uses (plan section 4.1)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from trustlens.common.hashing import sha256_json

SubjectType = Literal["sample", "contributor", "model", "receipt", "dataset"]
Confidence = Literal["high", "medium", "low"]
AccessLevel = Literal["white-box", "grey-box", "black-box", "n/a"]


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class EvidenceRecord(BaseModel):
    evidence_id: str
    module: str
    subject_type: SubjectType
    subject_id: str
    contributor: str | None = None
    check: str
    score: float | None = None
    threshold: float | None = None
    flagged: bool
    confidence: Confidence = "medium"
    method: str
    access_level: AccessLevel = "n/a"
    artefacts: list[str] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=utc_now)
    sha256: str = ""

    def sealed(self) -> "EvidenceRecord":
        """Return a copy whose `sha256` is the hash of the record without that field."""
        body = self.model_dump(exclude={"sha256"})
        return self.model_copy(update={"sha256": sha256_json(body)})

    def verify_seal(self) -> bool:
        return self.sha256 == sha256_json(self.model_dump(exclude={"sha256"}))


def _clean(v):
    """Make numpy scalars JSON/pydantic friendly."""
    if hasattr(v, "item") and callable(v.item):
        return v.item()
    if isinstance(v, dict):
        return {k: _clean(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_clean(x) for x in v]
    return v


class EvidenceWriter:
    """Appends sealed evidence records to a JSONL file.

    Evidence ids are `ev-<prefix>-<n>` so ids from different modules never collide.
    """

    def __init__(self, path: str | Path, module: str, prefix: str, mode: str = "w"):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.module = module
        self.prefix = prefix
        self._fh = open(self.path, mode, encoding="utf-8")
        self._n = 0
        self.records: list[EvidenceRecord] = []

    def add(self, *, module: str | None = None, **fields) -> EvidenceRecord:
        self._n += 1
        fields = {k: _clean(v) for k, v in fields.items()}
        rec = EvidenceRecord(
            evidence_id=f"ev-{self.prefix}-{self._n:06d}", module=module or self.module, **fields
        ).sealed()
        self._fh.write(rec.model_dump_json() + "\n")
        self.records.append(rec)
        return rec

    def close(self) -> None:
        self._fh.close()

    def __enter__(self) -> "EvidenceWriter":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


def read_evidence(path: str | Path) -> list[EvidenceRecord]:
    path = Path(path)
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as fh:
        return [EvidenceRecord(**json.loads(line)) for line in fh if line.strip()]
