# TrustLens: Implementation Plan

**Problem statement:** SIH PS 26228: Trustworthy Computer Vision Integrity Assurance for Data, Models and Inference Outputs in Multi-Contributor Pipelines (MoD / Indian Army DGIS, Blockchain & Cybersecurity)
**Team:** 3 developers (A = Data, B = Model, C = Crypto, TEE and App)
**Time box:** 7 days (assumed Tue 29 Sep to Mon 5 Oct 2026)
**Companion docs:** Development Plan (Claude doc), `Reference_Repos_Analysis.md` (same folder)

---

## 0. What we are building (one paragraph)

TrustLens is one platform that checks a contributed **dataset**, a supplied **model** and the model's **inference outputs**. It then answers the question existing tools don't: *which contributor in the pipeline can't be trusted, and what is the proof?* It finds poisoned, mislabelled, duplicated and out-of-distribution data and scores each **contributor**. It detects substituted or backdoored models and **traces a backdoor trigger back to the contributor who planted it**. It issues **signed inference receipts** bound to the exact input, model and pipeline, anchored in a **Merkle log**, and produced by a service whose code identity is proven by (mock) **TEE attestation**.

### Mapping to the problem statement

| PS capability | TrustLens component | Proof in the demo |
|---|---|---|
| 2.2.1 Training-data integrity (triggers, label flips, mislabelling, near-duplicate flooding, OOD), aggregated per source | Data scanner + risk engine | Leaderboard puts C3, C4, C5 at the bottom, with evidence |
| 2.2.2 Model integrity (substituted, modified or backdoored), by access level | Model auditor (signature, fingerprint, Neural Cleanse) | Swapped model fails signature; backdoor target class and trigger recovered |
| Inference records bound to input, model and processing chain | Signed receipts + Merkle log + attestation | Tampered, swapped and forged receipts all fail verification |
| Evidence-based assessment; state confidence and limitations | Evidence schema + dashboard evidence packs | Every flag links to scores, images and the method used |
| Not hard-coded to one model or dataset | Plugin interfaces (`DatasetAdapter`, `ModelAdapter`) | CIFAR-10 / ResNet-18 adapters; YOLO/GTSRB listed as next adapters |

---

## 1. Scope for the week

