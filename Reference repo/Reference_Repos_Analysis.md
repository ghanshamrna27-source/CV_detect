# Reference Repositories: Analysis for SIH PS 26228 (TrustLens)

**Project:** Trustworthy Computer Vision Integrity Assurance (MoD / Indian Army DGIS)
**Folder analysed:** `D:\SIH\PS228\Reference repo` (10 zip files)
**Date:** 28 Sep 2026
**Method:** each zip was extracted and its source code, README and docs read, then checked against the repo's GitHub page.

---

## 1. Summary

The 10 repos fall into four groups that map onto our architecture:

| # | Zip / repo | What it is (one line) | Our module | Use in the 1-week build | License |
|---|---|---|---|---|---|
| 1 | `adversarial-robustness-toolbox-main` (IBM ART) | Python library of ML attacks and defences, including poison detectors | Data scanner, model auditor, **contributor scoring** | **Use now** (core) | MIT |
| 2 | `BackdoorBench-main` | Benchmark with 16 backdoor attacks and 28 defences for image models | Attack generation, model auditor (Neural Cleanse), evaluation | **Use now** (core) | CC BY-NC 4.0 |
| 3 | `model-transparency-main` (OpenSSF model signing) | Signs and verifies ML model files | Model integrity (substitution check) | **Use now** | Apache-2.0 |
| 4 | `in-toto-develop` | Signed, verifiable record of each step in a supply chain | Pipeline provenance (the processing chain) | Reference / optional | Apache-2.0 |
| 5 | `blindai-main` (Mithril Security) | Runs ONNX models inside Intel SGX enclaves with remote attestation | TEE layer | **Reference** for the mock attestation design | Apache-2.0 |
| 6 | `ezkl-main` | Zero-knowledge proofs that a neural network produced a given output | Inference integrity (advanced) | Pitch only (future work) | No LICENSE file in zip (check before use) |
| 7 | `c2pa-rs-main` | Content-provenance standard (C2PA) SDK in Rust | Signed camera frames and output images | Pitch / optional | MIT or Apache-2.0 |
| 8 | `dvc-main` | Data Version Control: versions datasets and models with Git | Dataset versioning per contributor batch | Optional | Apache-2.0 |
| 9 | `model-validation-operator-main` | Kubernetes operator that refuses to run unsigned models | Deployment-time gate | Pitch only (scale-up) | Apache-2.0 |
| 10 | `slsa-github-generator-main` | Generates SLSA build provenance in GitHub Actions | Provenance for our own code releases | Pitch only (**no longer maintained**) | Apache-2.0 |

**Main findings:**

- ART and BackdoorBench together give us nearly all the **detection** code we need. ART also has `ProvenanceDefense`, a ready-made **per-source (per-contributor) poison detector**, which is exactly what the problem statement asks for.
- ART's **Neural Cleanse only supports Keras models.** For our PyTorch model, use BackdoorBench's `defense/nc.py`.
- OpenSSF model signing (`model-transparency`) works **offline with plain EC keys** (no internet needed), which suits an air-gapped defence setting.
- BlindAI shows exactly how a real SGX attestation check works (`validate_attestation`). We copy its logic into our mock attestation service, but **BlindAI itself is unmaintained**, so we don't depend on it.
- **Nothing in the folder covers near-duplicate detection or label-noise detection.** We still need `open_clip` + `faiss` and `cleanlab` for those (see section 12).

### Where each repo fits

```
Contributors ──► [Data scanner] ─────────── ART (AC, Spectral, ProvenanceDefense), BackdoorBench (detection_pretrain), DVC
Vendor model ──► [Model auditor] ────────── BackdoorBench (Neural Cleanse), model-transparency (signature check)
Field inputs ──► [Inference service] ────── EZKL (ZK proofs, future), C2PA (signed frames/outputs)
                 [TEE layer] ────────────── BlindAI (attestation logic)
                 [Pipeline provenance] ──── in-toto, SLSA generator
                 [Deployment gate] ──────── model-validation-operator
```

---

## 2. adversarial-robustness-toolbox-main (IBM ART)

**GitHub:** https://github.com/Trusted-AI/adversarial-robustness-toolbox · v1.20 · about 6.2k stars · MIT · hosted by LF AI & Data

### What it is

