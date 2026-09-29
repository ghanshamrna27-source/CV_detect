# TrustLens

**Trustworthy computer-vision integrity assurance for data, models and inference outputs in multi-contributor pipelines** (SIH PS 26228).

Existing tools say *"this sample is bad"*. TrustLens says *"this contributor can't be trusted, and here is the proof."*

TrustLens checks a contributed **dataset**, a supplied **model** and the model's **inference outputs**:

- **Data scanner**: finds near-duplicate flooding, out-of-distribution injection, label flips and trigger poison, then scores every **contributor** against its peers.
- **Model auditor**: signature check (OpenSSF model-signing), black-box probe fingerprint and Neural Cleanse. It recovers the backdoor target class and trigger.
- **Trigger-to-source trace** (the headline feature): matches the recovered trigger against the training pool and names the contributor who planted it.
- **Provenance**: Ed25519-signed inference receipts, bound to the exact input, model manifest and pipeline, chained, and logged in an RFC 6962 Merkle log.
- **TEE layer (mock)**: code measurement, a quote shaped like SGX DCAP (BlindAI pattern), `report_data` binding of the receipt key, and a key broker that releases dataset keys only to an allowlisted, fresh, non-debug service.

> The TEE is a **mock**. The quote is signed by a local "platform" key standing in for the CPU vendor. The API matches real SGX DCAP checks, so real hardware (Gramine / TDX / SEV-SNP) replaces the backend without changing callers.

## Quick start

Requires Python 3.11 and a CUDA GPU (recommended; CPU works but training is slow).

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    Linux/macOS: source .venv/bin/activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124   # or /cpu
pip install -e ".[dev]"

trustlens --profile quick run-all     # 5 x 2,000 images: ~15 min on a laptop GPU (writes artifacts-quick/)
trustlens run-all                     # the full plan: 5 x 10,000 images, 30 epochs
trustlens dashboard                   # http://localhost:8501
trustlens serve                       # http://localhost:8000/docs
pytest                                # Merkle, receipts, attestation, fusion tests
```

`run-all` runs every step: keys → allowlist → prepare → train → sign → scan → audit → risk → trace → demo-tamper → eval. The steps can also run on their own (`trustlens --help`).

## Verifying a receipt

```bash
trustlens verify artifacts/receipts/demo/genuine.json --input artifacts/receipts/demo/input.png \
    --model artifacts/models/reference
#   [PASS] 1. signature          Ed25519 signature valid
#   [PASS] 2. input_hash         input matches the receipt
#   [PASS] 3. model_manifest     receipt was produced by the approved model
#   [PASS] 4. attestation        signing key bound to an attested, allowlisted service
#   [PASS] 5. merkle_inclusion   leaf 12 included in tree of size 40 (root 3f1c…)
# VERIFIED
```

`scripts/demo_tamper.sh` shows the genuine, model-swapped and forged cases side by side. `trustlens demo-tamper` also checks edited outputs, swapped inputs, modified service code, debug enclaves, replayed nonces and replayed receipts.

## Layout

```
configs/default.yaml        paths, attack mix, thresholds, weights, seeds (quick.yaml = small profile)
trustlens/
  common/        schema.py (evidence record)  hashing.py  config.py  io.py  adapters.py (plugin interfaces)
  attacks/       make_contributors.py  badnets.py  augment.py
  training/      models.py (PreAct-ResNet18)  train.py
  data_scanner/  embeddings.py  duplicates.py  ood.py  labels.py  poison.py  contributor_metrics.py  scan.py
  model_auditor/ signature.py  fingerprint.py  neural_cleanse.py  audit.py
  risk/          fusion.py  trace.py
  provenance/    receipts.py  merkle_log.py  verify_cli.py  tamper_demo.py
  tee/           measurement.py  attestation_mock.py  key_broker.py  crypto_box.py  enclave.py
  api/           service.py (FastAPI: /attestation /infer /ledger /keys)
  app/           dashboard.py (Streamlit: overview, contributors, model audit, trace, receipts, ledger, attestation, evaluation)
  evaluation.py  scores detectors against ground truth (the only reader of gt_attack)
