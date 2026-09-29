"""Near-duplicate detection: CLIP kNN proposes candidate pairs, pixel alignment confirms them.

CLIP on upscaled 32x32 images alone is a weak copy detector (unrelated CIFAR neighbours reach
cosine 0.95), so each FAISS kNN pair is confirmed by an *aligned correlation*: normalised
cross-correlation of blurred 16x16 grayscale images, maximised over horizontal flip and +-2 px
shifts (= +-4 px at full size). That is invariant to exactly the edits a flooder uses (flip,
crop, colour jitter, JPEG). A pair is a near-duplicate if aligned correlation >= `aligned_ncc` and
CLIP cosine >= `cosine`; clusters are connected components. `dup_rate` counts samples in
clusters of size >= `min_cluster`. The pHash distance to the nearest neighbour is reported too.
"""

from __future__ import annotations

import imagehash
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from PIL import Image
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

from trustlens.common.io import knn

SHIFT = 2  # at 16x16


def phashes(x: np.ndarray) -> np.ndarray:
    out = np.empty(len(x), dtype=np.uint64)
    for i, img in enumerate(x):
        out[i] = np.uint64(int(str(imagehash.phash(Image.fromarray(img))), 16))
    return out


def hamming(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    v = np.bitwise_xor(a, b)
    return np.unpackbits(v.view(np.uint8).reshape(-1, 8), axis=1).sum(1)


def _norm(a: torch.Tensor) -> torch.Tensor:
    a = a - a.mean((-1, -2), keepdim=True)
    return a / (a.norm(dim=(-1, -2), keepdim=True) + 1e-6)


def _small(x: np.ndarray, device) -> torch.Tensor:
    """Blurred 16x16 grayscale versions of uint8 NHWC images, (N, 16, 16) on `device`."""
    k = torch.tensor([1, 4, 6, 4, 1.0], device=device)
    k = (k[:, None] * k[None, :] / 256).view(1, 1, 5, 5)
    w = torch.tensor([0.299, 0.587, 0.114], device=device).view(1, 3, 1, 1)
    out = []
    for s in range(0, len(x), 8192):
        X = torch.from_numpy(np.ascontiguousarray(x[s:s + 8192])).to(device).permute(0, 3, 1, 2).float() / 255
        gray = (X * w).sum(1, keepdim=True)
        out.append(F.avg_pool2d(F.conv2d(F.pad(gray, (2, 2, 2, 2), mode="reflect"), k), 2)[:, 0])
    return torch.cat(out)


def _centre(small: torch.Tensor) -> torch.Tensor:
    size = 16 - 2 * SHIFT
    return _norm(small[:, SHIFT:SHIFT + size, SHIFT:SHIFT + size])


def _windows(small: torch.Tensor) -> torch.Tensor:
    """Every flipped / shifted 12x12 window, normalised: (B, 50, 12, 12)."""
    size = 16 - 2 * SHIFT
    return torch.stack([_norm((small.flip(-1) if flip else small)[:, dy:dy + size, dx:dx + size])
                        for flip in (False, True) for dy in range(2 * SHIFT + 1)
                        for dx in range(2 * SHIFT + 1)], 1)


def aligned_ncc(x: np.ndarray, pairs_i: np.ndarray, pairs_j: np.ndarray, device=None,
                x_other: np.ndarray | None = None, batch: int = 4096) -> np.ndarray:
    """Aligned correlation between x[pairs_i] and (x_other or x)[pairs_j].

    Windows are built per batch of pairs, so memory stays ~100 MB even for 50k images.
    """
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    small_a = _small(x, device)
    small_b = small_a if x_other is None else _small(x_other, device)
    out = np.empty(len(pairs_i), np.float32)
    pi, pj = torch.from_numpy(pairs_i).to(device), torch.from_numpy(pairs_j).to(device)
    with torch.no_grad():
        for s in range(0, len(pairs_i), batch):
            a = _centre(small_a[pi[s:s + batch]])
            b = _windows(small_b[pj[s:s + batch]])
            out[s:s + batch] = (a[:, None] * b).sum((-1, -2)).amax(-1).cpu().numpy()
    return out


def detect(emb: np.ndarray, x: np.ndarray, sample_ids: np.ndarray, dc: dict, device=None) -> pd.DataFrame:
    n = len(emb)
    sims, idx = knn(emb, emb, dc["k"] + 1)
    rows = np.repeat(np.arange(n), idx.shape[1])
    cols = idx.reshape(-1)
    cos = sims.reshape(-1)
    valid = (cols != rows) & (cols >= 0)
    rows, cols, cos = rows[valid], cols[valid], cos[valid]
    ncc = aligned_ncc(x, rows, cols, device)
    edge = (ncc >= dc["aligned_ncc"]) & (cos >= dc["cosine"])

    graph = coo_matrix((np.ones(edge.sum()), (rows[edge], cols[edge])), shape=(n, n))
    _, labels = connected_components(graph, directed=False)
    csize = np.bincount(labels)[labels]
    in_dup = csize >= dc["min_cluster"]
    cluster = np.where(csize > 1, labels, -1)

    # strongest confirmed-looking neighbour for every sample (max aligned correlation among its kNN)
    best = pd.DataFrame({"r": rows, "c": cols, "ncc": ncc, "cos": cos}).sort_values("ncc", ascending=False)
    best = best.drop_duplicates("r").set_index("r").reindex(np.arange(n))
    nn = best["c"].fillna(0).astype(int).to_numpy()
    ph = phashes(x)
    return pd.DataFrame({
        "sample_id": sample_ids,
        "dup_cluster": cluster.astype(np.int64),
        "dup_cluster_size": np.where(csize > 1, csize, 1).astype(np.int64),
        "in_dup": in_dup,
        "nn_id": sample_ids[nn],
        "nn_cos": best["cos"].fillna(0).to_numpy(np.float32),
        "nn_aligned_ncc": best["ncc"].fillna(0).to_numpy(np.float32),
        "nn_phash_dist": hamming(ph, ph[nn]).astype(np.int64),
    })


def calibrate(emb_orig: np.ndarray, emb_aug: np.ndarray, x_orig: np.ndarray, x_aug: np.ndarray) -> dict:
    """Scores between known augmented pairs (the 'tune on a known augmented pair set' step)."""
    cos = np.sum(emb_orig * emb_aug, axis=1)
    ar = np.arange(len(x_orig))
    ncc = aligned_ncc(x_orig, ar, ar, x_other=x_aug)
    return {"pairs": int(len(cos)), "cosine_p5": float(np.percentile(cos, 5)),
            "cosine_median": float(np.median(cos)), "aligned_ncc_p5": float(np.percentile(ncc, 5)),
            "aligned_ncc_median": float(np.median(ncc))}
