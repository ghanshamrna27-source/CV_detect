"""Split CIFAR-10 across 5 simulated contributors and apply the attacks (plan section 5.1).

C1, C2 clean · C3 BadNets backdoor · C4 cat<->dog label flips · C5 near-duplicate flooding + OOD.

Outputs (under artifacts/data/):
  C1..C5/img_XXXXX.png     every contributed image
  manifest.parquet         sample_id, contributor, path, label, orig_label, sha256, gt_attack
  pool.npz                 the same pool as arrays (fast path for the scanners)
  clean.npz                the original clean images of the pool (reference-model training set)
  heldout.npz              defender-owned clean held-out images (probe set, Neural Cleanse, trace)
  evalset.npz              evaluation images (clean accuracy / attack success rate)
  encrypted/C*.bin         AES-256-GCM sealed batches; keys go to the key broker
`gt_attack` is ground truth for scripts/eval.py only and is never read by a detector.
"""

from __future__ import annotations

import io

import numpy as np
import pandas as pd
from PIL import Image

from trustlens.attacks.augment import near_copy
from trustlens.attacks.badnets import stamp
from trustlens.common.config import ROOT, Paths, load_config, seed_everything
from trustlens.common.hashing import sha256_bytes
from trustlens.common.io import rel, save_npz, write_json
from trustlens.tee import crypto_box
from trustlens.tee.key_broker import KeyStore


HF_BASE = "https://huggingface.co/datasets/uoft-cs"
HF_FILES = {
    "cifar10_train.parquet": "cifar10/resolve/main/plain_text/train-00000-of-00001.parquet",
    "cifar10_test.parquet": "cifar10/resolve/main/plain_text/test-00000-of-00001.parquet",
    "cifar100_train.parquet": "cifar100/resolve/main/cifar100/train-00000-of-00001.parquet",
}


def _download(url: str, dst, retries: int = 20) -> None:
    """Resumable download (the original CIFAR host is slow and drops connections)."""
    import time
    import urllib.request

    part = dst.with_suffix(dst.suffix + ".part")
    for attempt in range(retries):
        try:
            have = part.stat().st_size if part.exists() else 0
            req = urllib.request.Request(url, headers={"Range": f"bytes={have}-"} if have else {})
            with urllib.request.urlopen(req, timeout=60) as resp, open(part, "ab" if have else "wb") as fh:
                while chunk := resp.read(1 << 20):
                    fh.write(chunk)
            part.rename(dst)
            return
        except OSError:
            time.sleep(min(30, 2 ** attempt))
    raise RuntimeError(f"could not download {url}")


def _parquet_arrays(path, label_col: str) -> tuple[np.ndarray, np.ndarray, list[str] | None]:
    import json as _json

    import pyarrow.parquet as pq

    table = pq.read_table(path)
    imgs = table.column("img").to_pylist()
    x = np.stack([np.asarray(Image.open(io.BytesIO(d["bytes"])).convert("RGB"), np.uint8) for d in imgs])
    y = np.asarray(table.column(label_col).to_pylist(), np.int64)
    names = None
    meta = (table.schema.metadata or {}).get(b"huggingface")
    if meta:  # HF embeds the ClassLabel names in the parquet schema
        feat = _json.loads(meta)["info"]["features"].get(label_col, {})
        names = feat.get("names")
    return x, y, names


class _C100:
    """The CIFAR-100 fields the flooding attacker needs, from either source."""

    def __init__(self, data, targets, classes):
        self.data, self.targets, self.classes = data, targets, classes
        self.class_to_idx = {c: i for i, c in enumerate(classes)}


