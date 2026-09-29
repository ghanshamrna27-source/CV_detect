import React, { useState } from "react";
import { ScanLine, CheckCircle2, Loader2, Info, X, ShieldAlert, FileText, Lock } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { calculateSHA256 } from "../../utils/crypto";

export const InferenceVerificationView: React.FC = () => {
  const { addInference, settings } = useAssurance();
  const isDark = settings.theme === "dark";

  const [activeStep, setActiveStep] = useState<number>(5); // 5 = fully verified
  const [isVerifying, setIsVerifying] = useState(false);
  const [scenario, setScenario] = useState<"NORMAL" | "TAMPERED">("NORMAL");

  const [selectedNode, setSelectedNode] = useState<{
    title: string;
    asset: string;
    hash: string;
    algorithm: string;
    status: string;
    nonce: string;
    auditRef: string;
    details: string;
  } | null>(null);

  const isTampered = scenario === "TAMPERED";

  const inputHash = "3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a";
  const modelHash = "7e1b3a2c5d4e6f8a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a";
  const configHash = "5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d";
  const outputHash = isTampered
    ? "FAKESIG_8891C0D9E8F7A6B5C4D3E2F1A0B9C8D7E6F5A4B3C2D1E0F9A8B7C6D5E4F3"
    : "9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c";

  const handleVerifyInference = async () => {
    setIsVerifying(true);
    setActiveStep(0);

    // Sequential illumination animation
    for (let step = 1; step <= 5; step++) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setActiveStep(step);
    }

    setIsVerifying(false);

    addInference({
      id: `INF-${Math.floor(1000 + Math.random() * 9000)}`,
      assetName: "UAV_00452.jpg",
      inputHash,
      modelHash,
      configHash,
      outputHash,
      signature: isTampered ? "MISMATCH" : "VALID",
      timestamp: "27 Sep 2026 14:45:00 IST",
      nonce: `0x${Math.floor(Math.random() * 0xFFFFFFF).toString(16).toUpperCase()}`,
      sequence: 14202,
      status: isTampered ? "QUARANTINED" : "VALIDATED",
      analyst: "Analyst-01"
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">Inference / Verification</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Inference provenance</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verify the cryptographic chain linking input frames, model weights, configuration, and output payloads. Click any node to inspect cryptographic proof.
          </p>
        </div>

        <button
          onClick={handleVerifyInference}
          disabled={isVerifying}
          className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-xs transition-all shrink-0"
        >
          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
          <span>Run verification chain →</span>
        </button>
      </div>

      {/* DEMO FAILURE SCENARIO TOGGLE (Requirement 5 & 6) */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300">DEMO PROVENANCE SCENARIO:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setScenario("NORMAL")}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              scenario === "NORMAL"
                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500"
            }`}
          >
            ✓ Verified Chain (Pass)
          </button>
          <button
            onClick={() => setScenario("TAMPERED")}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              scenario === "TAMPERED"
                ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500"
            }`}
          >
            ⚠️ Tampered Output / Signature Breach (Failure State)
          </button>
        </div>
      </div>

      {/* SIGNATURE COMPONENT 1 — INTEGRITY CHAIN (Requirement 5) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800 font-mono text-xs">
          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            CRYPTOGRAPHIC PROVENANCE GRAPH (CLICK ANY NODE)
          </span>
          <span className="text-slate-500">SHA-256 Air-Gapped Ledger</span>
        </div>

        {/* Vertical Connected Graph Stack */}
        <div className="max-w-xl mx-auto space-y-3 font-mono">
          {/* Node 1: INPUT */}
          <div
            onClick={() =>
              setSelectedNode({
                title: "INPUT DATASET FRAME",
                asset: "UAV_00452.jpg (1920x1080 2.4MB)",
                hash: inputHash,
                algorithm: "Web Crypto API SHA-256",
                status: "VERIFIED",
                nonce: "0x4F92A81D",
                auditRef: "AUDIT-EV-10492",
                details: "Input frame frame payload checksum matched the sealed sensor ledger digest."
              })
            }
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
              activeStep >= 1
                ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-500 text-slate-900 dark:text-white shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs">INPUT</span>
                <span className="text-xs font-sans text-slate-500 font-semibold">UAV_00452.jpg</span>
              </div>
              <span className={`text-[11px] font-bold ${activeStep >= 1 ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>
                {activeStep >= 1 ? "✓ SHA-256 VERIFIED" : "PENDING"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">{inputHash}</div>
          </div>

          <div className="flex justify-center">
            <span className={`text-xs font-mono font-bold ${activeStep >= 2 ? "text-blue-600" : "text-slate-300"}`}>↓ SHA-256 MATCH</span>
          </div>

          {/* Node 2: MODEL */}
          <div
            onClick={() =>
              setSelectedNode({
                title: "MODEL BINARY FINGERPRINT",
                asset: "THERMAL-CLASSIFIER (YOLOv8x 245MB)",
                hash: modelHash,
                algorithm: "Web Crypto API SHA-256",
                status: "VERIFIED",
                nonce: "0x8E12C40B",
                auditRef: "AUDIT-EV-10493",
                details: "Model binary weight fingerprint matches expected reference hash on air-gapped ledger."
              })
            }
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
              activeStep >= 2
                ? "bg-purple-50/60 dark:bg-purple-950/40 border-purple-500 text-slate-900 dark:text-white shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs">MODEL</span>
                <span className="text-xs font-sans text-slate-500 font-semibold">THERMAL-CLASSIFIER</span>
              </div>
              <span className={`text-[11px] font-bold ${activeStep >= 2 ? "text-purple-600 dark:text-purple-400" : "text-slate-400"}`}>
                {activeStep >= 2 ? "✓ FINGERPRINT MATCH" : "PENDING"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">{modelHash}</div>
          </div>

          <div className="flex justify-center">
            <span className={`text-xs font-mono font-bold ${activeStep >= 3 ? "text-purple-600" : "text-slate-300"}`}>↓ CONFIG HASH</span>
          </div>

          {/* Node 3: CONFIGURATION */}
          <div
            onClick={() =>
              setSelectedNode({
                title: "CONFIGURATION MATRIX",
                asset: "preprocess_v2.json (Normalization Parameters)",
                hash: configHash,
                algorithm: "Web Crypto API SHA-256",
                status: "VERIFIED",
                nonce: "0x1A09B82C",
                auditRef: "AUDIT-EV-10494",
                details: "Pre-processing pipeline configuration parameters verified against registered specification."
              })
            }
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
              activeStep >= 3
                ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 text-slate-900 dark:text-white shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs">CONFIGURATION</span>
                <span className="text-xs font-sans text-slate-500 font-semibold">preprocess_v2.json</span>
              </div>
              <span className={`text-[11px] font-bold ${activeStep >= 3 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
                {activeStep >= 3 ? "✓ HASH MATCH" : "PENDING"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">{configHash}</div>
          </div>

          <div className="flex justify-center">
            <span className={`text-xs font-mono font-bold ${activeStep >= 4 ? (isTampered ? "text-rose-600" : "text-emerald-600") : "text-slate-300"}`}>
              ↓ SIGNATURE VERIFIED
            </span>
          </div>

          {/* Node 4: OUTPUT */}
          <div
            onClick={() =>
              setSelectedNode({
                title: "OUTPUT INFERENCE PAYLOAD",
                asset: "detection_00452.json",
                hash: outputHash,
                algorithm: "Ed25519 Cryptographic Signature",
                status: isTampered ? "SIGNATURE BREACH" : "SIGNATURE VERIFIED",
                nonce: "0x7F9B2C1A",
                auditRef: "AUDIT-EV-10495",
                details: isTampered
                  ? "SIGNATURE BREACH DETECTED: Observed cryptographic signature does not match payload digest! Potential payload tampering."
                  : "Signed inference payload verified with valid Ed25519 digital signature."
              })
            }
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
              activeStep >= 4
                ? isTampered
                  ? "bg-rose-50/70 dark:bg-rose-950/50 border-rose-500 text-[#D92D20] shadow-xs"
                  : "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500 text-slate-900 dark:text-white shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs">OUTPUT</span>
                <span className="text-xs font-sans text-slate-500 font-semibold">detection_00452.json</span>
              </div>
              <span className={`text-[11px] font-bold ${activeStep >= 4 ? (isTampered ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400") : "text-slate-400"}`}>
                {activeStep >= 4 ? (isTampered ? "❌ SIGNATURE MISMATCH" : "✓ SIGNATURE VERIFIED") : "PENDING"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">{outputHash}</div>
          </div>
        </div>

        {/* Step 5: FINAL PROVENANCE BADGE */}
        {activeStep >= 5 && (
          <div className="text-center pt-2">
            {isTampered ? (
              <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 text-white font-mono font-extrabold text-sm shadow-md animate-in fade-in zoom-in-95">
                <ShieldAlert className="w-5 h-5" />
                <span>⚠️ PROVENANCE BREACH DETECTED — QUARANTINED</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 text-white font-mono font-extrabold text-sm shadow-md animate-in fade-in zoom-in-95">
                <CheckCircle2 className="w-5 h-5" />
                <span>✓ PROVENANCE VERIFIED</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NODE INSPECTOR MODAL */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className={`p-6 rounded-2xl border max-w-lg w-full space-y-4 shadow-2xl font-mono text-xs ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Provenance Node Detail</span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{selectedNode.title}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between border-b pb-1.5 border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Asset Identifier:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedNode.asset}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Verification Protocol:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{selectedNode.algorithm}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Node Status:</span>
                <span className={`font-bold ${selectedNode.status.includes("BREACH") ? "text-rose-600" : "text-emerald-600"}`}>
                  {selectedNode.status}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Execution Nonce:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedNode.nonce}</span>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-slate-400 text-[10px] uppercase font-bold">SHA-256 Checksum:</span>
                <div className="p-2.5 rounded-lg bg-slate-950 text-emerald-400 text-[10px] break-all border border-slate-800">
                  {selectedNode.hash}
                </div>
              </div>

              <div className="space-y-1 pt-2 font-sans">
                <span className="text-slate-400 font-mono text-[11px] uppercase font-bold">Ledger Execution Detail:</span>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                  {selectedNode.details}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              Close Node Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

