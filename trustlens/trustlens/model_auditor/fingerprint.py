"""Black-box probe fingerprint (plan section 5.4, step 2).

A fixed probe set of held-out images; compare the supplied model's outputs with the reference
model's recorded fingerprint. Top-1 agreement below the threshold counts as behavioural drift.
Only `predict_proba` is used, so this works on a remote API too.
"""

from __future__ import annotations

import numpy as np

from trustlens.common.adapters import ModelAdapter
from trustlens.common.hashing import sha256_bytes
from trustlens.common.io import load_npz, save_npz


def probe_set(paths, size: int) -> np.ndarray:
    return load_npz(paths.data / "heldout.npz")["x"][:size]


def record_reference(paths, model: ModelAdapter, size: int) -> dict:
    x = probe_set(paths, size)
    probs = model.predict_proba(x)
    probe_hash = sha256_bytes(x.tobytes())
    save_npz(paths.models / "reference_fingerprint.npz", probs=probs.astype(np.float32),
             probe_sha256=np.array(probe_hash))
    return {"probe_size": len(x), "probe_sha256": probe_hash}


def compare(paths, model: ModelAdapter, size: int) -> dict:
    ref = load_npz(paths.models / "reference_fingerprint.npz")
    x = probe_set(paths, size)
    if sha256_bytes(x.tobytes()) != str(ref["probe_sha256"]):
        raise ValueError("probe set changed since the reference fingerprint was recorded")
    p = np.clip(model.predict_proba(x), 1e-8, 1)
    q = np.clip(ref["probs"], 1e-8, 1)
    agreement = float((p.argmax(1) == q.argmax(1)).mean())
    kl = float(np.mean(np.sum(q * (np.log(q) - np.log(p)), axis=1)))  # KL(reference || supplied)
    return {"agreement": agreement, "kl": kl, "probe_size": len(x)}
