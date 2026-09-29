import time

from trustlens.tee.attestation_mock import (add_to_allowlist, generate_platform_key, issue_quote,
                                            load_allowlist, load_platform_priv, load_platform_pub,
                                            verify_quote)
from trustlens.tee.key_broker import KeyBroker, KeyStore

M_GOOD = "a" * 64
M_BAD = "b" * 64


def _setup(home):
    allow = home / "configs" / "allowed_measurements.yaml"
    add_to_allowlist(allow, M_GOOD, "test build")
    store = KeyStore(home / "keys" / "broker_store.json")
    store.put("batch:C1", b"k" * 32)
    broker = KeyBroker(store, load_platform_pub(home / "keys"), allow, ttl_s=60)
    return broker, load_platform_priv(home / "keys"), allow


def test_good_quote_verifies(home):
    _, priv, allow = _setup(home)
    q = issue_quote(priv, M_GOOD, "r" * 64, "n1")
    res = verify_quote(q, load_platform_pub(home / "keys"), load_allowlist(allow), expected_nonce="n1",
                       max_age_s=60, expected_report_data="r" * 64)
    assert res.ok, res.reason


def test_rejections(home):
    broker, priv, allow = _setup(home)
    pub, al = load_platform_pub(home / "keys"), load_allowlist(allow)

    wrong_m = issue_quote(priv, M_BAD, "r" * 64, "n")
    assert not verify_quote(wrong_m, pub, al).ok

    dbg = issue_quote(priv, M_GOOD, "r" * 64, "n", debug=True)
    r = verify_quote(dbg, pub, al)
    assert not r.ok and "debug" in r.reason

    stale = issue_quote(priv, M_GOOD, "r" * 64, "n", issued_at=time.time() - 3600)
    assert not verify_quote(stale, pub, al, max_age_s=60).ok

    other_root = home / "otherkeys"
    generate_platform_key(other_root)
    forged = issue_quote(load_platform_priv(other_root), M_GOOD, "r" * 64, "n")
    r = verify_quote(forged, pub, al)
    assert not r.ok and "platform" in r.reason

    tampered = issue_quote(priv, M_GOOD, "r" * 64, "n")
    tampered["measurement"] = M_BAD
    assert not verify_quote(tampered, pub, al).ok

    wrong_key = issue_quote(priv, M_GOOD, "r" * 64, "n")
    assert not verify_quote(wrong_key, pub, al, expected_report_data="x" * 64).ok


def test_key_broker(home):
    broker, priv, _ = _setup(home)
    nonce = broker.challenge()
    keys, check = broker.release(issue_quote(priv, M_GOOD, "r" * 64, nonce))
    assert check.ok and keys == {"batch:C1": b"k" * 32}

    # replaying the same nonce is refused
    keys, check = broker.release(issue_quote(priv, M_GOOD, "r" * 64, nonce))
    assert not check.ok and not keys

    # modified service code (measurement not allowlisted) is refused
    keys, check = broker.release(issue_quote(priv, M_BAD, "r" * 64, broker.challenge()))
    assert not check.ok and not keys and "allowlist" in check.reason

    # a nonce the broker never issued is refused
    keys, check = broker.release(issue_quote(priv, M_GOOD, "r" * 64, "made-up"))
    assert not check.ok and not keys

    # debug enclaves are refused
    keys, check = broker.release(issue_quote(priv, M_GOOD, "r" * 64, broker.challenge(), debug=True))
    assert not check.ok and not keys


def test_measurement_changes_when_code_changes(home):
    from trustlens.tee.measurement import measure

    before = measure()
    assert measure(overrides={"trustlens/api/service.py": b"# edited\n"}) != before
    f = home / "trustlens" / "tee" / "key_broker.py"
    f.write_text(f.read_text(encoding="utf-8") + "\n# one line edited\n", encoding="utf-8")
    assert measure() != before