def _load_cifar(raw):
    """CIFAR-10 train/test and CIFAR-100 train. HuggingFace parquet mirror first, torchvision fallback."""
    hf = raw / "hf"
    try:
        hf.mkdir(parents=True, exist_ok=True)
        for name, path in HF_FILES.items():
            if not (hf / name).exists():
                _download(f"{HF_BASE}/{path}", hf / name)
        x_tr, y_tr, _ = _parquet_arrays(hf / "cifar10_train.parquet", "label")
        x_te, y_te, _ = _parquet_arrays(hf / "cifar10_test.parquet", "label")
        x100, y100, names100 = _parquet_arrays(hf / "cifar100_train.parquet", "fine_label")
        if not names100:
            raise ValueError("CIFAR-100 class names missing from parquet metadata")
        return x_tr, y_tr, x_te, y_te, _C100(x100, y100, names100)
    except (OSError, RuntimeError, ValueError, KeyError) as exc:
        print(f"  HuggingFace mirror unavailable ({exc}); using torchvision")
    from torchvision.datasets import CIFAR10, CIFAR100

    train = CIFAR10(raw, train=True, download=True)
    test = CIFAR10(raw, train=False, download=True)
    c100 = CIFAR100(raw, train=True, download=True)
    return (np.asarray(train.data), np.asarray(train.targets), np.asarray(test.data),
            np.asarray(test.targets), _C100(np.asarray(c100.data), np.asarray(c100.targets), c100.classes))


def _stratified_split(y: np.ndarray, contributors: list[str], per_contributor: int, k: int,
                      rng) -> dict[str, np.ndarray]:
    per_class = per_contributor // k
    out = {c: [] for c in contributors}
    for cls in range(k):
        idx = rng.permutation(np.flatnonzero(y == cls))
        for j, c in enumerate(contributors):
            out[c].extend(idx[j * per_class:(j + 1) * per_class])
    return {c: rng.permutation(np.array(v)) for c, v in out.items()}


