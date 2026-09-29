# CV-TRUST — Computer Vision Integrity Assurance Workspace

**Smart India Hackathon (SIH) Problem Statement 26228**  
*Trustworthy Computer Vision Integrity Assurance for Data, Models, and Inference Outputs in Multi-Contributor Pipelines.*

---

## 🛡️ Executive Summary

**CV-TRUST** is an offline-ready, air-gapped **Integrity Assurance Workspace** designed for sensitive defense and multi-contributor intelligence environments. It provides deterministic, client-side cryptographic verification and quality inspection across the entire computer vision asset lifecycle:

$$\text{SELECT ASSET} \longrightarrow \text{DATASET / MODEL / INFERENCE} \longrightarrow \text{ASSESSMENT} \longrightarrow \text{FINDING} \longrightarrow \text{EVIDENCE} \longrightarrow \text{DECISION} \longrightarrow \text{REPORT / AUDIT TRAIL}$$

The platform operates **100% client-side** using browser Web Crypto APIs (`window.crypto.subtle`) for real SHA-256 calculation and Merkle chain audit logging, eliminating external API dependencies and cloud exposure risks.

---

## ✨ Core Capabilities

### 1. ◫ Dataset Integrity Assurance
- **5-Step Inspection Pipeline**: `Upload → Validate → Analyze → Results → Findings → Disposition`.
- **Client-Side SHA-256 Digest**: Computes file hashes locally using standard Web Crypto API.
- **Data Quality Diagnostics**: Evaluates duplicate samples (%), label schema inconsistencies, class distribution shifts, out-of-distribution (OOD) distance metrics, and synthetic trigger patterns.

### 2. ◈ AI Model Verification & Fingerprinting
- **Identity & Weight Verification**: Supports ONNX, PyTorch (`.pt`/`.pth`), and TorchScript (`.ts`) binary files.
- **Fingerprint & Norm Analysis**: Computes weight norms, activation distribution statistics, and reference model similarity.
- **Failure State Testing**: Interactive scenario toggles for SHA-256 fingerprint mismatch detection and backdoor trigger pattern isolation.

### 3. ◌ Inference Provenance Verification
- **Cryptographic Chain Graph**: Tracks `INPUT → MODEL → CONFIG → OUTPUT → SIGNATURE VERIFIED`.
- **Interactive Node Inspector**: Clickable graph nodes reveal full SHA-256 digests, execution nonces, cryptographic signatures (Ed25519), and audit references.
- **Tampering Detection**: Interactive toggle to simulate signature breach failure states and output payload tampering.

### 4. △ Contextual Finding Evidence Drawer
- Slide-over inspection drawer detailing Finding ID, affected asset, confidence rating, "Why Flagged" explanations, observed vs. expected values, and cryptographic digests.
- Direct **Accept**, **Review**, and **Quarantine** disposition controls that automatically record signed entries to the audit trail.

### 5. ≡ Forensic Audit Trail & Assurance Reports
- **Chronological Ledger**: Tracks all analyst actions and verification events with SHA-256 Merkle chain verification (`✓ Integrity Verified`).
- **Defense-Grade PDF/JSON Reports**: Complete technical document preview (`CAR-2026-0927-001`) with executive summaries, findings, checksums, and JSON export.

---

## 🎨 Visual Identity & Precision Glass Enterprise System

The interface adheres strictly to **Precision Glass Enterprise** design standards:
- **Background**: `#F6F8FB` (Crisp light slate with near-white blue-gray undertones)
- **Primary Header & Brand**: `#12304A` (Institutional defense navy)
- **Interactive Elements**: `#2563EB` (Action blue with soft selection pills)
- **Semantic Status Badges**: Secure `#129B68` | Review `#D98B00` | Quarantine `#D92D20`
- **Typography**: Inter / Outfit modern geometric sans-serif with monospace checksum overlays.
- **Responsive Viewports**: Pixel-perfect layout across Desktop Monitors (1920x1080), Laptops (1440x900), Tablets (820x1180), and Mobile Smartphones (390x844).

---

## 🚀 Development & Setup

### Prerequisites
- [Bun](https://bun.sh) (Recommended) or Node.js v18+ with `npm`

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/jaybankar07/pixel-perfect-match.git
cd pixel-perfect-match

# Install dependencies using Bun
bun install

# Start local development server
bun run dev
```

The application will be accessible at `http://localhost:3001/` (or `http://localhost:3000/`).

---

## 📦 Production Build & Verification

To verify production bundle build:

```bash
# Execute Vite production build
bun run build

# Preview production build locally
bun run preview
```

Output bundle will be created in `./dist`.

---

## 🔒 Security & Privacy Disclosure

- **Air-Gapped Operation**: CV-TRUST requires no active internet connection, external LLM APIs, backend servers, or third-party database services.
- **Local Data Handling**: All uploaded dataset archives and model binaries are processed strictly within the browser's local memory and Web Crypto context. No file data is transmitted off the local machine.

---

## 📜 License & Accreditation
Built for **Smart India Hackathon (SIH) 2026 — Problem Statement 26228**. UNCLASSIFIED / PROTOTYPE ENVIRONMENT.
