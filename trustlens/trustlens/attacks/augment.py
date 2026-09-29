"""Near-copy augmentation used by the flooding attacker (C5)."""

from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageEnhance


def near_copy(img: np.ndarray, rng: np.random.Generator, jpeg_quality: int = 60) -> np.ndarray:
    """Flip, crop +-4 px, colour jitter and JPEG re-encode one HWC uint8 image."""
    h, w = img.shape[:2]
    out = img
    if rng.random() < 0.5:
        out = out[:, ::-1]
    padded = np.pad(out, ((4, 4), (4, 4), (0, 0)), mode="reflect")
    dy, dx = rng.integers(0, 9, size=2)
    out = padded[dy:dy + h, dx:dx + w]
    pil = Image.fromarray(np.ascontiguousarray(out))
    pil = ImageEnhance.Brightness(pil).enhance(rng.uniform(0.85, 1.15))
    pil = ImageEnhance.Contrast(pil).enhance(rng.uniform(0.85, 1.15))
    pil = ImageEnhance.Color(pil).enhance(rng.uniform(0.8, 1.2))
    buf = io.BytesIO()
    pil.save(buf, format="JPEG", quality=jpeg_quality)
    buf.seek(0)
    return np.asarray(Image.open(buf).convert("RGB"), dtype=np.uint8)