def build(cfg: dict | None = None) -> pd.DataFrame:
    cfg = cfg or load_config()
    paths = Paths.from_config(cfg).ensure()
    seed_everything(cfg["seed"])
    rng = np.random.default_rng(cfg["seed"])
    ds = cfg["dataset"]
    k = ds["num_classes"]
    contributors = ds["contributors"]

    x_train, y_train, x_test, y_test, c100 = _load_cifar(paths.raw)
    split = _stratified_split(y_train, contributors, ds["per_contributor"], k, rng)

    records = []  # dicts: contributor, x, label, orig_label, gt_attack
    for c in contributors:
        idx = split[c]
        xs, ys = x_train[idx].copy(), y_train[idx].copy()
        orig = ys.copy()
        gt = np.array(["none"] * len(idx), dtype=object)
        spec = cfg["attacks"].get(c)

        if spec and spec["type"] == "badnets":
            n = int(round(spec["rate"] * len(idx)))
            cand = np.flatnonzero(ys != spec["target"])
            chosen = rng.choice(cand, n, replace=False)
            xs[chosen] = stamp(xs[chosen], spec["patch_size"], spec["patch_value"])
            ys[chosen] = spec["target"]
            gt[chosen] = "badnets"

        elif spec and spec["type"] == "flip":
            a, b = spec["classes"]
            for src, dst in ((a, b), (b, a)):
                cand = np.flatnonzero(orig == src)
                chosen = rng.choice(cand, int(round(spec["rate"] * len(cand))), replace=False)
                ys[chosen] = dst
                gt[chosen] = "flip"

        elif spec and spec["type"] == "flood_ood":
            n_base = int(round(spec["dup_base_frac"] * len(idx)))
            n_copies = n_base * spec["copies"]
            n_ood = int(round(spec["ood_frac"] * len(idx)))
            order = rng.permutation(len(idx))
            base = order[:n_base]
            dropped = order[n_base:n_base + n_copies + n_ood]
            keep = np.setdiff1d(np.arange(len(idx)), dropped)

            copies_x, copies_y = [], []
            for b in base:
                for _ in range(spec["copies"]):
                    copies_x.append(near_copy(xs[b], rng, spec["jpeg_quality"]))
                    copies_y.append(ys[b])
            gt[base] = "dup_source"

            wanted = [c100.class_to_idx[name] for name in spec["ood_classes"]]
            c100_y = np.asarray(c100.targets)
            ood_pool = np.flatnonzero(np.isin(c100_y, wanted))
            ood_idx = rng.choice(ood_pool, n_ood, replace=False)
            ood_x = np.asarray(c100.data)[ood_idx]
            ood_y = rng.integers(0, k, n_ood)

            xs = np.concatenate([xs[keep], np.stack(copies_x), ood_x])
            ys = np.concatenate([ys[keep], np.array(copies_y), ood_y])
            orig = np.concatenate([orig[keep], np.array(copies_y), np.full(n_ood, -1)])
            gt = np.concatenate([gt[keep], np.array(["dup"] * n_copies, dtype=object),
                                 np.array(["ood"] * n_ood, dtype=object)])

        perm = rng.permutation(len(xs))
        for j in perm:
            records.append({"contributor": c, "x": xs[j], "label": int(ys[j]),
                            "orig_label": int(orig[j]), "gt_attack": gt[j]})

    # ---- write images + manifest
    rows = []
    counters = {c: 0 for c in contributors}
    for r in records:
        c = r["contributor"]
        i = counters[c]
        counters[c] += 1
        rel_path = f"{c}/img_{i:05d}.png"
        buf = io.BytesIO()
        Image.fromarray(r["x"]).save(buf, format="PNG")
        data = buf.getvalue()
        out = paths.data / rel_path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(data)
        rows.append({"sample_id": f"{c}/img_{i:05d}", "contributor": c,
                     "path": rel(out, ROOT), "label": r["label"],
                     "orig_label": r["orig_label"], "sha256": sha256_bytes(data),
                     "gt_attack": r["gt_attack"]})
    manifest = pd.DataFrame(rows)
    manifest.to_parquet(paths.data / "manifest.parquet", index=False)

    x_pool = np.stack([r["x"] for r in records])
    y_pool = manifest["label"].to_numpy(np.int64)
    save_npz(paths.data / "pool.npz", x=x_pool, y=y_pool,
             contributor=manifest["contributor"].to_numpy(str),
             sample_id=manifest["sample_id"].to_numpy(str))

    clean_idx = np.concatenate([split[c] for c in contributors])
    save_npz(paths.data / "clean.npz", x=x_train[clean_idx], y=y_train[clean_idx])

    test_perm = rng.permutation(len(y_test))
    h = ds["heldout_defender"]
    save_npz(paths.data / "heldout.npz", x=x_test[test_perm[:h]], y=y_test[test_perm[:h]])
    save_npz(paths.data / "evalset.npz", x=x_test[test_perm[h:]], y=y_test[test_perm[h:]])

    # ---- seal each contributor batch; the key broker holds the keys
    store = KeyStore(paths.broker_store)
    batch_index = {}
    for c in contributors:
        sel = (manifest["contributor"] == c).to_numpy()
        buf = io.BytesIO()
        np.savez(buf, x=x_pool[sel], y=y_pool[sel], sample_id=manifest.loc[sel, "sample_id"].to_numpy(str))
        key = crypto_box.new_key()
        blob = crypto_box.encrypt_bytes(key, buf.getvalue(), aad=c.encode())
        out = paths.data / "encrypted" / f"{c}.bin"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(blob)
        store.put(f"batch:{c}", key)
        batch_index[c] = {"file": rel(out, ROOT), "sha256": sha256_bytes(blob),
                          "plaintext_sha256": sha256_bytes(buf.getvalue()), "n": int(sel.sum())}
    write_json(paths.data / "batches.json", batch_index)

    summary = manifest.groupby(["contributor", "gt_attack"]).size().unstack(fill_value=0)
    write_json(paths.data / "summary.json", summary.to_dict(orient="index"))
    return manifest


if __name__ == "__main__":
    m = build()
    print(m.groupby(["contributor", "gt_attack"]).size())
