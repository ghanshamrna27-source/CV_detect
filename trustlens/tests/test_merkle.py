import hashlib

import pytest

from trustlens.provenance.merkle_log import (MerkleLog, audit_path, leaf_hash, mth, node_hash,
                                            verify_inclusion)


def _leaves(n):
    return [leaf_hash(f"entry-{i}".encode()) for i in range(n)]


def test_empty_and_single_roots():
    assert mth([]) == hashlib.sha256(b"").digest()
    one = _leaves(1)
    assert mth(one) == one[0]


def test_known_small_tree_shape():
    a, b, c = _leaves(3)
    # RFC 6962: MTH of 3 leaves = H(1 || H(1||a||b) || c)
    assert mth([a, b, c]) == node_hash(node_hash(a, b), c)


@pytest.mark.parametrize("n", [1, 2, 3, 4, 5, 7, 8, 9, 16, 31])
def test_every_inclusion_proof_verifies(n):
    leaves = _leaves(n)
    root = mth(leaves)
    for m in range(n):
        assert verify_inclusion(leaves[m], m, n, audit_path(m, leaves), root)


def test_changing_any_leaf_breaks_root_and_proofs():
    leaves = _leaves(9)
    root = mth(leaves)
    for m in range(9):
        tampered = list(leaves)
        tampered[m] = leaf_hash(b"evil")
        assert mth(tampered) != root
        assert not verify_inclusion(tampered[m], m, 9, audit_path(m, leaves), root)


def test_wrong_index_or_size_fails():
    leaves = _leaves(6)
    root = mth(leaves)
    proof = audit_path(2, leaves)
    assert not verify_inclusion(leaves[2], 3, 6, proof, root)
    # claiming a bigger tree cannot pass against that tree's real root
    bigger = leaves + [leaf_hash(b"x")]
    assert not verify_inclusion(leaves[2], 2, 7, proof, mth(bigger))
    assert not verify_inclusion(leaves[2], 6, 6, proof, root)


def test_sqlite_log_roundtrip(tmp_path):
    log = MerkleLog(tmp_path / "ledger.db")
    for i in range(11):
        log.append(f"rc-{i}", "receipt", {"i": i})
    assert log.size() == 11
    proof = log.proof_for("rc-7")
    assert MerkleLog.verify_proof(proof, log.root())
    assert not MerkleLog.verify_proof(proof, "00" * 32)
    # root history grows with every append and the old root still proves old entries
    hist = log.root_history()
    assert hist[0]["size"] == 11 and len(hist) == 11
    old = log.inclusion_proof(3, size=5)
    assert old["root"] == [h["root"] for h in hist if h["size"] == 5][0]
    assert MerkleLog.verify_proof(old)
