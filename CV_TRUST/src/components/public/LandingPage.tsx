import React from "react";
import {
  Shield,
  ArrowRight,
  Database,
  BrainCircuit,
  ScanLine,
  ScrollText,
  CheckCircle2,
  Lock,
  Layers,
  FileText,
  Activity,
  ChevronRight
} from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";

export const LandingPage: React.FC = () => {
  const { setMode, setActiveTab } = useAssurance();

  const handleAccessConsole = () => {
    setMode("console");
    setActiveTab("overview");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* LANDING HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900">VERIVISION</span>
              <span className="text-xs text-slate-500 block font-medium">Computer Vision Assurance</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <button onClick={() => scrollToSection("hero")} className="hover:text-blue-600 transition-colors">
              Overview
            </button>
            <button onClick={() => scrollToSection("capabilities")} className="hover:text-blue-600 transition-colors">
              Capabilities
            </button>
            <button onClick={() => scrollToSection("workflow")} className="hover:text-blue-600 transition-colors">
              Workflow
            </button>
            <button onClick={() => scrollToSection("architecture")} className="hover:text-blue-600 transition-colors">
              Architecture
            </button>
          </nav>

          <button
            onClick={handleAccessConsole}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm"
          >
            <span>Access Console</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </header>

      <main className="flex-1 pt-24">
        {/* HERO SECTION */}
        <section id="hero" className="py-16 sm:py-24 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>ENTERPRISE VISION ASSURANCE PLATFORM</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Trustworthy Computer Vision <span className="text-blue-600">Integrity Assurance</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Evidence-based assurance for contributed datasets, AI computer-vision models, and inference outputs across multi-contributor defense pipelines.
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleAccessConsole}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-semibold tracking-wide shadow-md transition-all"
                >
                  <span>Access Assurance Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scrollToSection("capabilities")}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-lg text-sm font-semibold tracking-wide border border-slate-300 shadow-xs transition-all"
                >
                  <span>Explore Capabilities</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO BOX CAPABILITY GRID SECTION */}
        <section id="capabilities" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">Platform Capabilities</h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Structured Verification Across the AI Supply Chain
            </p>
            <p className="text-xs text-slate-500">
              Four modular assurance engines designed specifically for multi-contributor pipelines.
            </p>
          </div>

          {/* Bento Box Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Box 1: Dataset Integrity (Col span 7) */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
              <div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Dataset Integrity Assurance</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Automated anomaly screening for contributed vision training sets across images, bounding boxes, and contributor batches.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-slate-700">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Suspicious sample isolation</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Label anomaly detection</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Near-duplicate extraction</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Out-of-distribution (OOD) screening</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Supported: COCO, YOLO, VOC, ZIP</span>
                <button onClick={handleAccessConsole} className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  Inspect module →
                </button>
              </div>
            </div>

            {/* Bento Box 2: Model Security (Col span 5) */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-all">
              <div>
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Model Security & Backdoors</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Deep inspection of vision model parameters, layer norms, and backdoor trigger vulnerabilities.
                </p>

                <div className="space-y-2 text-xs font-medium text-slate-700">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>SHA-256 weight checksums</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Backdoor trigger pattern grid</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Behavioural consistency matrix</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Supported: ONNX, PyTorch, TorchScript</span>
                <button onClick={handleAccessConsole} className="text-purple-600 font-semibold hover:underline flex items-center gap-1">
                  Inspect module →
                </button>
              </div>
            </div>

            {/* Bento Box 3: Inference Provenance (Col span 5) */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                  <ScanLine className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Inference Provenance Chain</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Cryptographic verification linking input frames, model binaries, runtime configs, and output predictions.
                </p>

                <div className="space-y-2 text-xs font-medium text-slate-700">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Input image cryptographic hash match</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>RSA-4096 signature verification</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Chain: Input → Model → Config → Output</span>
                <button onClick={handleAccessConsole} className="text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                  Inspect module →
                </button>
              </div>
            </div>

            {/* Bento Box 4: Governance & Reports (Col span 7) */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
              <div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                  <ScrollText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Governance & Assurance Reports</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Immutable audit trail generating formal technical assurance reports with clear disposition recommendations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-slate-700">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Evidence-based findings rationale</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Accept / Review / Quarantine actions</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Chronological audit trail ledger</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Export JSON & PDF printable reports</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Format: Technical Document Preview</span>
                <button onClick={handleAccessConsole} className="text-amber-600 font-semibold hover:underline flex items-center gap-1">
                  Inspect module →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW SECTION */}
        <section id="workflow" className="py-20 bg-slate-100 border-t border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
              <h2 className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">Assurance Workflow</h2>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                6-Phase Systematic Evaluation Workflow
              </p>
              <p className="text-xs text-slate-500">
                Rigorous operational protocol from raw artifact intake to formal disposition authorization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 font-mono text-xs">
              {[
                { num: "01", title: "INGEST", desc: "Local intake of datasets, ONNX/PyTorch models, or inference payloads." },
                { num: "02", title: "ANALYSE", desc: "Execute duplicate, label anomaly, and parameter distribution scans." },
                { num: "03", title: "VERIFY", desc: "Perform adversarial trigger scans and SHA-256 checksum verification." },
                { num: "04", title: "CORRELATE", desc: "Cross-examine findings against contributor trust profiles." },
                { num: "05", title: "ASSURE", desc: "Assign formal disposition: ACCEPT, REVIEW, or QUARANTINE." },
                { num: "06", title: "REPORT", desc: "Generate technical audit report with coverage disclosures." }
              ].map((step) => (
                <div key={step.num} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2">
                  <div className="text-xl font-bold text-blue-600">{step.num}</div>
                  <div className="font-bold text-slate-900 text-xs">{step.title}</div>
                  <p className="text-[11px] text-slate-500 font-sans leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ARCHITECTURE SECTION */}
        <section id="architecture" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">Client-Side Execution</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Designed for Controlled Environment Evaluation
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                VERIVISION operates browser-side using deterministic Web Crypto API hash algorithms. All dataset scans, model layer weight checks, and inference chain verifications process locally without external network dependencies.
              </p>
            </div>

            <div className="lg:col-span-4 text-center lg:text-right">
              <button
                onClick={handleAccessConsole}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-md transition-all"
              >
                <span>Launch Console →</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* CORPORATE FOOTER */}
      <footer className="bg-white border-t border-slate-200 text-slate-500 py-12 font-sans text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-sm">VERIVISION</span>
          </div>

          <p className="text-slate-500 text-center md:text-left">
            Computer Vision Integrity Assurance Platform. Designed for dataset, model, and inference verification.
          </p>

          <p className="font-mono text-slate-400">© 2026 VERIVISION</p>
        </div>
      </footer>
    </div>
  );
};
