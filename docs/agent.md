# agent.md: TrustLens implementation handover

Read this before changing anything in `D:\SIH\PS228\trustlens`. It records what was built, how it fits together, the decisions made along the way (and why), the measured results, and the traps already hit.

Last updated: 29 Sep 2026.

---

## 1. Context

**Problem statement:** SIH PS 26228, *Trustworthy Computer Vision Integrity Assurance for Data, Models and Inference Outputs in Multi-Contributor Pipelines* (MoD / Indian Army DGIS).

**Source documents (this folder):**

| File | What it is |
|---|---|
| `TrustLens_Implementation_Plan_1.md` | The build plan: architecture, module specs (sections 5.1–5.8), contracts, evaluation table, demo script. **The implementation follows it section by section.** |
| `Reference_Repos_Analysis_1.md` | Analysis of the 10 reference repos in `..\Reference repo\` (ART, BackdoorBench, model-transparency, BlindAI, in-toto, C2PA, EZKL, DVC, model-validation-operator, SLSA). Says which ones to use now and which ones are pitch only. |

**Other folders in `D:\SIH\PS228`:**

- `CV_TRUST\`: a separate, browser-only React/TanStack mock UI (simulated results, no backend). **It was not modified** and is not connected to TrustLens.
- `Reference repo\`: the zips analysed in the reference doc. Nothing is imported from them. Only logic was ported (BackdoorBench) or used as a design reference (BlindAI); the libraries come from PyPI.
- `trustlens\`: **the platform that was built** (everything below).

**One-line pitch:** existing tools say *"this sample is bad"*; TrustLens says *"this contributor can't be trusted, and here is the proof."*

---

## 2. What was built (summary)

A Python platform that:

1. Simulates 5 contributors to CIFAR-10: C1 and C2 are clean, C3 plants a BadNets backdoor, C4 flips cat↔dog labels, and C5 floods near-duplicates and injects OOD images.
2. Seals each contributor batch with AES-256-GCM. The keys are released only to an **attested** service (mock SGX-style quote plus key broker).
3. Scans the data (duplicates, OOD, label issues, poison) and scores **each contributor** with peer-relative robust z-scores.
4. Audits a supplied model: OpenSSF model-signing signature, black-box probe fingerprint, and Neural Cleanse.
5. **Traces the recovered backdoor trigger back to the contributor who planted it** (the headline feature).
6. Issues Ed25519-signed inference receipts bound to input, model manifest and pipeline, hash-chained and logged in an RFC 6962 Merkle log. A CLI verifier names the exact failing check.
7. Serves a FastAPI service and a Streamlit dashboard with 8 pages.

Everything runs with one command: `trustlens run-all`.

---

## 3. Environment

| Item | Value |
|---|---|
| OS | Windows 11; shell tools: PowerShell and Git Bash |
| Python | **3.11** venv at `trustlens\.venv` (system default is 3.14, which is too new for torch/faiss; don't use it) |
| GPU | NVIDIA RTX 2050, **4 GB**: memory is tight, so batch everything |
| Torch | CUDA 12.4 wheels (`--index-url https://download.pytorch.org/whl/cu124`) |
| Key packages | torch, torchvision, open_clip_torch, faiss-cpu, imagehash, cleanlab, scikit-learn, adversarial-robustness-toolbox, model-signing, cryptography, pydantic, fastapi, uvicorn, python-multipart, streamlit, altair, typer, pyyaml, pillow, numpy, pandas, pyarrow, httpx, pytest |
| Install | `pip install -e ".[dev]"` inside the venv (package is editable-installed) |
| Not a git repo | Nothing has been committed. `code_commit()` in the service falls back to `"nogit"`. |

---

## 4. Repository layout (`D:\SIH\PS228\trustlens`)