A Python library for ML security that covers four threat types: evasion, **poisoning**, extraction and inference. It supports PyTorch, TensorFlow/Keras, scikit-learn and others, and works for image classification and object detection.

### What's inside (relevant parts)

| Path | Contents |
|---|---|
| `art/defences/detector/poison/activation_defence.py` | **Activation Clustering (AC)**: clusters a model's hidden-layer activations per class; poisoned samples form a small separate cluster |
| `art/defences/detector/poison/spectral_signature_defense.py` | **Spectral Signatures**: flags samples with outlier scores along the top singular vector of the activations |
| `art/defences/detector/poison/provenance_defense.py` | **Provenance-based detection**: groups training data by source/device and flags a source if removing it changes model performance by more than `eps` |
| `art/defences/detector/poison/roni.py` | RONI ("Reject On Negative Impact") sample filtering |
| `art/defences/detector/poison/ground_truth_evaluator.py` | Scores detector output against known poison labels (precision/recall) |
| `art/estimators/poison_mitigation/neural_cleanse/`, `art/defences/transformer/poisoning/neural_cleanse.py` | Neural Cleanse, **Keras only**: the code raises `NotImplementedError` for other frameworks |
| `art/estimators/poison_mitigation/strip/`, `art/defences/transformer/poisoning/strip.py` | STRIP, which detects triggered inputs at inference time |
| `art/attacks/poisoning/backdoor_attack.py`, `clean_label_backdoor_attack.py`, `hidden_trigger_backdoor/`, `sleeper_agent_attack.py` | Poisoning attacks, used to generate test cases |
| `art/attacks/poisoning/bad_det/` | BadDet attacks on **object detectors** (GMA, ODA, OGA, RMA), for the future YOLO extension |
| `notebooks/poisoning_defense_activation_clustering.ipynb`, `poisoning_defense_spectral_signatures.ipynb`, `provenance_defence.ipynb`, `poisoning_defense_neural_cleanse.ipynb`, `poisoning_defence_strip.ipynb` | Ready-to-run tutorials for each defence |

### How it works (the key detectors)

- **Activation Clustering:** for each class, it takes the last hidden layer's activations, reduces them with PCA/FastICA to about 10 dimensions and runs 2-means clustering. A class that splits into one large and one small cluster (for example under 35%) signals a backdoor, and the small cluster holds the poisoned samples.
- **Spectral Signatures:** it centres the activations per class, takes the top singular vector and scores each sample by its projection. The highest-scoring samples (about 1.5 × the expected poison rate) are flagged.
- **ProvenanceDefense:** its inputs are `p_train`, a one-hot "which device/source" vector for each sample. For each source, it trains the model with and without that source's data and compares performance on validation data. If the drop is larger than `eps` (default 0.2), that source is flagged as poisonous. There are two modes: *partially trusted* (you have clean validation data) and *untrusted* (the validation set is split off the training data).

### How it helps our project

