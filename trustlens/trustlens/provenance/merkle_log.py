"""Append-only Merkle log in SQLite, hashed as in RFC 6962 / RFC 9162.

leaf = SHA-256(0x00 || data)   node = SHA-256(0x01 || left || right)
Receipts, evidence batches, audit reports and key-broker decisions are all logged.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
from pathlib import Path

from trustlens.common.hashing import canonical_json
from trustlens.common.schema import utc_now

EMPTY_ROOT = hashlib.sha256(b"").hexdigest()


def leaf_hash(data: bytes) -> bytes:
    return hashlib.sha256(b"\x00" + data).digest()


def node_hash(left: bytes, right: bytes) -> bytes:
    return hashlib.sha256(b"\x01" + left + right).digest()


def _split(n: int) -> int:
    """Largest power of two strictly less than n."""
    k = 1
    while k << 1 < n:
        k <<= 1
    return k


def mth(leaves: list[bytes]) -> bytes:
    """Merkle Tree Hash of a list of leaf hashes."""
    n = len(leaves)
    if n == 0:
        return hashlib.sha256(b"").digest()
    if n == 1:
        return leaves[0]
    k = _split(n)
    return node_hash(mth(leaves[:k]), mth(leaves[k:]))


def audit_path(m: int, leaves: list[bytes]) -> list[bytes]:
    """RFC 6962 PATH(m, D[n])."""
    n = len(leaves)
    if n <= 1:
        return []
    k = _split(n)
    if m < k:
        return audit_path(m, leaves[:k]) + [mth(leaves[k:])]
    return audit_path(m - k, leaves[k:]) + [mth(leaves[:k])]


def verify_inclusion(leaf: bytes, index: int, size: int, proof: list[bytes], root: bytes) -> bool:
    """RFC 9162 section 2.1.3.2."""
    if index >= size or index < 0:
        return False
    fn, sn, r = index, size - 1, leaf
    for p in proof:
        if sn == 0:
            return False
        if fn & 1 or fn == sn:
            r = node_hash(p, r)
            if not fn & 1:
                while not fn & 1 and fn != 0:
                    fn >>= 1
                    sn >>= 1
        else:
            r = node_hash(r, p)
        fn >>= 1
        sn >>= 1
    return sn == 0 and r == root


class MerkleLog:
    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        with self._conn() as con:
            con.execute("""CREATE TABLE IF NOT EXISTS leaves (
                idx INTEGER PRIMARY KEY, receipt_id TEXT UNIQUE, kind TEXT,
                leaf_hash TEXT, payload TEXT, created_at TEXT)""")
            con.execute("""CREATE TABLE IF NOT EXISTS roots (
                size INTEGER PRIMARY KEY, root TEXT, created_at TEXT)""")

    def _conn(self):
        return sqlite3.connect(self.db_path, timeout=30)

    # -------------------------------------------------------------- writes
    def append(self, entry_id: str, kind: str, payload: dict) -> int:
        data = canonical_json(payload)
        lh = leaf_hash(data).hex()
        with self._lock, self._conn() as con:
            cur = con.execute("SELECT COALESCE(MAX(idx), -1) + 1 FROM leaves")
            idx = cur.fetchone()[0]
            con.execute("INSERT INTO leaves VALUES (?,?,?,?,?,?)",
                        (idx, entry_id, kind, lh, data.decode("utf-8"), utc_now()))
            leaves = [bytes.fromhex(r[0]) for r in con.execute("SELECT leaf_hash FROM leaves ORDER BY idx")]
            con.execute("INSERT OR REPLACE INTO roots VALUES (?,?,?)", (len(leaves), mth(leaves).hex(), utc_now()))
        return idx

    # -------------------------------------------------------------- reads
    def _leaves(self, size: int | None = None) -> list[bytes]:
        with self._conn() as con:
            rows = con.execute("SELECT leaf_hash FROM leaves ORDER BY idx").fetchall()
        leaves = [bytes.fromhex(r[0]) for r in rows]
        return leaves if size is None else leaves[:size]

    def size(self) -> int:
        with self._conn() as con:
            return con.execute("SELECT COUNT(*) FROM leaves").fetchone()[0]

    def root(self, size: int | None = None) -> str:
        return mth(self._leaves(size)).hex()

    def get(self, entry_id: str) -> dict | None:
        with self._conn() as con:
            row = con.execute("SELECT idx, receipt_id, kind, leaf_hash, payload, created_at FROM leaves "
                              "WHERE receipt_id = ?", (entry_id,)).fetchone()
        if not row:
            return None
        return {"idx": row[0], "id": row[1], "kind": row[2], "leaf_hash": row[3],
                "payload": json.loads(row[4]), "created_at": row[5]}

    def entries(self, limit: int = 100, kind: str | None = None) -> list[dict]:
        q = "SELECT idx, receipt_id, kind, leaf_hash, payload, created_at FROM leaves"
        args: tuple = ()
        if kind:
            q += " WHERE kind = ?"
            args = (kind,)
        q += " ORDER BY idx DESC LIMIT ?"
        with self._conn() as con:
            rows = con.execute(q, args + (limit,)).fetchall()
        return [{"idx": r[0], "id": r[1], "kind": r[2], "leaf_hash": r[3], "payload": json.loads(r[4]),
                 "created_at": r[5]} for r in rows]

    def root_history(self, limit: int = 50) -> list[dict]:
        with self._conn() as con:
            rows = con.execute("SELECT size, root, created_at FROM roots ORDER BY size DESC LIMIT ?",
                               (limit,)).fetchall()
        return [{"size": r[0], "root": r[1], "created_at": r[2]} for r in rows]

    def inclusion_proof(self, idx: int, size: int | None = None) -> dict:
        leaves = self._leaves(size)
        n = len(leaves)
        if not 0 <= idx < n:
            raise IndexError(f"leaf {idx} not in tree of size {n}")
        return {"index": idx, "tree_size": n, "leaf_hash": leaves[idx].hex(),
                "proof": [p.hex() for p in audit_path(idx, leaves)], "root": mth(leaves).hex()}

    def proof_for(self, entry_id: str) -> dict | None:
        e = self.get(entry_id)
        return None if e is None else self.inclusion_proof(e["idx"])

    @staticmethod
    def verify_proof(proof: dict, root_hex: str | None = None) -> bool:
        return verify_inclusion(bytes.fromhex(proof["leaf_hash"]), proof["index"], proof["tree_size"],
                                [bytes.fromhex(p) for p in proof["proof"]],
                                bytes.fromhex(root_hex or proof["root"]))