```
pyproject.toml            package + `trustlens` console script (typer)
configs/
  default.yaml            full run: 5 x 10,000 images, 30 epochs (all thresholds/weights/seeds live here)
  quick.yaml              extends default: 5 x 2,000, NC 500 steps, own artifacts dir `artifacts-quick/`
  allowed_measurements.yaml   generated TEE allowlist (gitignored)
keys/                     dev keys: vendor.priv/pub (EC P-256, model signing), platform.priv/pub (Ed25519 mock "Intel" root)
artifacts/                full-run outputs (gitignored)
artifacts-quick/          quick-profile outputs (gitignored)
trustlens/
  cli.py                  all commands; `run-all` orchestrates the pipeline and records timings
  evaluation.py           the ONLY reader of ground truth `gt_attack`; writes eval.json / eval.md
  common/   config.py hashing.py schema.py io.py adapters.py
  attacks/  make_contributors.py badnets.py augment.py
  training/ models.py train.py
  data_scanner/ embeddings.py duplicates.py ood.py labels.py poison.py contributor_metrics.py scan.py
  model_auditor/ signature.py fingerprint.py neural_cleanse.py audit.py
  risk/     fusion.py trace.py
  provenance/ receipts.py merkle_log.py verify_cli.py tamper_demo.py
  tee/      measurement.py attestation_mock.py key_broker.py crypto_box.py enclave.py
  api/      service.py
  app/      dashboard.py
scripts/  run_all.sh run_all.ps1 demo_tamper.sh eval.py
tests/    conftest.py test_merkle.py test_receipts.py test_attestation.py test_fusion.py
Dockerfile, docker-compose.yml (api + dashboard), README.md, THIRD_PARTY.md, .gitignore, .dockerignore
```

**File-contract rule (plan section 2):** modules never call each other's logic directly. Each one reads from `artifacts/` and writes evidence. The exceptions are small shared helpers, such as `scan.model_features` (reused by the trace).

---

## 5. Commands

```powershell
cd D:\SIH\PS228\trustlens
.venv\Scripts\activate

trustlens run-all                        # full pipeline (~1 h: training ~35 min, NC ~10 min)
trustlens --profile quick run-all        # small pipeline (~15 min), writes artifacts-quick/
trustlens run-all --skip-prepare --skip-train   # reuse data + checkpoints

# individual steps, in pipeline order
trustlens keys-init | tee allowlist | prepare | train [--which reference|pool|both] | sign
trustlens scan [--plaintext] | audit [--model DIR] [--access black-box] | risk | trace | demo-tamper | eval
trustlens tee measure
trustlens verify RECEIPT.json --input IMG.png [--model DIR] [--quote Q.json] [--root HEX] [--json]

trustlens serve        # FastAPI on 127.0.0.1:8000 (/docs)
trustlens dashboard    # Streamlit on :8501
pytest                 # 34 tests
```

The profile can also be selected with the env var `TRUSTLENS_PROFILE=quick`. `TRUSTLENS_HOME` overrides the project root, `TRUSTLENS_MODEL_DIR` overrides the model the API deploys, and `TRUSTLENS_PAGE=<url path>` picks the dashboard's opening page (used for headless tests).

`run-all` order: keys → allowlist → prepare → train → sign → scan → audit → risk → trace → demo-tamper → (timings.json) → eval. By default it deletes and restarts the Merkle log (`--fresh-ledger`).

---

## 6. Module-by-module implementation

### 6.1 `common/`

- **config.py**: loads `configs/<profile>.yaml` with `extends:` deep-merge. `ROOT` is the project root (patched by tests). `Paths` gives the artifact dirs, including `broker_store` = `<artifacts>/broker/store.json`. It also provides `seed_everything` and `get_device`.
- **hashing.py**: canonical JSON (sorted keys, no whitespace, UTF-8), SHA-256 helpers, `model_manifest_sha256(dir)` = SHA-256 of the sorted (path, file-sha256) list. This is the `model_manifest_sha256` field in receipts.
- **schema.py**: `EvidenceRecord` (pydantic, plan 4.1) plus `EvidenceWriter`. IDs are `ev-<prefix>-<n>`, with prefixes `dat` (scanner), `mdl` (auditor), `rsk` (fusion) and `trc` (trace). `sha256` is the hash of the record without that field (`sealed()` / `verify_seal()`).
- **io.py**: npz/json helpers, `load_scores()` (merges every `scores_*.parquet` onto the manifest), image grids for the dashboard, and `knn()` (FAISS `IndexFlatIP`, numpy fallback).
- **adapters.py** (plan 4.3): `DatasetAdapter` / `CIFAR10Adapter`, and `ModelAdapter` / `TorchModelAdapter` (white-box) / `BlackBoxAdapter`. Detectors use only these interfaces.

### 6.2 `attacks/` (plan 5.1)

