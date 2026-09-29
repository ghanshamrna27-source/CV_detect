"""PreAct-ResNet18 for 32x32 inputs (architecture as in BackdoorBench `models/preact_resnet.py`).

Normalisation lives inside the model, so every caller feeds images in [0, 1]. That keeps
Neural Cleanse, the trace and the inference service working in plain pixel space.
"""

from __future__ import annotations

import json
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F

CIFAR10_MEAN = (0.4914, 0.4822, 0.4465)
CIFAR10_STD = (0.2470, 0.2435, 0.2616)


class Normalize(nn.Module):
    def __init__(self, mean, std):
        super().__init__()
        self.register_buffer("mean", torch.tensor(mean).view(1, 3, 1, 1))
        self.register_buffer("std", torch.tensor(std).view(1, 3, 1, 1))

    def forward(self, x):
        return (x - self.mean) / self.std


class PreActBlock(nn.Module):
    expansion = 1

    def __init__(self, in_planes, planes, stride=1):
        super().__init__()
        self.bn1 = nn.BatchNorm2d(in_planes)
        self.conv1 = nn.Conv2d(in_planes, planes, 3, stride, 1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)
        self.conv2 = nn.Conv2d(planes, planes, 3, 1, 1, bias=False)
        self.shortcut = None
        if stride != 1 or in_planes != planes:
            self.shortcut = nn.Sequential(nn.Conv2d(in_planes, planes, 1, stride, bias=False))

    def forward(self, x):
        out = F.relu(self.bn1(x))
        shortcut = self.shortcut(out) if self.shortcut is not None else x
        out = self.conv1(out)
        out = self.conv2(F.relu(self.bn2(out)))
        return out + shortcut


class PreActResNet18(nn.Module):
    def __init__(self, num_classes: int = 10, mean=CIFAR10_MEAN, std=CIFAR10_STD):
        super().__init__()
        self.normalize = Normalize(mean, std)
        self.in_planes = 64
        self.conv1 = nn.Conv2d(3, 64, 3, 1, 1, bias=False)
        self.layer1 = self._make_layer(64, 2, 1)
        self.layer2 = self._make_layer(128, 2, 2)
        self.layer3 = self._make_layer(256, 2, 2)
        self.layer4 = self._make_layer(512, 2, 2)
        self.bn = nn.BatchNorm2d(512)
        self.linear = nn.Linear(512, num_classes)

    def _make_layer(self, planes, blocks, stride):
        layers = []
        for s in [stride] + [1] * (blocks - 1):
            layers.append(PreActBlock(self.in_planes, planes, s))
            self.in_planes = planes
        return nn.Sequential(*layers)

    def features(self, x):
        """Penultimate-layer (512-d) features; used by AC, spectral signatures and the trace."""
        out = self.conv1(self.normalize(x))
        out = self.layer4(self.layer3(self.layer2(self.layer1(out))))
        out = F.relu(self.bn(out))
        return torch.flatten(F.adaptive_avg_pool2d(out, 1), 1)

    def forward(self, x):
        return self.linear(self.features(x))


ARCHS = {"preact_resnet18": PreActResNet18}


def build_model(arch: str = "preact_resnet18", num_classes: int = 10) -> nn.Module:
    return ARCHS[arch](num_classes=num_classes)


def save_model(model: nn.Module, model_dir: str | Path, meta: dict) -> None:
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), model_dir / "model.pt")
    with open(model_dir / "config.json", "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2, sort_keys=True)


def load_model(model_dir: str | Path, device="cpu") -> tuple[nn.Module, dict]:
    model_dir = Path(model_dir)
    with open(model_dir / "config.json", encoding="utf-8") as fh:
        meta = json.load(fh)
    model = build_model(meta.get("arch", "preact_resnet18"), meta.get("num_classes", 10))
    state = torch.load(model_dir / "model.pt", map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    return model.to(device).eval(), meta
