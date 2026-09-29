"""File-contract helpers: arrays, JSON, image grids and a kNN search used by several scanners."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw


# ---------------------------------------------------------------- arrays / json

def save_npz(path: str | Path, **arrays) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(path, **arrays)


def load_npz(path: str | Path) -> dict[str, np.ndarray]:
    with np.load(path, allow_pickle=False) as z:
        return {k: z[k] for k in z.files}


def write_json(path: str | Path, obj, indent: int = 2) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=indent, default=_json_default)


def read_json(path: str | Path, default=None):
    path = Path(path)
    if not path.exists():
        return default
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _json_default(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    if isinstance(o, Path):
        return o.as_posix()
    raise TypeError(f"not JSON serialisable: {type(o)}")


def load_pool(paths) -> dict[str, np.ndarray]:
    """The contributed training pool: x (N,32,32,3) uint8, y, contributor, sample_id."""
    return load_npz(paths.data / "pool.npz")


def load_manifest(paths) -> pd.DataFrame:
    return pd.read_parquet(paths.data / "manifest.parquet")


def scores_path(paths, name: str) -> Path:
    return paths.evidence / f"scores_{name}.parquet"


def load_scores(paths) -> pd.DataFrame:
    """Merge every per-sample score table the scanners wrote, keyed by sample_id."""
    df = load_manifest(paths)[["sample_id", "contributor", "label"]]
    for part in ("dup", "ood", "labels", "poison", "trace"):
        p = scores_path(paths, part)
        if p.exists():
            df = df.merge(pd.read_parquet(p), on="sample_id", how="left")
    return df


def rel(path: str | Path, root: Path) -> str:
    try:
        return Path(path).resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return Path(path).as_posix()


# ---------------------------------------------------------------- images

def to_pil(img: np.ndarray, scale: int = 1) -> Image.Image:
    im = Image.fromarray(np.asarray(img, dtype=np.uint8))
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    return im


def image_grid(images: list[np.ndarray], captions: list[str] | None = None, cols: int = 8,
               scale: int = 3, pad: int = 4, caption_h: int = 12) -> Image.Image:
    """Tile HWC uint8 images into one PNG with optional captions below each tile."""
    if not images:
        return Image.new("RGB", (64, 32), "white")
    tiles = [to_pil(im, scale) for im in images]
    w, h = tiles[0].size
    ch = caption_h if captions else 0
    rows = (len(tiles) + cols - 1) // cols
    ncols = min(cols, len(tiles))
    grid = Image.new("RGB", (ncols * (w + pad) + pad, rows * (h + ch + pad) + pad), "white")
    draw = ImageDraw.Draw(grid)
    for i, tile in enumerate(tiles):
        r, c = divmod(i, cols)
        x, y = pad + c * (w + pad), pad + r * (h + ch + pad)
        grid.paste(tile, (x, y))
        if captions:
            draw.text((x, y + h), str(captions[i])[: max(4, w // 6)], fill=(20, 20, 20))
    return grid


def save_grid(path: str | Path, images, captions=None, **kw) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    image_grid(list(images), captions, **kw).save(path)
    return path


# ---------------------------------------------------------------- nearest neighbours

def knn(query: np.ndarray, base: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
    """Inner-product kNN (cosine for L2-normalised rows). FAISS when available, else blocked numpy."""
    query = np.ascontiguousarray(query, dtype=np.float32)
    base = np.ascontiguousarray(base, dtype=np.float32)
    k = min(k, len(base))
    try:
        import faiss

        index = faiss.IndexFlatIP(base.shape[1])
        index.add(base)
        return index.search(query, k)
    except ImportError:
        sims = np.empty((len(query), k), np.float32)
        idx = np.empty((len(query), k), np.int64)
        for s in range(0, len(query), 2048):
            block = query[s:s + 2048] @ base.T
            part = np.argpartition(-block, k - 1, axis=1)[:, :k]
            vals = np.take_along_axis(block, part, 1)
            order = np.argsort(-vals, axis=1)
            idx[s:s + 2048] = np.take_along_axis(part, order, 1)
            sims[s:s + 2048] = np.take_along_axis(vals, order, 1)
        return sims, idx