- **Data source:** the HuggingFace parquet mirror (`uoft-cs/cifar10`, `uoft-cs/cifar100`) is downloaded with resume and retry into `artifacts/raw/hf/`. It falls back to torchvision. CIFAR-100 class names come from the parquet schema metadata.
- Stratified split into C1–C5. Per-contributor attacks come from the config:
  - **C3:** BadNets, a 3×3 white patch at the bottom-right on `rate`× of the contributor's non-target images, relabelled to class 0. That is 500 images on the full run; quick uses rate 0.10 = 200.
  - **C4:** 20% of cat and 20% of dog labels swapped (400 on full).
  - **C5:** 3% base images × 5 augmented near-copies (flip, crop ±4 reflect, colour jitter, JPEG q60) = 1,500 copies (`gt=dup`; bases are `dup_source`), plus 3% CIFAR-100 OOD images (apple, bridge, maple_tree, …) with random labels. Originals are dropped so C5 keeps its size.
- **Outputs** (`artifacts/data/`): PNGs per contributor; `manifest.parquet` (sample_id, contributor, path, label, orig_label, sha256, gt_attack); `pool.npz`; `clean.npz` (originals, used to train the reference model); `heldout.npz` (defender held-out from the test split); `evalset.npz` (the rest of the test split); `encrypted/C*.bin` (AES-GCM, AAD = contributor id); `batches.json`; `summary.json`. The batch keys go into the broker store.
- Seeded, so re-running `prepare` reproduces identical images. The AES keys are new each time, so the attested scan still works.

### 6.3 `training/` (plan 5.2)

- **models.py**: PreAct-ResNet18 (BackdoorBench architecture). **Normalisation is inside the model**, so every caller feeds `[0,1]` RGB NCHW. `features()` returns the penultimate 512-d vector. `model.pt` + `config.json` per model dir.
- **train.py**: data kept on the GPU as uint8; augmentation on the GPU; SGD (nesterov) lr 0.1, momentum 0.9, wd 5e-4, OneCycle cosine, batch 128, AMP. Reports clean accuracy and ASR on `evalset`. `config.json` stores `train_set_sha256`, which proves which data trained the model.
- **Augmentation is `[crop]` only (reflect pad 4, no flip).** See decisions (section 9).
- **reference** = trained on the clean originals ("vendor's clean model", signed). **pool** = trained on the contributed pool ("substituted", carries the backdoor).

### 6.4 `data_scanner/` (plan 5.3), orchestrated by `scan.py`

0. **Attested load:** `tee.enclave.attested_pool()` does measure → quote → broker release → decrypt batches → check order against the manifest. `--plaintext` skips this.
1. **embeddings.py:** open_clip ViT-B-32 `laion2b_s34b_b79k`, images upscaled to 224, fp16, L2-normalised, cached by data hash in `artifacts/cache/emb_clip_*.npz`. Frees GPU memory after use. Fallback: reference-model features.
2. **duplicates.py:** FAISS kNN (k=10) on CLIP proposes pairs with cosine ≥ 0.80. They are confirmed by **aligned correlation** ≥ 0.93: NCC of blurred 16×16 grayscale images, maximised over horizontal flip and ±2 px shifts. The windows are built per batch of pairs, because the whole-dataset version ran out of GPU memory. Connected components; `in_dup` if cluster size ≥ 3. The pHash distance is reported as a detail only. `calibrate()` measures scores on known augmented held-out pairs.
3. **ood.py:** mean cosine distance to the 10 nearest samples of *other* contributors (zero-trust peer reference); flags above the pool's 99th percentile.
4. **labels.py:** 5-fold out-of-fold logistic regression on CLIP embeddings → `cleanlab.find_label_issues` (prune_by_noise_rate). It also produces `suggested_label`, which poison detection uses as the independent view.
5. **poison.py:** on **pool-model** penultimate features (cached by data hash **and model manifest hash**).
   - **Activation Clustering (ours):** per class, PCA-10 → **5-means**. A cluster is suspicious if it holds < 25% of its class **and** the CLIP suggested label disagrees with the given label for ≥ 50% of its members.
   - **Spectral Signatures:** top singular vector; flags the top 1.5 × 5% per class.
   - `poison_flag = ac_flag | (ss_flag & class_is_AC_suspicious)`.
   - **ART cross-check** (`art_crosscheck`) runs IBM ART's `ActivationDefence` (2-means, relative-size rule applied manually; see bugs) and `SpectralSignatureDefense` on the same features through an identity-layer `PyTorchClassifier`. Results are stored as `art_ac_flag` and `art_ss_flag` for comparison only.
