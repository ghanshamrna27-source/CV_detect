"""CLIP image embeddings (open_clip ViT-B/32, laion2b_s34b_b79k), L2-normalised and cached.

CLIP is independent of the (possibly poisoned) pool model, so duplicate, OOD and label checks
don't inherit the attacker's influence. Fallback backend `model`: reference-model features.
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn.functional as F

from trustlens.common.config import get_device
from trustlens.common.hashing import sha256_bytes

CLIP_MEAN = (0.48145466, 0.4578275, 0.40821073)
CLIP_STD = (0.26862954, 0.26130258, 0.27577711)


def _clip_encoder(ec: dict, device):
    import open_clip

    model, _, _ = open_clip.create_model_and_transforms(ec["model"], pretrained=ec["pretrained"])
    model = model.to(device).eval()
    mean = torch.tensor(CLIP_MEAN, device=device).view(1, 3, 1, 1)
    std = torch.tensor(CLIP_STD, device=device).view(1, 3, 1, 1)

    def encode(xb: torch.Tensor) -> torch.Tensor:
        xb = F.interpolate(xb, size=224, mode="bicubic", align_corners=False).clamp(0, 1)
        with torch.autocast(device.type, dtype=torch.float16, enabled=device.type == "cuda"):
            return model.encode_image((xb - mean) / std).float()

    return encode, f"open_clip {ec['model']} ({ec['pretrained']})"


def _model_encoder(paths, device):
    from trustlens.training.models import load_model

    model, _ = load_model(paths.models / "reference", device)
    return model.features, "reference-model penultimate features (fallback)"


def embed(x: np.ndarray, ec: dict, paths, device=None, log=print) -> tuple[np.ndarray, str]:
    """Embed uint8 NHWC images; returns (L2-normalised float32 embeddings, method string)."""
    device = device or get_device()
    cache_key = sha256_bytes(x.tobytes())[:16]
    cache = paths.cache / f"emb_{ec['backend']}_{cache_key}.npz"
    if cache.exists():
        with np.load(cache) as z:
            return z["emb"], str(z["method"])

    if ec["backend"] == "clip":
        try:
            encode, method = _clip_encoder(ec, device)
        except Exception as exc:  # no weights offline, etc.
            log(f"  CLIP unavailable ({type(exc).__name__}: {exc}); falling back to reference-model features")
            encode, method = _model_encoder(paths, device)
    else:
        encode, method = _model_encoder(paths, device)

    out = []
    bs = ec.get("batch_size", 256)
    with torch.no_grad():
        for s in range(0, len(x), bs):
            xb = torch.from_numpy(x[s:s + bs]).to(device).permute(0, 3, 1, 2).float().div_(255)
            out.append(F.normalize(encode(xb).float(), dim=1).cpu().numpy())
            if (s // bs) % 40 == 0:
                log(f"  embedded {min(s + bs, len(x))}/{len(x)}")
    emb = np.concatenate(out).astype(np.float32)
    del encode
    if device.type == "cuda":
        torch.cuda.empty_cache()  # free CLIP before the next GPU-heavy step
    paths.cache.mkdir(parents=True, exist_ok=True)
    np.savez(cache, emb=emb, method=np.array(method))
    return emb, method
