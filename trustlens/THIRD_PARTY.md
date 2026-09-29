# Third-party code and attribution

| Component | Where used | License | Notes |
|---|---|---|---|
| **BackdoorBench** (SCLBD, CUHK-Shenzhen) — https://github.com/SCLBD/BackdoorBench | `trustlens/attacks/badnets.py` (BadNets white-square trigger, from `resource/badnet/generate_white_square.py` and `attack/badnet.py`), `trustlens/model_auditor/neural_cleanse.py` (port of `defense/nc.py`), `trustlens/training/models.py` (PreAct-ResNet18 architecture) | **CC BY-NC 4.0** | Non-commercial use only. Fine for SIH / research; rewrite these parts before any commercial use. |
| **IBM Adversarial Robustness Toolbox (ART)** — https://github.com/Trusted-AI/adversarial-robustness-toolbox | `trustlens/data_scanner/poison.py` (`ActivationDefence`, `SpectralSignatureDefense` cross-check; our own implementation follows the same algorithms) | MIT | Installed from PyPI. |
| **OpenSSF model-signing** (`model-transparency`) — https://github.com/sigstore/model-transparency | `trustlens/model_auditor/signature.py` (offline EC-key sign / verify) | Apache-2.0 | Installed from PyPI. |
| **BlindAI** (Mithril Security) — https://github.com/mithril-security/blindai | Design of `trustlens/tee/attestation_mock.py` (quote fields, `report_data` key binding, allowlist, debug rejection) modelled on `client/blindai/_dcap_attestation.py` | Apache-2.0 | Design reuse only; no BlindAI code is imported (the project is unmaintained). |
| **open_clip** — https://github.com/mlfoundations/open_clip | `trustlens/data_scanner/embeddings.py` (ViT-B/32, `laion2b_s34b_b79k` weights) | MIT (code); weights under their own terms | |
| **cleanlab** — https://github.com/cleanlab/cleanlab | `trustlens/data_scanner/labels.py` | AGPL-3.0 | Used as a library; check licensing before redistribution in a product. |
| **FAISS** — https://github.com/facebookresearch/faiss | kNN search (`trustlens/common/io.py`) | MIT | |
| **imagehash** | pHash pre-filter | BSD-2-Clause | |
| **RFC 6962 / RFC 9162** | Merkle tree hashing and inclusion-proof verification (`trustlens/provenance/merkle_log.py`) | IETF | Algorithm, not code. |
| CIFAR-10 / CIFAR-100 (Krizhevsky, 2009) | Datasets, downloaded via torchvision | — | |

Pitch / future work only (not used in code): in-toto, SLSA GitHub generator, C2PA (`c2pa-rs`), EZKL, sigstore model-validation-operator, DVC.