6. **Evidence:** a sample-level record for every flagged sample, linking the sample PNG and a cluster montage; per-contributor example grids in `artifacts/evidence/img/{dup,labels,ood,poison}/`.
7. **contributor_metrics.py:** poison_rate, label_issue_rate, dup_rate, ood_rate, class_skew (JSD vs pool), affected class and top confusion pair → `contributor_metrics.csv`. The evidence file digest is logged to the Merkle log.

### 6.5 `model_auditor/` (plan 5.4), `audit.py`

1. **signature.py:** `model_signing` Python API (`use_elliptic_key_signer` / `use_elliptic_key_verifier`, offline EC key). The model is signed at the `sign` step as `artifacts/models/reference.sig`. Auditing the pool model against that signature fails with a clean "hash mismatch for config.json, model.pt" message.
2. **fingerprint.py:** 200 held-out probe images. The reference outputs are recorded at `sign` (`reference_fingerprint.npz`); the audit compares top-1 agreement (threshold 0.90) and KL (0.25). Black-box.
3. **neural_cleanse.py** (BackdoorBench `defense/nc.py` port):
   - tanh-parametrised mask and pattern; Adam (lr 0.1, betas 0.5/0.9); CE + cost·‖m‖₁.
   - Cost schedule: init 1e-3, ×1.5 up / ÷1.5^1.5 down, patience 5 rounds of 10 steps.
   - **Fixed step budget:** `steps` per class (full 1000, quick 500), random batches of 128 from `samples` clean held-out images.
   - AMP; GPU sync only once per round.
   - MAD anomaly index; a flagged class is small-side with index > 2.
   - Exports mask/pattern/trigger PNGs and `nc_<model>.npz`.
4. **Verdict:** backdoored (NC target found) / suspicious (signature or drift) / clean, with confidence and access level. Writes `audit.json`, `audit_<model>.json` and `model_auditor.jsonl`, and logs to the Merkle log.

### 6.6 `risk/` (plan 5.5)