| Build and demo | Mock or pitch only |
|---|---|
| CIFAR-10 split across 5 simulated contributors (2 clean, 3 attackers) | GTSRB, TrojAI, detection models (YOLO) |
| Near-duplicates (CLIP + FAISS + pHash), OOD score, label issues (cleanlab), poison detection (ART Activation Clustering + Spectral Signatures) | Full detector ensemble, invisible triggers (WaNet, SSBA) |
| Model signature check (OpenSSF `model-signing`), probe fingerprint, Neural Cleanse (ported from BackdoorBench) | Black-box auditing of remote vendor APIs |
| **Trigger-to-source trace** (the headline feature) | — |
| Ed25519 receipts, SQLite Merkle log, CLI verifier | Hyperledger Fabric |
| Mock attestation + key broker (API modelled on BlindAI's SGX DCAP check) | Real SGX/TDX (Gramine as a day-6 stretch) |
| Streamlit dashboard + FastAPI service | React front end, Kubernetes, model-validation-operator |
| — | C2PA signed frames, in-toto chain, EZKL ZK proofs, SLSA provenance (pitch slides) |

---

## 2. Architecture

```
            ┌────────────────── Trusted execution environment (mock → Gramine/TDX) ──────────────────┐
Contributor │  [Data scanner]          [Model auditor]            [Inference service]                │
 batches ──►│  dup / OOD / labels /    signature · fingerprint    hash input+model+pipeline,         │
 (AES-GCM)  │  AC + spectral           Neural Cleanse             predict, sign receipt (Ed25519)    │
Vendor ────►│         │                        │                            │                        │
 model      └─────────┼────────────────────────┼────────────────────────────┼────────────────────────┘
Field ────────────────┼────────────────────────┼──────────────► (input)     │
 inputs               ▼                        ▼                            ▼
              [Risk and evidence engine: fusion + trigger-to-source trace]   [Merkle log (SQLite)]
                                        │                                         │
                                        └────────────► [Streamlit dashboard + CLI verifier] ◄──┘
          [Key broker] releases dataset/model keys only after the attestation quote verifies
```

**Rule:** every module reads inputs from `artifacts/` and writes **evidence records** (section 4) to `artifacts/evidence/*.jsonl`. Modules never call each other directly, so they can be built in parallel and integrated by file contract.

---

## 3. Repository layout and environment

```
trustlens/
├── pyproject.toml            # deps + `trustlens` CLI entry point (typer)
├── docker-compose.yml        # api (FastAPI) + dashboard (Streamlit)
├── configs/default.yaml      # paths, thresholds, weights, seeds
├── keys/                     # dev keys only (gitignored in real use)
├── artifacts/                # generated: data/, models/, evidence/, receipts/, ledger.db
├── trustlens/
│   ├── common/      schema.py  hashing.py  config.py  io.py  adapters.py
│   ├── attacks/     make_contributors.py  badnets.py  augment.py
│   ├── training/    models.py (PreAct-ResNet18)  train.py
│   ├── data_scanner/ embeddings.py  duplicates.py  ood.py  labels.py  poison.py  contributor_metrics.py
│   ├── model_auditor/ signature.py  fingerprint.py  neural_cleanse.py  audit.py
│   ├── risk/        fusion.py  trace.py
│   ├── provenance/  receipts.py  merkle_log.py  verify_cli.py
│   ├── tee/         measurement.py  attestation_mock.py  key_broker.py  crypto_box.py
│   ├── api/         service.py (FastAPI: /attestation /infer /ledger /keys)
│   └── app/         dashboard.py (Streamlit, multipage)
├── scripts/  run_all.sh  demo_tamper.sh  eval.py
├── tests/    test_merkle.py  test_receipts.py  test_attestation.py  test_fusion.py
└── THIRD_PARTY.md            # attribution: BackdoorBench (CC BY-NC 4.0), ART (MIT), model-signing (Apache-2.0)
```

**Environment**

- Python 3.11. Training and Neural Cleanse run on Colab/Kaggle (T4 GPU); everything else runs on a laptop CPU.
- Dependencies: `torch torchvision open_clip_torch faiss-cpu imagehash cleanlab scikit-learn adversarial-robustness-toolbox model-signing cryptography pydantic fastapi uvicorn streamlit typer pyyaml pillow numpy pandas`.
- **Don't pip-install BackdoorBench.** Port `attack/badnet.py` logic and `defense/nc.py` into our modules, and credit them in `THIRD_PARTY.md`.
- Seeds fixed (`seed: 42`) everywhere, so every run gives the same splits and results.

---

## 4. Shared contracts (freeze on day 1)

### 4.1 Evidence record (`trustlens/common/schema.py`)

Every finding from every module uses this shape, one JSON object per line:

```json
{
  "evidence_id": "ev-000123",
  "module": "data_scanner.duplicates",
  "subject_type": "sample | contributor | model | receipt",
  "subject_id": "C5/img_04211",
  "contributor": "C5",
  "check": "near_duplicate",
  "score": 0.973,
  "threshold": 0.95,
  "flagged": true,
  "confidence": "high | medium | low",
  "method": "CLIP ViT-B/32 cosine + FAISS kNN (k=10)",
  "access_level": "white-box | grey-box | black-box | n/a",
  "artefacts": ["artifacts/evidence/img/dup_C5_04211.png"],
  "details": {"nearest": "C5/img_00310"},
  "created_at": "2026-10-01T10:22:03Z",
  "sha256": "<hash of this record without this field>"
}
```

### 4.2 Sample manifest (`artifacts/data/manifest.parquet`)

`sample_id, contributor, path, label, orig_label, sha256, gt_attack` (`gt_attack` is ground truth: `none | badnets | flip | dup | ood`, used **only** by `scripts/eval.py`, never by detectors).

### 4.3 Plugin interfaces (`trustlens/common/adapters.py`)

```python
class DatasetAdapter:          # CIFAR10Adapter now; GTSRBAdapter, COCOAdapter later
    def samples(self) -> Iterable[Sample]: ...
    def num_classes(self) -> int: ...

class ModelAdapter:            # ResNet18Adapter now; YOLOAdapter later
    def predict_proba(self, x) -> np.ndarray: ...
    def features(self, x) -> np.ndarray: ...          # penultimate layer (for AC/spectral/trace)
    def torch_module(self) -> nn.Module | None: ...   # None = black-box
    def access_level(self) -> str: ...
```

Detectors only use these interfaces, which is how we meet "not hard-coded to a single architecture".

---

## 5. Module specifications

### 5.1 Attack simulation: `attacks/` (owner A, day 1)

- Split the CIFAR-10 train set (50,000 images) into **5 contributors × 10,000**, stratified by class.
- **C1, C2:** clean.
- **C3 (backdoor):** BadNets, a 3×3 white patch in the bottom-right corner (BackdoorBench `resource/badnet/generate_white_square.py` logic). Stamp **5% of C3 (500 images)** from non-target classes and relabel them to **target class 0 (airplane)**.
- **C4 (label flips):** swap labels on 20% of its *cat* (3) and *dog* (5) images, about 400 images.
- **C5 (flooding + OOD):** pick 300 images and add 5 augmented near-copies each (flip, crop ±4 px, colour jitter, JPEG q=60), about 1,500 images. Add 300 **OOD** images from CIFAR-100 classes absent from CIFAR-10 (e.g. *apple, bridge, maple_tree*) with random CIFAR-10 labels. Drop the same number of original C5 images so C5 still has 10,000.
- Encrypt each contributor batch with AES-256-GCM (`tee/crypto_box.py`); the keys go to the key broker.
- Output: `artifacts/data/{C1..C5}/`, `manifest.parquet` including `gt_attack`.

### 5.2 Model training: `training/` (owner B, day 1, on Colab)

- **Reference model** (the "vendor's clean model"): PreAct-ResNet18 trained on the original clean CIFAR-10.
- **Pool model** (the "substituted model"): the same architecture trained on the **contributed pool** (with C3's poison, C4's flips and C5's flooding). It carries the backdoor.
- SGD (lr 0.1, momentum 0.9, wd 5e-4), cosine schedule, **30 epochs** (not BackdoorBench's default 100), batch 128, AMP. Target: clean accuracy ≥ 90%, attack success rate ≥ 90% for the pool model.
- Save `artifacts/models/reference/model.pt` and `artifacts/models/pool/model.pt` plus a config file each. **Sign the reference model** with `model-signing` (EC key, offline): `model_signing sign key artifacts/models/reference --private-key keys/vendor.priv --signature artifacts/models/reference.sig`.

### 5.3 Data scanner: `data_scanner/` (owner A, days 2–3)

| Check | Method | Output per sample | Contributor metric |
|---|---|---|---|
| Embeddings | open_clip ViT-B/32 (`laion2b_s34b_b79k`), images upscaled to 224, L2-normalised, cached to `embeddings.npy` | 512-d vector | — |
| Near-duplicates | pHash pre-filter (Hamming ≤ 6) + FAISS `IndexFlatIP` k=10; near-dup if cosine ≥ 0.95 (tune on a known augmented pair set) | dup cluster id, nearest neighbour | `dup_rate` = share of samples in a dup cluster of size ≥ 3 |
| OOD | Mean cosine distance to the k=10 nearest neighbours in **other contributors'** data (zero-trust peer reference); flag above the pool's 99th percentile | `ood_score` | `ood_rate` |
| Label issues | Logistic regression on CLIP embeddings, 5-fold `cross_val_predict` probabilities → `cleanlab.filter.find_label_issues` (independent of the possibly poisoned model) | `label_issue`, suggested label | `label_issue_rate` + confusion pair (e.g. cat↔dog) |
| Poison (trigger) | ART `ActivationDefence` (nb_clusters=2, PCA to 10 dims) and `SpectralSignatureDefense` (expected_pp_poison=0.05) on the pool model's penultimate features via `PyTorchClassifier` | `poison_flag`, cluster size | `poison_rate`, affected class |
| Class skew | Jensen–Shannon divergence of the contributor's label histogram vs. the pool | — | `class_skew` |

Output: `artifacts/evidence/data_scanner.jsonl` + `contributor_metrics.csv` + example images for the dashboard.

### 5.4 Model auditor: `model_auditor/` (owner B, days 2–3)

Checks run in order of access level; each result says which level it used:

1. **Signature (any access):** `model_signing` verify against `vendor.pub`. A mismatch means **substituted or modified**.
2. **Probe fingerprint (black-box):** a fixed probe set of 200 held-out images. Compare the top-1 agreement and the KL divergence of the outputs with the reference model's recorded fingerprint. Agreement below 0.9 counts as behavioural drift.
3. **Neural Cleanse (white-box):** ported from BackdoorBench `defense/nc.py`. For each class *t*, optimise mask *m* and pattern *p* to minimise `CE(f((1−m)·x + m·p), t) + λ·‖m‖₁` on 5,000 clean held-out images (λ starts at 1e-2 and is adapted as in NC; about 2 epochs per class on a T4). Compute the anomaly index of each class's ‖m‖₁ with MAD (median absolute deviation); a class whose index is above 2 on the small side is the backdoor target. Export `mask_t.png`, `pattern_t.png` and `trigger_t.png`.
4. **Verdict:** `clean | suspicious | backdoored`, with confidence and access level, written to `artifacts/evidence/model_auditor.jsonl`.

### 5.5 Risk engine and trace: `risk/` (owners A + B, day 4)

**Fusion (`fusion.py`).** For each contributor *c* and metric *k* ∈ {poison_rate, label_issue_rate, dup_rate, ood_rate, class_skew}, compare *c* with its peers using a robust z-score:

```
z_k(c) = (x_k(c) − median_k) / (1.4826 · MAD_k + ε)
risk(c) = Σ_k w_k · max(0, z_k(c))        weights: poison 0.35, label 0.25, dup 0.20, ood 0.10, skew 0.10
trust(c) = 100 · exp(−risk(c) / 5)         flagged if any z_k(c) ≥ 3.5
```

Weights and thresholds live in `configs/default.yaml`. Each contributor's result links to the evidence records behind it, which forms its **evidence pack**.

**Trigger-to-source trace (`trace.py`), the headline feature:**

1. Take Neural Cleanse's recovered mask *m*, pattern *p* and target class *t*.
2. **Pixel match:** for each training sample labelled *t*, compute `s_pix = 1 − ‖m ⊙ (x − p)‖₁ / ‖m‖₁`.
3. **Feature match:** stamp the trigger onto 500 clean held-out images and take the mean penultimate feature (the "trigger signature"). For each sample labelled *t*, `s_feat = cos(feature(x), signature)`.
4. `s = 0.5·s_pix + 0.5·s_feat`. Candidates are samples with *s* above the 99th percentile of class *t*, combined with the Activation Clustering flags.
5. Group the candidates by contributor. The dominant contributor is reported as **the source**, with its share, the candidate images and the scores.
6. `scripts/eval.py` reports **trace recall** (the share of C3's 500 poisoned images recovered) and precision.

### 5.6 Provenance: `provenance/` (owner C, days 1–3)

**Receipt format** (canonical JSON: sorted keys, no whitespace, UTF-8):

```json
{
  "receipt_id": "rc-20261002-000042",
  "issued_at": "2026-10-02T11:04:55Z",
  "input_sha256": "…",
  "model_manifest_sha256": "…",          // from model_signing digest of the model dir
  "pipeline_sha256": "…",                // SHA-256(preprocess config + git commit + service measurement)
  "output": {"label": 0, "top3": [[0, 0.97], [8, 0.02], [1, 0.01]]},
  "service": {"measurement": "…", "quote_id": "q-…"},
  "prev_receipt_sha256": "…",            // hash chain
  "signature": "base64(Ed25519 over all fields above)"
}
```

- **Signing:** an Ed25519 key is generated *inside* the service at start-up and never written to disk. Its public key hash goes into the attestation `report_data` (section 5.7).
- **Merkle log (`merkle_log.py`):** SQLite table `leaves(idx, receipt_id, leaf_hash, payload)`. Hashing follows RFC 6962: `leaf = SHA-256(0x00 ‖ data)`, `node = SHA-256(0x01 ‖ left ‖ right)`. It exposes `root()`, `inclusion_proof(idx)` and `verify_proof()`. Evidence records and audit reports are logged too, not just receipts.
- **Verifier CLI:** `trustlens verify receipt.json --input img.png --model artifacts/models/reference --quote quote.json`. It checks, and says **which** check failed:
  1. the signature
  2. the input hash
  3. the model manifest hash
  4. the attestation quote and its binding to the signing key
  5. inclusion in the Merkle log against the published root

### 5.7 TEE layer: `tee/` (owner C, days 2–3; Gramine stretch on day 6)

The mock copies the real SGX DCAP check (BlindAI `client/blindai/_dcap_attestation.py`) so that real hardware can replace it without changing the API.

| Real SGX concept | Our mock |
|---|---|
| MRENCLAVE (code measurement) | `measurement = SHA-256(all service .py files + config)` (`measurement.py`) |
| Intel-signed quote | JSON quote `{measurement, report_data, debug, nonce, issued_at}` signed by a **platform key** standing in for Intel's root |
| `report_data` binds the enclave's key | `report_data = SHA-256(receipt_signing_pubkey)` |
| Manifest of accepted enclaves | `configs/allowed_measurements.yaml` (like BlindAI's `manifest.toml`) |
| `allow_debug = false` | Quotes with `debug: true` are rejected |

The **key broker** (`key_broker.py`) holds the contributor batch keys and the model key. It releases them only when `POST /keys/release` includes a fresh quote (nonce under 60 s old) whose measurement is on the allowlist.

**Demo:** edit one line of the service code; its measurement changes and the key broker refuses to release keys.

The dashboard and README label this clearly as a **mock**. The stretch goal on day 6 is to run the FastAPI inference service under `gramine-direct` (or a confidential VM if credits allow) to show the same code runs in a real TEE runtime.

### 5.8 API and dashboard: `api/`, `app/` (owner C, days 4–5)

**FastAPI (`service.py`)**

| Endpoint | Purpose |
|---|---|
| `GET /attestation?nonce=` | Returns the quote |
| `POST /infer` (image) | Returns the prediction + signed receipt, and appends it to the Merkle log |
| `GET /ledger/root` | Current Merkle root |
| `GET /ledger/proof/{receipt_id}` | Inclusion proof |
| `POST /keys/release` | Key broker; needs a valid quote |

**Streamlit pages**

1. **Overview:** trust leaderboard (5 contributors), model verdict, ledger root, attestation status.
2. **Contributor drill-down:** metric z-scores, duplicate clusters side by side, label issues with suggested labels, OOD examples, poison flags.
3. **Model audit:** signature result, fingerprint agreement, Neural Cleanse L1-norm bar chart per class with the anomaly index, recovered trigger image.
4. **Trace:** trigger → candidate images → contributor breakdown (the headline page).
5. **Receipts:** upload a receipt and its input → a pass/fail line for each check; "tamper" buttons for the demo.
6. **Ledger:** latest entries, root history, inclusion-proof viewer.

---

## 6. Day-by-day plan

| Day | A · Data and integration | B · Model security | C · Crypto, TEE and app | End-of-day check |
|---|---|---|---|---|
| **1** (Sep 29) | Repo skeleton, `schema.py`, `manifest`, `make_contributors.py` (all 5 contributors + ground truth), encrypt batches | Port PreAct-ResNet18; train **reference** and **pool** models on Colab; sign the reference model | `hashing.py`, canonical JSON, Ed25519 receipts, Merkle log with tests | Both checkpoints saved; `pytest tests/test_merkle.py` passes; manifest has 50,000 rows |
| **2** (Sep 30) | CLIP embeddings cached; duplicates (pHash + FAISS); OOD score | Signature check + probe fingerprint; start porting Neural Cleanse | `measurement.py`, mock quote issue/verify, allowlist; `verify_cli.py` checks 1–3 | Dup detection finds C5's copies; swapped model fails signature |
| **3** (Oct 1) | cleanlab label issues; ART AC + spectral on pool-model features; `contributor_metrics.csv` | Neural Cleanse runs for all 10 classes; anomaly index; trigger PNG export | Key broker + AES-GCM; `/attestation`, `/infer`, `/ledger` endpoints; verifier checks 4–5 | Class 0 flagged with anomaly index > 2; receipts verify end to end |
| **4** (Oct 2) | `fusion.py` trust scores + evidence packs | `trace.py` with A (pixel + feature match) | Streamlit pages 1, 2, 5, 6 on sample data | Leaderboard ranks C3–C5 lowest; trace names C3 |
| **5** (Oct 3) | `scripts/run_all.sh` one-command pipeline; integration fixes | Model audit + trace pages wired to real outputs | Wire the dashboard to real evidence; tamper buttons | **Gate:** one command → full pipeline → dashboard shows everything |
| **6** (Oct 4) | `eval.py`: precision/recall per attack, leaderboard ranks | Trace recall/precision; NC results table | Tamper test suite; **stretch:** Gramine; Docker Compose | Metrics table filled (section 8) |
| **7** (Oct 5) | Slides (architecture, results, related work) | Record the 3-minute demo video (fallback) | README, THIRD_PARTY.md, final rehearsal ×2 | Demo runs twice with no manual fixes |

**If day 5 slips, cut in this order:** Gramine stretch → OOD page → spectral signatures (keep AC) → probe fingerprint. **Never cut** the trigger-to-source trace or the receipt tamper demo.

**Daily sync:** 15 minutes each morning (blockers and contract changes) and a 10-minute evening check against the end-of-day column.

---

## 7. Testing

| Test | What it proves |
|---|---|
| `test_merkle.py` | Inclusion proofs verify; changing any leaf breaks the root |
| `test_receipts.py` | Changing any field (input hash, output, model hash) breaks the signature; a replayed receipt breaks the `prev` chain |
| `test_attestation.py` | Quotes with the wrong measurement, `debug=true`, a stale nonce or a bad platform signature are rejected; key broker refuses them |
| `test_fusion.py` | A synthetic contributor with an outlier metric gets the lowest trust score |
| `scripts/demo_tamper.sh` | Generates 3 receipts (genuine, model swapped, forged outside the service) and shows verifier output |
| `scripts/eval.py` | Scores every detector against `gt_attack` (ground truth is never seen by detectors) |

---

## 8. Evaluation (fill in on day 6)

| Area | Metric | Target (our goal) | Result |
|---|---|---|---|
| Duplicates (C5) | Recall / precision of near-copies | Recall ≥ 0.9 | |
| Label flips (C4) | Recall / precision of flipped samples | Recall ≥ 0.9 | |
| OOD (C5) | Recall at 99th-percentile threshold | Report | |
| Poison (C3) | AC / spectral recall of the 500 poisoned images | Report | |
| Contributors | Rank of C3, C4, C5 by trust score | Bottom 3 | |
| Model | NC target class correct; anomaly index | Class 0, index > 2 | |
| Trace | Share of C3's poison recovered; share of candidates from C3 | ≥ 0.8 recall | |
| Provenance | Tampered / forged receipts detected | 100% | |
| Cost | Full pipeline time (CPU + cached GPU steps) | Report | |

Targets are our own goals, not published benchmarks; we report what we actually measure, misses included.

---

## 9. Demo script (5 minutes)

1. **Setup (0.5 min):** 5 contributors' encrypted batches and a vendor model arrive. The attestation check passes; the key broker releases keys.
2. **Data scan (1 min):** the leaderboard shows C3, C4, C5 at the bottom. Drill into C5 (duplicate clusters) and C4 (cat↔dog flips).
3. **Model audit (1 min):** the signature fails (model substituted); Neural Cleanse flags class 0 and shows the recovered 3×3 trigger.
4. **Trace (1 min):** one click shows the images carrying that trigger, almost all from **C3**.
5. **Receipts (1 min):** genuine ✓, model swapped ✗ (hash mismatch), forged outside the service ✗ (no valid attestation). Edit one line of the service code and the key broker refuses keys.
6. **Close (0.5 min):** verify a Merkle inclusion proof live. Close with the pitch line: *existing tools say "this sample is bad"; TrustLens says "this contributor can't be trusted, and here is the proof."*

---

## 10. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Colab GPU time runs out on day 1 | Kaggle as backup; 20 epochs is acceptable; commit checkpoints immediately |
| Neural Cleanse too slow for a live demo | Precompute; re-run one class live |
| ART AC weak on the pool model | Spectral signatures + trace scores carry the poison evidence |
| Only 5 contributors makes MAD-based z-scores unstable | Also show the raw metric vs. the peer median; state it in limitations |
| Integration breaks late | File contracts frozen on day 1; each module emits sample JSON from day 2 |
| Judges challenge the TEE mock | Say it up front: the API matches real SGX DCAP (BlindAI pattern); Gramine is the stretch; TEEs prove integrity, not correctness; side-channels exist |

---

## 11. Reference repos: where each one is used

| Repo (in `Reference repo`) | Used in |
|---|---|
| BackdoorBench | 5.1 BadNets trigger, 5.4 Neural Cleanse port (credit, CC BY-NC 4.0) |
| IBM ART | 5.3 ActivationDefence, SpectralSignatureDefense, GroundTruthEvaluator; ProvenanceDefense as a stretch |
| model-transparency (OpenSSF) | 5.2 signing, 5.4 signature check, 5.6 `model_manifest_sha256` |
| BlindAI | 5.7 design of the mock quote, allowlist and `report_data` binding |
| in-toto, SLSA generator | Pitch: processing-chain provenance; provenance for our own release |
| C2PA, EZKL, model-validation-operator, DVC | Pitch / future work: signed frames, ZK inference proofs, deployment gate, data versioning |

---

## 12. After the week (scale-up path for the pitch)

1. Real TEE: Gramine-SGX or confidential VMs (AMD SEV-SNP / Intel TDX); GPU confidential computing for large models.
2. Hyperledger Fabric ledger across organisations; C2PA-signed camera frames at the edge.
3. More adapters: GTSRB, detection models (YOLO) with BadDet attacks from ART; TrojAI evaluation.
4. Stronger attacks: WaNet, SSBA, clean-label; detector ensemble.
5. Deployment gate: only signed, audited models run (model-validation-operator pattern); continuous re-auditing of new contributor batches.

---

## 13. Definition of done

- [ ] `scripts/run_all.sh` runs the whole pipeline from raw CIFAR-10 to dashboard with one command
- [ ] Every flag in the dashboard links to its evidence record and method
- [ ] Trace names C3 with recall reported
- [ ] All 3 tamper cases fail verification with the correct reason
- [ ] Metrics table (section 8) filled in, including misses
- [ ] README, THIRD_PARTY.md, Docker Compose, slides and 3-minute video done
- [ ] Demo rehearsed twice without manual fixes
