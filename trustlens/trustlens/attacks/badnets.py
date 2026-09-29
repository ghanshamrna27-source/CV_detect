"""BadNets trigger: a white square in the bottom-right corner.

Logic follows BackdoorBench `resource/badnet/generate_white_square.py` and `attack/badnet.py`
(CC BY-NC 4.0, see THIRD_PARTY.md).
"""

from __future__ import annotations

import numpy as np


def trigger_mask(h: int = 32, w: int = 32, size: int = 3) -> np.ndarray:
    """Binary HxW mask of the patch location."""
    m = np.zeros((h, w), np.float32)
    m[h - size:, w - size:] = 1.0
    return m


def trigger_image(h: int = 32, w: int = 32, size: int = 3, value: int = 255) -> np.ndarray:
    """HWC uint8 image that is black except the white patch (the BackdoorBench trigger file)."""
    img = np.zeros((h, w, 3), np.uint8)
    img[h - size:, w - size:] = value
    return img


def stamp(x: np.ndarray, size: int = 3, value: int = 255) -> np.ndarray:
    """Stamp the patch onto uint8 NHWC (or HWC) images; returns a copy."""
    x = x.copy()
    x[..., -size:, -size:, :] = value
    return x


def stamp_float(x, size: int = 3, value: float = 1.0):
    """Stamp onto float NCHW tensors/arrays in [0, 1]; returns a copy."""
    x = x.clone() if hasattr(x, "clone") else x.copy()
    x[..., -size:, -size:] = value
    return x