- **fusion.py:** robust z per metric = (x − median) / (1.4826·MAD + ε), with the spread **floored per metric** (`risk.mad_floor`) so tiny noise across 5 contributors can't explode. risk = Σ w·max(0, z), with weights poison 0.35, label 0.25, dup 0.20, ood 0.10, skew 0.10. trust = 100·exp(−risk/5); flagged if any z ≥ 3.5. It writes the evidence packs (links to sample evidence ids), `risk.json`, `trust_scores.csv` and `risk.jsonl`.
- **trace.py:** the NC mask m, pattern p and target t.
  - s_pix = 1 − ‖m ⊙ |x − p|‖₁ / ‖m‖₁ (channel mean).
  - s_feat = cosine to the trigger signature (mean pool-model feature of held-out non-t images stamped with the recovered trigger).
  - s = 0.5·s_pix + 0.5·s_feat.
  - **Threshold = 99th percentile of s on known-clean held-out images of class t.** (Using the pool's own 99th percentile would cap recall at about 11%.)
  - Candidates = over-threshold ∪ AC-flagged samples in class t. They are grouped by contributor, and the dominant one is the source.
  - Outputs: `trace.json`, `trace.jsonl`, `scores_trace.parquet`, candidate and stamped-example grids.

### 6.7 `provenance/` (plan 5.6)

- **receipts.py:** the receipt fields from the plan, plus `service.signer_pubkey` (needed to verify the signature and to check the quote binding). The Ed25519 signature is over the canonical JSON without `signature`. `prev_receipt_sha256` forms a hash chain (genesis = 64 zeros); `verify_chain` detects replay and removal.
- **merkle_log.py:** SQLite tables `leaves(idx, receipt_id, kind, leaf_hash, payload, created_at)` and `roots(size, root, created_at)`. RFC 6962 hashing, `audit_path`, and RFC 9162 §2.1.3.2 inclusion verification. Logged kinds: `receipt`, `evidence_batch`, `audit_report`, `risk_report`, `trace_report`, `key_release`. The root is recomputed O(n) per append, which is fine for thousands of entries.
- **verify_cli.py:** 5 checks, each PASS/FAIL/SKIP with a reason: signature; input hash; model manifest vs approved model; attestation (platform signature, allowlisted measurement, not debug, `report_data == SHA-256(signer_pubkey)`, quote id/measurement match); Merkle inclusion (the logged leaf must equal this exact receipt). Quotes are looked up from `artifacts/receipts/quotes/<quote_id>.json`.
- **tamper_demo.py:** 7 cases: genuine; output altered; input swapped; model swapped (a service running the pool model); forged outside the service; modified service code (overridden measurement); debug enclave. Plus key-broker tests (genuine released, modified refused, replayed nonce refused) and chain replay. Writes `tamper_results.json` and the demo receipts in `artifacts/receipts/demo/`.

### 6.8 `tee/` (plan 5.7): **mock**, modelled on BlindAI `_dcap_attestation.py`

- **measurement.py:** SHA-256 over (relative path, file hash) of `trustlens/api`, `provenance`, `tee`, `common`, `training/models.py` **and the active config file(s)**. CRLF is normalised. `overrides=` simulates edits without touching disk.
- **attestation_mock.py:** the quote `{version, quote_id, platform, measurement, report_data, debug, nonce, issued_at}` signed by the platform Ed25519 key. `verify_quote` checks the platform signature, allowlist, debug flag, report_data binding, nonce and freshness. Allowlist helpers.
- **key_broker.py:** `KeyStore` (dev JSON vault) and `KeyBroker` (one-time nonces, TTL 60 s; releases keys only if every check passes; logs each decision to the Merkle log).
- **crypto_box.py:** AES-256-GCM (`TLBOX1` magic + 12-byte nonce).
- **enclave.py:** `EnclaveIdentity` (measurement, in-memory Ed25519 signing key, report_data, quote), `make_broker`, `attested_pool`.

### 6.9 `api/service.py` (plan 5.8)

`InferenceService` loads the deployed model (default: reference) and computes the model manifest hash and the pipeline hash (preprocess config + commit + measurement). It creates its enclave identity and saves its quote. `infer(bytes)` preprocesses (RGB, 32×32 bilinear, /255), predicts, signs the receipt, chains it, appends it to the ledger, and saves the receipt and input.

FastAPI endpoints: `GET /health`, `GET /attestation?nonce=`, `POST /infer` (multipart `file`), `GET /ledger/root`, `GET /ledger/proof/{receipt_id}`, `GET /ledger/entries`, `GET /keys/challenge`, `POST /keys/release` (body `{quote, keys?}`; 403 with the reasons on refusal).

**Do not add `from __future__ import annotations` to service.py.** FastAPI then fails to resolve `UploadFile` or the request body model. `ReleaseRequest` is deliberately at module level.

### 6.10 `app/dashboard.py`

Streamlit `st.navigation` with 8 pages:

1. **Overview:** KPIs, trust leaderboard, model summary.
2. **Contributors:** z-score bars vs peers, duplicate montages, label/OOD/poison grids, evidence record browser with images.
3. **Model audit:** signature, fingerprint, NC L1 bar chart with anomaly index, recovered mask/pattern/trigger.
4. **Trace:** stamped examples, candidate images, candidates by contributor, score histogram vs threshold.
5. **Receipts:** run inference; tamper buttons (genuine / edit output / swap input / forge / swapped model) with per-check results; upload-and-verify.
6. **Ledger:** entries by kind, inclusion-proof viewer, root history.
7. **Attestation:** current measurement vs allowlist; "append a line to a measured file → request keys" demo.
8. **Evaluation:** `eval.md`, `eval.json`, scan summary.

Colours follow the dataviz reference palette: series `#2a78d6`, critical `#d03b3b`. Uses `width="stretch"` (not the deprecated `use_container_width`).

### 6.11 Tests (`tests/`, 34 passing)

The `conftest.home` fixture copies the code and configs to a temp `TRUSTLENS_HOME` with fresh platform keys.

- merkle: known shapes, every proof for n ∈ {1…31}, tamper detection, wrong index/size, SQLite roundtrip, old-root proofs.
- receipts: any field change breaks the signature, a key swap breaks it, chain/replay/removal.
- attestation: good quote; wrong measurement, debug, stale, forged platform, tampered and wrong-key quotes are rejected; broker replay, allowlist, unknown nonce, debug; measurement changes on edit.
- fusion: outlier gets the lowest trust, clean pool has no flags, multiple attackers rank lowest, MAD floor, JSD bounds.

---

## 7. Artifacts produced (per profile dir)

```
data/      manifest.parquet pool.npz clean.npz heldout.npz evalset.npz batches.json summary.json C1..C5/*.png encrypted/*.bin
models/    reference/{model.pt,config.json} pool/{...} reference.sig reference_fingerprint.npz
broker/    store.json                         (batch keys; dev only)
cache/     emb_clip_*.npz feats_pool_*.npy     (keyed by data hash [+ model hash])
evidence/  data_scanner.jsonl model_auditor.jsonl risk.jsonl trace.jsonl
           scores_{dup,ood,labels,poison,trace}.parquet contributor_metrics.csv trust_scores.csv
           scan_summary.json audit.json audit_pool.json nc_pool.npz risk.json trace.json
           tamper_results.json timings.json eval.json eval.md img/...
receipts/  rc-*.json inputs/*.png quotes/q-*.json quote.json demo/{genuine,model_swapped,forged}.json demo/input.png
ledger.db
```

`artifacts/raw/hf/*.parquet` (the dataset download) is shared by both profiles.

---

## 8. Measured results

### Full run (`artifacts/`, 5 × 10,000, 30 epochs)

| Area | Result |
|---|---|
| Models | reference acc 0.928, ASR 0.008 · pool acc 0.920, **ASR 0.915** |
| Duplicates (C5) | recall 0.790 / precision 0.460 (target 0.9: **miss**) |
| Label flips (C4) | recall 0.875 / precision in C4 0.900 (target 0.9: just under) |
| OOD (C5) | recall 0.553 / precision 0.332 |
| Poison (C3) | AC recall 0.856 (precision 1.00) · spectral 0.488 · combined 0.878 · ART-AC (2-means) 0.0 · ART-SS 0.584 |
| Contributors | trust C5 22.9, C3 28.9, C4 65.9, C2 99.95, C1 100; C3/C4/C5 flagged (bottom 3 ✔) |
| Neural Cleanse | target **class 0**, anomaly 3.17, mask L1 3.2 (other classes 30–49) |
| Signature | fails on the pool model ✔ · fingerprint agreement 0.925 (no drift flagged) |
| Trace | source **C3**, 91.9% of 483 candidates, recall 0.866, precision 0.896 ✔ |
| Provenance | 6/6 tampered cases rejected on the right check; genuine passes ✔ |
| Time | train ≈ 35 s/epoch/model (≈ 35 min both) · scan 64 s · audit 579 s · rest < 2 s |

### Quick run (`artifacts-quick/`)

Pool acc 0.804 / ASR 0.835. Dup 0.844/0.682. Flips 0.825/0.917. AC recall 0.700. NC class 0 (anomaly 5.12). Trace → C3 (97.3% of 150, recall 0.725). Ranking C3, C5, C4 bottom 3. Tamper 6/6.

---

## 9. Design decisions and deviations from the plan (with reasons)

| Decision | Why |
|---|---|
| Pool-model augmentation `[crop]`, no flip | With crop+flip the 3×3 corner backdoor reached only ~6% ASR (15 ep) / 76% (30 ep) on the quick pool. Zero padding was worse (46%). Crop-only (reflect pad): 83% quick / 91.5% full. |
| Quick profile C3 rate 0.10, 30 epochs | Keeps the backdoor learnable on the 10k pool. |
| Duplicates = CLIP proposes + aligned pixel NCC confirms (cos ≥ 0.80, NCC ≥ 0.93) | CLIP cosine alone: augmented copies p5 0.57–0.88, while clean CIFAR neighbours reach p99 0.946, so the plan's 0.95 gave recall 0.04. pHash is not flip-invariant. |
| AC with 5-means + independent CLIP disagreement ≥ 50% + size < 25% | At full scale ART-style 2-means split class 0 roughly 47/53 (silhouette 0.11) and never isolated the poison. With k=5 the poison forms a 100%-pure cluster (disagreement 0.98, versus ≤ 0.20 in every clean class). |
| AC size threshold 25% (not 35%) | 35% flagged a natural 33.5% cluster of class 2 on the quick run. |
| Neural Cleanse by step budget, not epochs | 48 steps/class (quick, epochs-based) left masks at L1 200–300 and picked a wrong class. 500–1000 steps recover the real trigger (L1 ≈ 3–9). |
| Trace threshold from **clean held-out** class-t images | The pool's own p99 caps recall at ~11%. |
| Receipt carries `service.signer_pubkey` | The verifier needs the key; trust in it comes from the quote's `report_data` binding (check 4). |
| MAD floor per metric in fusion | With 5 contributors, MAD can be ~0 and blow up z for trivial noise. |
| HuggingFace parquet mirror for CIFAR | cs.toronto.edu throttled to ~90 kB/s and reset connections (corrupted download); HF gives ~560 kB/s. |
| Broker key store per artifacts dir | A shared `keys/broker_store.json` let the quick run overwrite the full run's batch keys. |
| Measurement includes config files | Intentional: a config change is a code-identity change. |

---

## 10. Bugs hit and fixed (don't reintroduce)

1. **Stale feature cache:** pool features were keyed only by the data hash, so a retrained model silently reused old features and AC found nothing. The key now includes `model_manifest_sha256`.
2. **FastAPI + postponed annotations:** `/keys/release` read its body as a query param and `/infer` threw a pydantic "not fully defined" error. Fixed by removing the `__future__` import from service.py and moving `ReleaseRequest` to module level.
3. **GPU OOM at 50k:** the duplicate alignment built 50 windows × 50k images at once (1.4 GB) while CLIP was resident. Now windows are built per pair batch and CLIP memory is freed.
4. **ART bug:** `analyze_by_relative_size` crashes (`x in <empty ndarray>`) when a class has no poison cluster. Workaround: `cluster_analysis="smaller"`, then apply the relative-size rule to `ac.clusters_by_class` yourself. ART's `SpectralSignatureDefense` reads the *last* layer, so the wrapper model is identity layers only (features, not logits).
5. **Shared broker store** (above), and hard-coded `artifacts/...` paths in the manifest writer and the dashboard. Paths are now derived from `Paths`.
6. Test bugs fixed: a tuple-key `**kwargs` in test_fusion; a wrong assumption that a size-6 proof must fail against a claimed size of 7 with the same root (only the root binds the size).

---

## 11. Operational gotchas

- **After editing any measured file** (`trustlens/{api,provenance,tee,common}/*.py`, `training/models.py`, or the active config), run `trustlens [--profile X] tee allowlist`. Otherwise genuine receipts fail attestation and the key broker refuses the scan. This happened once mid-run: editing `default.yaml` made the genuine tamper case fail, which is correct behaviour.
- The laptop may sleep during long runs: one epoch took 4 h. Keep it awake, or use `--skip-prepare --skip-train` to resume.
- `run-all` wipes `ledger.db` by default; individual steps append.
- Re-running `prepare` regenerates AES keys, and the attested scan uses the new ones automatically. The images are byte-identical (seeded); verify with `train_set_sha256` in `models/pool/config.json`.
- The first CLIP use downloads the weights (~600 MB) from HuggingFace (an unauthenticated warning is harmless).
- On Windows, stop specific PIDs (`Stop-Process -Id`) rather than broad `taskkill /IM python.exe` filters.
- Headless dashboard check: set `TRUSTLENS_PAGE=<page>` and use `streamlit.testing.v1.AppTest.from_file("trustlens/app/dashboard.py")`.

---

## 12. Known limitations and next steps

- **The TEE is a mock** (platform key stands in for Intel). The next step from the plan is Gramine or a confidential VM; the API is shaped so only `issue_quote` / platform verification changes.
- The duplicate precision miss (0.46) comes from CIFAR's natural near-duplicates (~3.4% per clean contributor). The label-flip recall of 0.875 is just below the 0.9 target, and OOD recall is 0.55 because some CIFAR-100 classes sit close to CIFAR-10 in CLIP space.
- Spectral signatures are weak here (precision 0.06); AC carries the poison evidence.
- Neural Cleanse handles patch triggers only; WaNet/SSBA would need other methods.
- With only 5 contributors, z-scores are estimated from 5 points; raw values and peer medians are always shown.
- Not done from the plan's "after the week" list: Gramine, Hyperledger Fabric, C2PA frames, in-toto chain, EZKL proofs, YOLO/GTSRB adapters, ART ProvenanceDefense, slides, and the demo video.
- Plan section 13 checklist: the one-command pipeline ✔, evidence links ✔, trace names C3 with recall ✔, tamper cases ✔, metrics table ✔, README/THIRD_PARTY/Docker ✔ (Docker not built/tested here), slides/video ✗.

---

## 13. Licensing reminders

BackdoorBench-derived code (the BadNets trigger, the Neural Cleanse port, the PreAct-ResNet18 architecture) is **CC BY-NC 4.0**, so it is non-commercial only. cleanlab is AGPL-3.0. The rest is MIT/Apache. See `trustlens/THIRD_PARTY.md`.
