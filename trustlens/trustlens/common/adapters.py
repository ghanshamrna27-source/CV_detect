"""Plugin interfaces (plan section 4.3).

Detectors only talk to `DatasetAdapter` and `ModelAdapter`, so a new dataset (GTSRB, COCO) or
model family (YOLO) is a new adapter, not a change to the detectors.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

import numpy as np


@dataclass
class Sample:
    sample_id: str
    contributor: str
    image: np.ndarray  # HWC uint8
    label: int


class DatasetAdapter:
    def samples(self) -> Iterable[Sample]:
        raise NotImplementedError

    def num_classes(self) -> int:
        raise NotImplementedError

    def arrays(self) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """(x uint8 NHWC, y, contributor, sample_id) — the fast path every scanner uses."""
        items = list(self.samples())
        return (np.stack([s.image for s in items]), np.array([s.label for s in items]),
                np.array([s.contributor for s in items]), np.array([s.sample_id for s in items]))


class CIFAR10Adapter(DatasetAdapter):
    """The contributed CIFAR-10 pool written by `attacks.make_contributors`."""

    def __init__(self, pool: dict[str, np.ndarray], num_classes: int = 10):
        self._pool = pool
        self._k = num_classes

    @classmethod
    def from_paths(cls, paths, num_classes: int = 10) -> "CIFAR10Adapter":
        from trustlens.common.io import load_pool

        return cls(load_pool(paths), num_classes)

    def samples(self) -> Iterable[Sample]:
        p = self._pool
        for i in range(len(p["y"])):
            yield Sample(str(p["sample_id"][i]), str(p["contributor"][i]), p["x"][i], int(p["y"][i]))

    def arrays(self):
        p = self._pool
        return p["x"], p["y"], p["contributor"], p["sample_id"]

    def num_classes(self) -> int:
        return self._k


class ModelAdapter:
    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        raise NotImplementedError

    def features(self, x: np.ndarray) -> np.ndarray:
        raise NotImplementedError

    def torch_module(self):
        return None

    def access_level(self) -> str:
        raise NotImplementedError


def _to_tensor(x: np.ndarray, device):
    import torch

    t = torch.from_numpy(np.array(x, copy=True) if not x.flags.writeable else np.ascontiguousarray(x))
    if t.dtype == torch.uint8:
        t = t.float().div_(255.0)
    if t.ndim == 4 and t.shape[-1] == 3:
        t = t.permute(0, 3, 1, 2)
    return t.to(device)


class TorchModelAdapter(ModelAdapter):
    """White-box adapter for any classifier exposing `features()` and a linear head."""

    def __init__(self, model, device="cpu", batch_size: int = 512):
        self.model = model.to(device).eval()
        self.device = device
        self.batch_size = batch_size

    @classmethod
    def from_dir(cls, model_dir: str | Path, device="cpu") -> "TorchModelAdapter":
        from trustlens.training.models import load_model

        model, _ = load_model(model_dir, device)
        return cls(model, device)

    def _run(self, x: np.ndarray, fn) -> np.ndarray:
        import torch

        outs = []
        with torch.no_grad():
            for s in range(0, len(x), self.batch_size):
                outs.append(fn(_to_tensor(x[s:s + self.batch_size], self.device)).float().cpu().numpy())
        return np.concatenate(outs) if outs else np.zeros((0,))

    def predict_proba(self, x):
        import torch

        return self._run(x, lambda t: torch.softmax(self.model(t), 1))

    def features(self, x):
        return self._run(x, self.model.features)

    def torch_module(self):
        return self.model

    def access_level(self) -> str:
        return "white-box"


class BlackBoxAdapter(ModelAdapter):
    """Wraps any `predict_proba` callable (for example a remote vendor API)."""

    def __init__(self, predict_proba: Callable[[np.ndarray], np.ndarray]):
        self._fn = predict_proba

    def predict_proba(self, x):
        return self._fn(x)

    def features(self, x):
        raise NotImplementedError("black-box models expose no internal features")

    def access_level(self) -> str:
        return "black-box"
