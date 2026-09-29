import React, { useState } from "react";
import { BrainCircuit, UploadCloud, FileCode, CheckCircle2, Loader2 } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { calculateSHA256, formatBytes } from "../../utils/crypto";

export const ModelAssuranceView: React.FC = () => {
  const { addModel, setActiveTab, setSelectedModel, settings } = useAssurance();
  const isDark = settings.theme === "dark";

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState("VISION-DETECTOR-V2.onnx");
  const [format, setFormat] = useState<"ONNX" | "PyTorch" | "TorchScript">("ONNX");
  const [architecture, setArchitecture] = useState("YOLOv8x-Tactical");
  const [parameters, setParameters] = useState("68.2M");
  const [framework, setFramework] = useState("PyTorch 2.3 -> ONNX Runtime 1.18");
  const [source, setSource] = useState("DRDO-Partner-Group");

  const [scenario, setScenario] = useState<"NORMAL" | "MISMATCH">("NORMAL");
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const workflowSteps = [
    "Validating model binary format...",
    "Verifying identity & Web Crypto SHA-256 hash...",
    "Scanning layer weight distributions & norms...",
    "Executing behavioural perturbation assessment...",
    "Checking backdoor trigger patterns...",
    "Generating model verification results..."
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setModelName(file.name);
      if (file.name.endsWith(".pt") || file.name.endsWith(".pth")) setFormat("PyTorch");
      else if (file.name.endsWith(".ts")) setFormat("TorchScript");
      else setFormat("ONNX");
    }
  };

  const handleStartVerification = async () => {
    setIsVerifying(true);
    setCurrentStep(0);

    for (let i = 0; i < workflowSteps.length; i++) {
      setCurrentStep(i);
      await new Promise((resolve) => setTimeout(resolve, 450));
    }

    const sha = uploadedFile ? await calculateSHA256(uploadedFile) : "7e1b3a2c5d4e6f8a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a";

    const isMismatch = scenario === "MISMATCH";

    const newModel = {
      id: `MDL-${Math.floor(100 + Math.random() * 900)}`,
      name: modelName,
      format,
      size: uploadedFile ? formatBytes(uploadedFile.size) : "245 MB",
      architecture,
      parameters,
      sha256: isMismatch ? "4a2c9d1e0f8b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c" : sha,
      framework,
      version: "v2.4.1",
      source,
      uploadDate: "2026-09-27 14:40 IST",
      integrityStatus: (isMismatch ? "QUARANTINE" : "SECURE") as const,
      backdoorRisk: (isMismatch ? "HIGH RISK" : "LOW RISK") as const,
      parameterAnalysis: (isMismatch ? "ANOMALY DETECTED" : "NORMAL") as const,
      behaviouralConsistency: isMismatch ? 64.8 : 94.2,
      fingerprint: {
        layerCount: 284,
        activationStats: isMismatch ? "Mean: 0.942 (DEVIATED), Std: 0.412, Sparsity: 3.1%" : "Mean: 0.412, Std: 0.128, Sparsity: 14.2%",
        meanWeightNorm: isMismatch ? 4.912 : 1.842,
        referenceSimilarity: isMismatch ? 64.8 : 98.6
      },
      behaviouralTests: [
        {
          testId: "BT-001",
          testName: "Standard Optical Test",
          expectedBehaviour: "Object Detection (IoU > 0.85)",
          observedBehaviour: isMismatch ? "Object Detection (IoU 0.54 - DEVIATED)" : "Object Detection (IoU 0.88)",
          deviation: isMismatch ? "36.2%" : "1.2%",
          status: (isMismatch ? "FAIL" : "PASS") as const
        },
        {
          testId: "BT-002",
          testName: "Noise Perturbation",
          expectedBehaviour: "Stable Class",
          observedBehaviour: isMismatch ? "Class Flip to Synthetic Target" : "Stable Class",
          deviation: isMismatch ? "41.7%" : "4.7%",
          status: (isMismatch ? "FAIL" : "PASS") as const
        }
      ],
      triggerPatterns: isMismatch ? ["Synthetic Patch Pattern in Layer 24 (4x4 Matrix)"] : []
    };

    addModel(newModel);
    setSelectedModel(newModel);
    setIsVerifying(false);
    setActiveTab("model-results");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">Models / Assessment</div>
          <h1 className="text-2xl font-bold tracking-tight text-[#12304A] dark:text-white">Model integrity</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assess model identity, behavioural consistency and weight indicators.
          </p>
        </div>

        <label className="mt-3 sm:mt-0 bg-[#246B94] hover:bg-[#1D5F8C] text-white px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all">
          <UploadCloud className="w-4 h-4" />
          <span>Upload model</span>
          <input type="file" onChange={handleFileChange} className="hidden" accept=".onnx,.pt,.pth,.ts" />
        </label>
      </div>

      {/* VISUAL WORKFLOW BAR */}
      <div className={`p-4 rounded-lg border font-mono text-xs flex items-center justify-between overflow-x-auto ${
        isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
      }`}>
        {["UPLOAD MODEL", "VALIDATE FORMAT", "VERIFY IDENTITY", "BEHAVIOUR ASSESSMENT", "RESULTS"].map((step, idx) => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 font-bold ${idx <= (isVerifying ? 2 : 0) ? "text-[#246B94]" : "text-slate-400"}`}>
              <span className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center ${
                idx <= (isVerifying ? 2 : 0) ? "bg-[#246B94] text-white border-[#246B94]" : "border-slate-300 dark:border-slate-700"
              }`}>
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
            {idx < 4 && <span className="text-slate-300 dark:text-slate-700 font-bold">→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* UPLOAD SURFACE */}
      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDark ? "bg-[#0B1F33] border-slate-700 hover:border-[#1D5F8C]" : "bg-white border-[#E4EAF0] hover:border-[#246B94] shadow-xs"
      }`}>
        <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-[#12304A] dark:text-white mb-1">Select model binary file</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-sans">
          Supported formats: ONNX (.onnx), PyTorch (.pt, .pth), TorchScript (.ts)
        </p>

        {uploadedFile ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-xs font-mono font-bold">
            <FileCode className="w-4 h-4 text-purple-600" />
            <span>{uploadedFile.name} ({formatBytes(uploadedFile.size)})</span>
          </div>
        ) : (
          <label className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded text-xs font-mono font-bold cursor-pointer transition-colors border border-slate-300 dark:border-slate-700">
            <span>Choose File</span>
            <input type="file" onChange={handleFileChange} className="hidden" accept=".onnx,.pt,.pth,.ts" />
          </label>
        )}
      </div>

      {/* SPECIFICATION FORM */}
      <div className={`p-6 rounded-lg border space-y-4 ${
        isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
      }`}>
        <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider border-b pb-2 border-slate-200 dark:border-slate-800">
          Model Specification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-500 text-[11px] mb-1">Model Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-500 text-[11px] mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="ONNX">ONNX Open Neural Network Exchange</option>
              <option value="PyTorch">PyTorch Model Weights (.pt)</option>
              <option value="TorchScript">TorchScript Compiled Binary (.ts)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 text-[11px] mb-1">Architecture</label>
            <input
              type="text"
              value={architecture}
              onChange={(e) => setArchitecture(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* DEMO SCENARIO SELECTOR (Requirement 6 & 12) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase">
            Test Scenario Mode (Requirement 6 Failure States):
          </label>
          <div className="flex flex-wrap gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => setScenario("NORMAL")}
              className={`px-3.5 py-2 rounded-lg border font-bold flex items-center gap-2 transition-all ${
                scenario === "NORMAL"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>✓ Normal Verification (Pass)</span>
            </button>
            <button
              type="button"
              onClick={() => setScenario("MISMATCH")}
              className={`px-3.5 py-2 rounded-lg border font-bold flex items-center gap-2 transition-all ${
                scenario === "MISMATCH"
                  ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>⚠️ Fingerprint Mismatch Scenario (Quarantine)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTION / PROGRESS */}
      {isVerifying ? (
        <div className={`p-6 rounded-lg border space-y-3 ${
          isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
        }`}>
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-white">
              Verifying model integrity ({scenario === "MISMATCH" ? "Testing Failure Scenario" : "Standard Chain"})...
            </span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            {workflowSteps.map((step, idx) => (
              <div key={idx} className={`flex items-center gap-2 ${idx <= currentStep ? "text-purple-600 dark:text-purple-400 font-bold" : "text-slate-400"}`}>
                <span>{idx <= currentStep ? "✓" : "○"}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartVerification}
          className="w-full bg-[#246B94] hover:bg-[#1D5F8C] text-white py-3.5 rounded text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all"
        >
          Execute Model Verification Suite ({scenario}) →
        </button>
      )}
    </div>
  );
};