| Our need | ART piece |
|---|---|
| Detect trigger-poisoned samples (data scanner) | `ActivationDefence`, `SpectralSignatureDefense` |
| **Score each contributor, not just samples** (the problem statement's core ask) | `ProvenanceDefense`: the contributor ID becomes `p_train` |
| Measure detector precision and recall | `GroundTruthEvaluator` |
| Generate attacks to test against | `PoisoningAttackBackdoor`, clean-label and hidden-trigger attacks |
| Future object-detection support | `bad_det` attacks and object-detection estimators |

### How to use it this week

```python
from art.estimators.classification import PyTorchClassifier
from art.defences.detector.poison import ActivationDefence, SpectralSignatureDefense

clf = PyTorchClassifier(model=resnet18, loss=loss_fn, optimizer=opt,
                        input_shape=(3, 32, 32), nb_classes=10)

ac = ActivationDefence(clf, x_train, y_train)
report, is_clean = ac.detect_poison(nb_clusters=2, nb_dims=10, reduce="PCA")

ss = SpectralSignatureDefense(clf, x_train, y_train, expected_pp_poison=0.05)
ss_report, ss_clean = ss.detect_poison()

# Contributor-level view: share of each contributor's samples flagged
import numpy as np
for c in np.unique(contributor_id):
    mask = contributor_id == c
    print(c, 1 - np.mean(np.array(is_clean)[mask]))
```

### Cautions

- **Neural Cleanse in ART is Keras-only.** Use BackdoorBench's `defense/nc.py` for PyTorch.
- `ProvenanceDefense` **retrains the model twice per contributor.** With 5 contributors and ResNet-18 that's too slow for the week. Run it on a cheap model instead, such as logistic regression on CLIP embeddings, or treat it as a stretch goal.
- The zip is large (196 MB) because of notebooks and test data. Install with `pip install adversarial-robustness-toolbox` rather than from the zip.

---

## 3. BackdoorBench-main

**GitHub:** https://github.com/SCLBD/BackdoorBench · v2.2 · about 616 stars · **CC BY-NC 4.0 (non-commercial)** · CUHK-Shenzhen (Prof. Baoyuan Wu's lab)

### What it is

A research benchmark for backdoor learning. It provides consistent PyTorch implementations of **16 backdoor attacks** and **28 defence/detection methods** on CIFAR-10, CIFAR-100, GTSRB and Tiny ImageNet, plus a public leaderboard.

### What's inside

| Path | Contents |
|---|---|
| `attack/` | 16 attacks: `badnet.py`, `blended.py`, `wanet.py`, `ssba.py`, `inputaware.py`, `lc.py` (label-consistent), `sig.py`, `trojannn.py`, `refool.py`, `lira.py`, `bpp.py`, `ctrl.py`, `ftrojann.py`, `poison_ink.py`, `lf.py`, `blind.py` |
| `defense/` | Model-level defences: **`nc.py` (Neural Cleanse, PyTorch)**, `ac.py`, `spectral.py`, `abl.py`, `anp.py`, `fp.py` (fine-pruning), `nad.py`, `i-bau.py` and more |
| `detection_pretrain/` | **Detects poisoned training samples** before training: `strip.py`, `spectral.py`, `spectre.py`, `scan.py`, `beatrix.py`, `ac.py`, `agpd.py`, `asset.py`, `cd.py` |
| `detection_infer/` | **Detects triggered inputs at inference time:** `strip.py`, `sentinet.py`, `teco.py` |
| `resource/badnet/` | Trigger generator, e.g. `generate_white_square.py` (3×3 patch) |
| `config/attack/prototype/cifar10.yaml` | Default training config (PreAct-ResNet18, SGD lr 0.01, cosine schedule, **100 epochs**) |
| `utils/save_load_attack.py` | `load_attack_result()` loads the backdoored model plus the poisoned train/test sets |
| `utils/bd_dataset_v2.py`, `utils/backdoor_generate_poison_index.py` | Poisoned-dataset wrapper and the poison-index selection (useful ground truth for us) |
| `analysis/` | 20+ visualisations: Grad-CAM, t-SNE/UMAP of features, activation plots, confusion matrices, SHAP |
| `models/` | PreAct-ResNet, ResNeXt, SENet (VGG, ViT and others come from torchvision) |

### How it works

1. **Attack:** generate a trigger (for example a white 3×3 square), then run `python ./attack/badnet.py --yaml_path ../config/attack/prototype/cifar10.yaml --patch_mask_path ../resource/badnet/trigger_image.png --save_folder_name badnet_0_1`. It poisons a fraction of the training set, trains the model and saves everything to `record/badnet_0_1/attack_result.pt`.
2. **Defend or detect:** run `python ./defense/nc.py --result_file badnet_0_1 --yaml_path ./config/defense/nc/cifar10.yaml --dataset cifar10`. Each defence reads the saved attack result and outputs metrics: clean accuracy, attack success rate (ASR) and, for detectors, TPR/FPR.
3. **Neural Cleanse (`defense/nc.py`):** for each class it optimises the smallest mask and pattern that flips all inputs to that class (`RegressionModel`, `train_mask`), then uses median-absolute-deviation outlier detection on the mask L1 norms (`outlier_detection`). A class with an abnormally small mask is the backdoor target, and the mask is the reconstructed trigger.

### How it helps our project

| Our need | BackdoorBench piece |
|---|---|
| Create contributor C3's poisoned data and the backdoored model | `attack/badnet.py` + `resource/badnet/` |
| Model auditor: reverse-engineer the trigger (PyTorch) | `defense/nc.py` |
| **Trigger-to-source trace** | Stamp NC's reconstructed mask/pattern onto the training images and match against `detection_pretrain` scores; the poison indices from `utils/backdoor_generate_poison_index.py` give us ground truth |
| Extra data-scanner detectors | `detection_pretrain/spectral.py`, `spectre.py`, `scan.py`, `strip.py` |
| Inference-time trigger check (for the inference service) | `detection_infer/strip.py`, `teco.py` |
| Stronger attacks for evaluation after the week | `wanet.py`, `ssba.py` (invisible triggers) |
| Visuals for the dashboard or pitch | `analysis/visual_tsne.py`, `visual_gradcam.py` |

### How to use it this week

- Use it as a **source of code**, not a framework: copy `attack/badnet.py`'s poisoning logic and `defense/nc.py` into our `model_auditor/` module with attribution.
- **Reduce `epochs: 100` to about 20–30** in the YAML so training fits the Colab time budget on day 1.
- Its defaults are PreAct-ResNet18 on 32×32 CIFAR-10, the same setup as our plan.

### Cautions

- **CC BY-NC 4.0 means non-commercial use only.** That's fine for SIH and research, but if the solution is later productised, rewrite these parts or use MIT-licensed ART equivalents.
- Its environment targets Python 3.8 and PyTorch 1.11 (`sh/install.sh`). Pin versions or port only the files you need to avoid dependency conflicts.
- The README notes that the data-poisoning scripts don't generate the triggers themselves; you must run `resource/...` first.

---

## 4. model-transparency-main (OpenSSF / Sigstore model signing)

**GitHub:** https://github.com/sigstore/model-transparency · package `model-signing` v1.1.1 · Apache-2.0 · OpenSSF AI/ML Working Group

### What it is

A library and CLI to **sign an ML model (a file or a whole directory) and verify it later**, so a substituted or modified model is detected. It follows the OpenSSF Model Signing (OMS) format.

### What's inside

| Path | Contents |
|---|---|
| `src/model_signing/hashing.py`, `_hashing/` | Hashes every file (or file shard) of a model into a **manifest** |
| `src/model_signing/signing.py`, `_signing/` | Signers: Sigstore (keyless OIDC), **EC private key** (`sign_ec_key.py`), X.509 certificate, **PKCS#11 hardware tokens** |
| `src/model_signing/verifying.py` | Re-hashes the model and compares it with the signed manifest |
| `src/model_signing/_cli.py` | `model_signing sign / verify / digest` |
| `benchmarks/` | Hashing speed for large models |

### How it works

1. Hash every model file into a manifest of (path, digest) pairs.
2. Wrap the manifest in an **in-toto statement** (predicate type `https://model_signing/signature/v1.0`) inside a **DSSE envelope**, then sign it.
3. Store it as a Sigstore bundle (JSON), for example `model.sig`.
4. To verify, check the signature, re-hash the model and compare. Any changed file makes verification fail.

### How it helps our project

- **Model substitution detection (capability 2):** before the auditor runs, verify the vendor model's signature. Hash mismatch → "model substituted".
- **Binding receipts to a model:** the model's manifest digest becomes the `model_hash` field in every inference receipt.
- **Works offline:** EC-key and PKCS#11 signing need no internet or Sigstore server, which is suitable for air-gapped Army networks. PKCS#11 lets keys live in a hardware security module (HSM) or smart card.

### How to use it this week

```bash
pip install model-signing
openssl ecparam -name prime256v1 -genkey -noout -out key.priv
openssl ec -in key.priv -pubout > key.pub
model_signing sign key models/resnet18_clean --private-key key.priv --signature clean.sig
model_signing verify key models/resnet18_clean --signature clean.sig --public_key key.pub
```

```python
import model_signing
model_signing.signing.Config().use_elliptic_key_signer(private_key="key.priv").sign("models/clean", "clean.sig")
model_signing.verifying.Config().use_elliptic_key_verifier(public_key="key.pub").verify("models/clean", "clean.sig")
```

(Check the exact CLI flag spelling with `model_signing verify key --help`; the Python API above matches the source.)

**Demo moment:** swap in the backdoored checkpoint and show verification failing.

### Cautions

- A valid signature only proves **who signed it and that it hasn't changed since**. It doesn't prove the model is free of backdoors, which is why we still need the auditor. Say this explicitly in the pitch.

---

## 5. in-toto-develop

**GitHub:** https://github.com/in-toto/in-toto · Apache-2.0 · CNCF graduated project (NYU origin)

### What it is

A framework that makes a **supply chain verifiable step by step**. The project owner writes a signed **layout** listing the steps and who may perform each one. Each step, when run, produces a signed **link** file recording its input files ("materials"), output files ("products") and the command used. At the end, `in-toto-verify` checks that every step happened as planned, by the authorised party, with nothing changed in between.

### What's inside

| Path | Contents |
|---|---|
| `in_toto/in_toto_run.py` | `in-toto-run`: wraps a command, hashes its materials and products, writes a signed link |
| `in_toto/in_toto_record.py` | Records a step that isn't a single command (start/stop) |
| `in_toto/in_toto_verify.py`, `verifylib.py` | Verifies the final product against the layout and links |
| `in_toto/models/` | Layout, Link and Step metadata models |
| `in_toto/rulelib.py` | Artifact rules (MATCH, CREATE, MODIFY, DISALLOW…) |
| `doc/source/layout-creation-example.md` | End-to-end tutorial |

### How it helps our project

The problem statement requires inference records to be "cryptographically linked to the exact input, model **and processing chain**". in-toto is the standard way to prove the **processing chain**:

| Pipeline step | in-toto link records |
|---|---|
| `preprocess` | raw images → normalised tensors |
| `scan` | dataset → evidence JSON |
| `train` | dataset + config → model checkpoint |
| `infer` | model + input → output |

The layout says, for example, "only contributor keys may create datasets; only the trainer key may produce the model". Verification then proves that the model in production came from the approved dataset via the approved steps. The model-signing library above already uses in-toto statements internally, so the formats are consistent.

### How to use it

- **In the 1-week build:** optional. Our receipt can include a `pipeline_hash` (a hash of the preprocessing config and code version), which covers the requirement simply.
- **As a stretch goal or in the pitch:** wrap `scan`, `train` and `infer` with `in-toto-run` and show `in-toto-verify` passing, then failing after a file is edited.

---

## 6. blindai-main (Mithril Security)

**GitHub:** https://github.com/mithril-security/blindai · Apache-2.0 · **not actively maintained** (the README warns against using it for sensitive data)

### What it is

A confidential-AI inference server. You upload an **ONNX model**, and it runs inside an **Intel SGX enclave** (Rust, Fortanix EDP, `tract` ONNX runtime). The Python client **verifies remote attestation** before sending any data, so neither the host operator nor malware can see the inputs or the model.

### What's inside

| Path | Contents |
|---|---|
| `src/` (Rust) | The enclave server: `model_store.rs`, `model.rs` (ONNX via tract), `identity.rs` (enclave's self-signed TLS certificate), `client_communication.rs` |
| `client/blindai/core.py` | Python client: `connect()`, `upload_model()`, `run_model()`, `delete_model()`; `RunModel` carries a **`model_hash`** |
| `client/blindai/_dcap_attestation.py` | **`validate_attestation()`**: the full SGX DCAP quote check |
| `manifest.prod.template.toml` | Expected enclave identity: `mr_enclave`, `allow_debug=false`, attribute masks |
| `docs/docs/security/remote_attestation.md`, `threat_model.md`, `concepts/SGX_vs_Nitro.md` | Clear explanations of attestation and the threat model |

### How it works: the attestation check (`validate_attestation`)

1. Verify the SGX quote against Intel's root CA and collateral (PCK certificate, TCB info, QE identity, CRLs).
2. Check that SHA-256 of the "enclave held data" (the enclave's TLS certificate) equals the first 32 bytes of the quote's `report_data`. This binds the secure channel to the enclave and prevents man-in-the-middle attacks.
3. Check that `MRENCLAVE` (the hash of the enclave code) matches the expected value in the manifest.
4. Reject debug-mode enclaves in production.

The client also supports a **simulation mode** (it raises `SimulationModeWarning`) for development without SGX hardware.

### How it helps our project

- **Blueprint for our mock attestation service.** Our mock should produce and check the same fields: a code measurement (`mr_enclave` equals the hash of our service code), `report_data` binding our signing public key, and a debug flag. Then swapping in real SGX or TDX later changes only the backend, not the API.
- **Pattern for binding the receipt key:** put the hash of the enclave's receipt-signing public key into `report_data`. A valid attestation then proves that receipts signed with that key came from the attested code. That is our "forged receipt" demo.
- **Pattern for key release:** the key broker releases the dataset/model decryption keys only if `validate_attestation` passes.
- **Material for the pitch:** `threat_model.md` and `SGX_vs_Nitro.md` help answer judges' TEE questions.

### Cautions

- **Unmaintained:** don't depend on it. Reuse the design and logic, not the running code.
- ONNX only, CPU only (SGX), and it needs real SGX hardware except in simulation mode.

---

## 7. ezkl-main (zero-knowledge ML)

**GitHub:** https://github.com/zkonduit/ezkl · about 1.2k stars · actively maintained (v21 audited by Trail of Bits) · **no LICENSE file in the zip**: check the terms on GitHub before bundling it

### What it is

A Rust library, CLI and Python binding that turns an **ONNX model into a zk-SNARK circuit** (Halo2). You can then prove statements like *"this exact network, run on this input, produced this output"* without re-running it, and optionally without revealing the input or the weights.

### What's inside

| Path | Contents |
|---|---|
| `src/` | Circuit compiler (`graph/`, `circuit/`), prover and verifier, Python bindings |
| `src/graph/vars.rs` | **Visibility modes** for inputs, params and outputs: `Public`, `Private`, **`Hashed`** (only the hash goes into the proof), `KZGCommit`, `Fixed` |
| `examples/onnx/` | 100+ small ONNX test graphs (conv, relu, softmax…) |
| `examples/notebooks/` | Tutorials: `mnist_classifier.ipynb`, `simple_demo_*.ipynb`, **`hashed_vis.ipynb`**, `proof_splitting.ipynb`, `cat_and_dog.ipynb` |
| `verifier_abi.json` | EVM verifier ABI (on-chain verification) |

### How it works

`gen_settings` → `calibrate_settings` → `compile_circuit` → `setup` (proving and verifying keys) → `gen_witness` → `prove` → `verify`. With `Hashed` visibility, the proof commits to the hash of the input and the weights, which is exactly "cryptographically linked to the exact input and model".

### How it helps our project

- It's the **strongest form of inference integrity**: a mathematical proof instead of trusting a TEE. A verifier can check an output was produced by model M on input X with no hardware trust at all.
- **Comparison slide for the pitch:** "Signature (who) → TEE attestation (where and what code) → ZK proof (mathematically correct)."

### How to use it

- **Not in the 1-week build.** Proving time and memory are far too high for ResNet-18. It's practical only for small models (an MNIST-size CNN or a small classifier head).
- **Optional stretch:** run the `mnist_classifier.ipynb` notebook and show one proof and verification as "future work, proven feasible".

---

## 8. c2pa-rs-main (Content Authenticity / C2PA)

**GitHub:** https://github.com/contentauth/c2pa-rs · `c2pa` crate (0.92.0-dev in the zip) · MIT or Apache-2.0 · Content Authenticity Initiative (Adobe and others)

### What it is

The Rust SDK for the **C2PA standard**, which embeds a signed "manifest" (who created an image or video, with what device or tool, and what edits were made) inside the media file itself. Anyone can then verify the image's origin and whether it was altered.

### What's inside

| Path | Contents |
|---|---|
| `sdk/src/builder.rs`, `reader.rs` | Create and read manifests |
| `sdk/src/assertions/` | Standard assertions: `actions.rs` (including `digitalSourceType`, e.g. `trainedAlgorithmicMedia` for AI-generated content), `data_hash.rs`, `ingredient.rs`, `region_of_interest.rs`, `soft_binding.rs`, `metadata.rs` |
| `sdk/src/cose_sign.rs`, `cose_validator.rs`, `crypto/` | COSE signing and validation, certificate checks, timestamps |
| `sdk/src/identity/` | CAWG identity assertions |
| `c2pa_c_ffi/` | C API, which other language bindings build on |
| `docs/` | Usage, supported formats, identity docs |

### How it helps our project

- **Signed camera frames (field inputs):** a camera or edge device signs each frame with a C2PA manifest. Our inference service verifies the manifest before inference, so injected or edited frames are rejected at the start of the chain.
- **Signed annotated outputs:** when an output image with bounding boxes goes to downstream systems, attach a C2PA manifest whose `ingredient` is the input frame and whose `actions` describe "inference by model M". Anyone can then verify the output's provenance with standard C2PA tools.
- It is an **international standard**, which gives the pitch credibility over a home-made format.

### How to use it

- **In the 1-week build:** optional. From Python, use the separate `c2pa-python` bindings (pip install `c2pa-python`) rather than compiling this Rust repo. For the demo it's enough to sign and verify one input frame and one output image.
- **Cautions:** the manifest must be signed with an X.509 certificate chain (test certificates are available in the repo's fixtures). Stripping the manifest removes it, so our receipts (hash-based) remain the main guarantee and C2PA is an extra layer.

---

## 9. dvc-main (Data Version Control)

**GitHub:** https://github.com/iterative/dvc · Apache-2.0 · widely used, actively maintained

### What it is

"Git for data and models." `dvc add` stores large files in a content-addressed cache and puts a small `.dvc` pointer file with the file's hash into Git. `dvc.yaml` pipelines record which stage consumed which data and produced which outputs, and `dvc repro` re-runs only what changed.

### What's inside

| Path | Contents |
|---|---|
| `dvc/repo/add.py`, `checkout.py`, `push.py`, `pull.py` | Track data, restore versions, sync with remote storage |
| `dvc/repo/reproduce.py`, `stage/` | Pipeline stages and reproduction |
| `dvc/repo/experiments/`, `metrics/`, `params/`, `plots/` | Experiment tracking and comparison |
| `dvc/output.py` | Output hashing (MD5-based, see caution) |

### How it helps our project

- **Versioning contributor batches:** each contributor upload becomes a tracked, hashed version (`data/contributors/C3/batch_001.dvc`). You can always answer "which exact data trained this model?", which the trigger-to-source trace depends on.
- **Reproducible evaluation:** a `dvc.yaml` pipeline (`split → poison → train → scan → audit`) lets judges re-run the whole experiment with one command, `dvc repro`.
- **Continuous auditing:** a new batch from a contributor becomes a new version, and a re-scan compares risk scores over time.

### Cautions

- DVC hashes with **MD5**, which is fine for versioning but **not a security guarantee** (MD5 collisions are practical). Our receipts and ledger must use **SHA-256**. Treat DVC as bookkeeping, not proof.
- **In the 1-week build:** optional. A simple manifest of SHA-256 hashes per contributor batch is enough; DVC is a nice-to-have for reproducibility.

---

## 10. model-validation-operator-main

**GitHub:** https://github.com/sigstore/model-validation-operator · Apache-2.0 · Go · **proof of concept / early stage**

### What it is

A Kubernetes/OpenShift operator that **refuses to start a workload until its ML model's signature is verified**. It is built on `model-transparency` (repo #4).

### What's inside

| Path | Contents |
|---|---|
| `api/v1alpha1/modelvalidation_types.go` | `ModelValidation` custom resource: model path, signature path, and the verification method (Sigstore, PKI or **public key**) |
| `internal/webhooks/` | Mutating webhook that injects an **init container** into labelled pods to run the verification before the app starts |
| `internal/controller/` | Controllers, network policy, pod tracking |
| `cmd/validation-agent/` | Agent for **continuous re-validation** (native sidecar, Kubernetes 1.28+) |
| `examples/verify.yaml`, `continuous-validation.yaml` | Sample resources and pods |

### How it works

Label a pod with `validation.ml.sigstore.dev/ml: <name>`. The webhook adds an init container that runs model-signing verification on the mounted model. If verification fails, the pod never starts.

### How it helps our project

- It's the **deployment-time enforcement** part of the story: our platform audits and signs an approved model, and in production, *only signed, approved models can run*. It closes the loop from "we detected a bad model" to "a bad model cannot be deployed".
- It fits the Kubernetes + Confidential Containers scale-up path in our plan.

### How to use it

- **Pitch only.** A Kubernetes cluster is out of scope for a 1-week build. One architecture slide: "Audit → sign → admission-controlled deployment."
- **Cautions (from its README):** no validation of the custom resource, namespace-scoped only, no status fields, and self-generated webhook certificates. It's not production-ready.

---

## 11. slsa-github-generator-main

**GitHub:** https://github.com/slsa-framework/slsa-github-generator · Apache-2.0 · **no longer actively maintained** (last release v2.1.0, February 2025; the README recommends GitHub artifact attestations instead)

### What it is

Reusable GitHub Actions workflows that produce **SLSA Build Level 3 provenance**: a signed statement of exactly which source commit, workflow and builder produced a release artifact. It includes builders for Go, Node.js, Maven, Gradle, Docker/containers, Bazel and generic artifacts.

### What's inside

| Path | Contents |
|---|---|
| `internal/builders/` | Builders: `generic`, `container`, `docker`, `go`, `nodejs`, `maven`, `gradle`, `bazel` |
| `actions/` | Composite actions (generator, delegator…) |
| `signing/`, `github/oidc.go` | Keyless signing with GitHub OIDC and Sigstore |
| `PROVENANCE_FORMAT.md`, `SPECIFICATIONS.md`, `BYOB.md` | Provenance format, spec, "Build Your Own Builder" |

### How it helps our project

- It provides **provenance for our own software.** A defence buyer will ask whether the assurance tool itself can be trusted. Our Docker image and release zip can ship with SLSA provenance.
- **Concept reuse:** its provenance format (in-toto statement, builder identity, source digest) is a good model for our "processing chain" record.
- It links to the TEE attestation idea: attestation measures *code running now*, and SLSA proves *how that code was built*.

### How to use it

- **Pitch only, or a 10-minute stretch:** since this repo is unmaintained, use GitHub's built-in `actions/attest-build-provenance` on our repo instead and show `gh attestation verify` on the release.

---

## 12. Gaps: what the folder does not cover

| Need in our plan | Not in the folder → use |
|---|---|
| Near-duplicate flooding detection | `open_clip` (CLIP embeddings) + `faiss`; `imagehash` for pHash; optionally `fastdup` or `imagededup` |
| Label flipping and mislabelling | `cleanlab` (confident learning) |
| Out-of-distribution detection | Embedding distance (k-NN on CLIP features) or energy score on the model |
| Ledger | Our own SQLite Merkle log (MVP); Hyperledger Fabric (scale-up) |
| Real TEE runtime | Gramine (SGX) or a confidential VM; BlindAI is only a reference |
| Dashboard | Streamlit |

---

## 13. Recommended use in the 1-week plan

| Day | Person | Repo usage |
|---|---|---|
| 1 | A, B | **BackdoorBench**: generate the BadNets trigger and poison C3's split; train clean and backdoored PreAct-ResNet18 (reduce epochs to 20–30). **model-transparency**: sign the clean model. |
| 2–3 | A | **ART** `ActivationDefence` + `SpectralSignatureDefense` for poison checks; aggregate flags per contributor (plus CLIP/FAISS and cleanlab from section 12). |
| 2–3 | B | **BackdoorBench** `defense/nc.py` (Neural Cleanse, PyTorch) → reconstructed trigger + target class. |
| 2–3 | C | Receipts use the **model-transparency** manifest digest as `model_hash`; mock attestation modelled on **BlindAI's** `validate_attestation` (measurement, `report_data` binding, debug flag). |
| 4 | A + B | Trigger-to-source trace: NC trigger + ART AC clusters → C3's images; score with ART `GroundTruthEvaluator`. |
| 6 (stretch) | Any | ART `ProvenanceDefense` on CLIP-embedding logistic regression; `in-toto-run` around the pipeline steps; one EZKL MNIST proof. |
| Pitch | All | Slides: C2PA signed frames, in-toto processing chain, EZKL "mathematical proof" tier, model-validation-operator deployment gate, SLSA provenance for our own releases. |

### Licensing summary for the submission

- MIT / Apache-2.0 (safe to reuse with attribution): ART, model-transparency, in-toto, BlindAI, C2PA, DVC, model-validation-operator, SLSA generator.
- **CC BY-NC 4.0 (non-commercial only):** BackdoorBench. Fine for SIH; credit the authors in the README.
- **Unclear:** EZKL has no LICENSE file in the zip. Check the GitHub repo's current terms before including its code.