scripts/  run_all.sh  run_all.ps1  demo_tamper.sh  eval.py
tests/    test_merkle.py  test_receipts.py  test_attestation.py  test_fusion.py
```

**File contract.** Modules never call each other directly. Each one reads from `artifacts/` and writes evidence records (`artifacts/evidence/*.jsonl`, one sealed JSON object per finding with a method, score, threshold, confidence, access level and artefact links). Evidence files, audit and risk reports, receipts and key-broker decisions are all logged in the Merkle log (`artifacts/ledger.db`).

**Not hard-coded to one model or dataset.** Detectors only use `DatasetAdapter` and `ModelAdapter` (`trustlens/common/adapters.py`). CIFAR-10 and PreAct-ResNet18 are the current adapters; GTSRB, COCO and YOLO would be new adapters.

## The simulated attack

| Contributor | Behaviour | Ground truth |
|---|---|---|
| C1, C2 | clean | — |
| C3 | BadNets: 3×3 white patch bottom-right on 5% of its images, relabelled to class 0 (airplane) | `badnets` |
| C4 | 20% of cat and dog labels swapped | `flip` |
| C5 | 300 images × 5 augmented near-copies, and 300 CIFAR-100 OOD images with random labels | `dup`, `dup_source`, `ood` |

Contributor batches are sealed with AES-256-GCM. The scanner only gets the keys after the key broker verifies its attestation quote.

## Results (full run: 5 × 10,000 CIFAR-10 images, 30 epochs, RTX 2050 laptop GPU)

Targets are our own goals, not published benchmarks. We report what we measure, misses included. The file is regenerated on every run as `artifacts/evidence/eval.md` and shown on the dashboard's Evaluation page.

| Area | Metric | Target (our goal) | Result |
|---|---|---|---|
| Models | Clean accuracy / attack success rate | ≥ 0.90 / ≥ 0.90 (pool) | reference 0.928 / 0.008 · pool **0.920 / 0.915** |
| Duplicates (C5) | Recall / precision of near-copies | Recall ≥ 0.9 | 0.790 / 0.460 (**miss**; see notes) |
| Label flips (C4) | Recall / precision within C4 | Recall ≥ 0.9 | 0.875 / 0.900 (**just below target**) |
| OOD (C5) | Recall / precision at p99 threshold | Report | 0.553 / 0.332 |
| Poison (C3) | AC / spectral / combined recall | Report | 0.856 (precision 1.00) / 0.488 / 0.878 |
| Contributors | Rank by trust, lowest first | C3, C4, C5 bottom 3 | C5 22.9 · C3 28.9 · C4 65.9 · C2 99.95 · C1 100 (**yes**, all three flagged) |
| Model | Neural Cleanse target; anomaly index | Class 0, index > 2 | **class 0; 3.17** (mask L1 3.2 ≈ the 3×3 patch) |
| Model | Signature check on the supplied model | Fails | **fails** (hash mismatch for `model.pt`, `config.json`) |
| Trace | Recall of C3's poison; share of candidates from C3 | ≥ 0.8 recall | **0.866; 0.919** (source = C3, precision 0.896) |
| Provenance | Tampered / forged receipts detected | 100% | **6/6**; genuine receipt passes |
| Cost | Wall time per step | Report | train ≈ 35 s/epoch per model (≈ 35 min for both) · scan 64 s · audit (NC, 10 classes × 1,000 steps) 579 s · risk/trace/tamper < 2 s each |

Notes on the misses: CIFAR-10 contains natural near-duplicates, so about 3.4% of each clean contributor also sits in duplicate clusters. That limits sample-level precision, but C5's rate (17%) still stands out clearly in the contributor view. OOD recall is limited because some CIFAR-100 classes (e.g. *orange*, *pear*) sit close to CIFAR-10 content in CLIP space.

### Where we deviated from the plan, and why

- **Pool-model augmentation is random crop only (no horizontal flip).** With flip, the corner trigger lands on both corners and the backdoor did not take within 30 epochs (ASR ≈ 6% on the small profile). Without flip, ASR is 0.915.
- **Duplicate detection:** CLIP kNN *proposes* pairs and a flip/shift-aligned pixel correlation *confirms* them. CLIP cosine alone could not separate augmented copies from ordinary CIFAR neighbours on upscaled 32×32 images: copies scored as low as 0.57 while unrelated neighbours reached 0.95.
- **Activation Clustering** uses 5-means per class, and flags a small cluster only when the independent CLIP view disagrees with its label for ≥ 50% of its members. ART's default 2-means split never isolated the poison at full scale; its result is still reported as a cross-check (`art_ac_flag`).
- **Neural Cleanse** runs a fixed number of optimisation steps per class (1,000) rather than epochs. With few steps, the masks never shrank to the real trigger.
- CIFAR is downloaded from the HuggingFace mirror (`uoft-cs/cifar10`, `uoft-cs/cifar100`), with torchvision as the fallback. The original host throttled to ~90 kB/s and dropped connections.

## Limitations

- The TEE is a mock (see above). TEEs prove *which code ran*, not that the code is correct, and side channels exist.
- Neural Cleanse targets patch-like triggers. Invisible or sample-specific triggers (WaNet, SSBA) need other reconstruction methods.
- With 5 contributors, the median/MAD are estimated from 5 points. The dashboard shows raw values and peer medians next to every z-score.
- A valid model signature proves origin and integrity, not the absence of a backdoor.

Attribution: see [THIRD_PARTY.md](THIRD_PARTY.md). BackdoorBench-derived parts are CC BY-NC 4.0.
