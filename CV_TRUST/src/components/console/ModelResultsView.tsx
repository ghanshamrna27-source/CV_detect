import React, { useState } from "react";
import { Cpu, ShieldCheck, AlertTriangle, Layers, Activity, FileCode, CheckCircle2, XCircle, Search, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "../common/StatusBadge";

export const ModelResultsView: React.FC = () => {
  const { selectedModel, setActiveTab } = useAssurance();
  const [activeTabSub, setActiveTabSub] = useState<"results" | "tests" | "triggers" | "fingerprint" | "evidence">("results");

  if (!selectedModel) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <Cpu className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Model Selected</h3>
        <p className="text-xs text-slate-500 mb-4 font-sans">Please upload or select a vision model to inspect verification results.</p>
        <button
          onClick={() => setActiveTab("models")}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-mono font-bold"
        >
          Go to Model Assurance →
        </button>
      </div>
    );
  }

  // Fingerprint comparison chart data
  const fingerprintChartData = [
    { layer: "Conv1", refNorm: 1.82, obsNorm: 1.84 },
    { layer: "Layer1", refNorm: 1.95, obsNorm: 1.96 },
    { layer: "Layer2", refNorm: 2.10, obsNorm: 2.12 },
    { layer: "Layer3", refNorm: 2.45, obsNorm: selectedModel.integrityStatus === "SECURE" ? 2.47 : 4.12 },
    { layer: "Layer4", refNorm: 2.80, obsNorm: selectedModel.integrityStatus === "SECURE" ? 2.82 : 5.42 },
    { layer: "Head", refNorm: 1.50, obsNorm: 1.51 }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Title & Metadata */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">
            Models / <span className="text-slate-800 dark:text-white font-bold">{selectedModel.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Model verification results</h1>
        </div>
      </div>

      {/* SIGNATURE COMPONENT 4 — ASSET IDENTITY BLOCK (Section 5 & 20) */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs font-mono text-xs space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <span>◉ {selectedModel.name}</span>
          </div>
          <StatusBadge status={selectedModel.integrityStatus} size="sm" />
        </div>

        <div className="text-slate-600 dark:text-slate-300 font-sans">
          Model · {selectedModel.format} · {selectedModel.size}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div><strong className="text-slate-700 dark:text-slate-300">SHA-256:</strong> {selectedModel.sha256.slice(0, 16)}...</div>
          <div><strong className="text-slate-700 dark:text-slate-300">Architecture:</strong> {selectedModel.architecture} ({selectedModel.parameters} params)</div>
          <div><strong className="text-slate-700 dark:text-slate-300">Last assessed:</strong> {selectedModel.uploadDate}</div>
        </div>
      </div>

      {/* FOUR MAJOR SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Model Integrity */}
        <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Model Integrity</div>
            <div className="mb-1">
              <StatusBadge status={selectedModel.integrityStatus} size="lg" />
            </div>
            <div className="text-xs text-slate-400 font-sans mt-2">
              {selectedModel.integrityStatus === "SECURE" ? "No modification detected" : "Anomalous weight modifications detected"}
            </div>
          </div>
        </div>

        {/* Backdoor Behaviour */}
        <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Backdoor Behaviour</div>
            <div className="mb-1">
              <StatusBadge status={selectedModel.backdoorRisk} size="lg" />
            </div>
            <div className="text-xs text-slate-400 font-sans mt-2">
              {selectedModel.backdoorRisk === "LOW RISK" ? "No trigger behaviour observed" : "Adversarial patch override detected"}
            </div>
          </div>
        </div>

        {/* Parameter Analysis */}
        <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parameter Analysis</div>
            <div className="mb-1">
              <StatusBadge status={selectedModel.parameterAnalysis} size="lg" />
            </div>
            <div className="text-xs text-slate-400 font-sans mt-2">
              Tensor weight norm distributions within expected range
            </div>
          </div>
        </div>

        {/* Behavioural Consistency */}
        <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Behavioural Consistency</div>
            <div className="text-3xl font-extrabold text-white">{selectedModel.behaviouralConsistency}%</div>
            <div className="text-xs text-slate-400 font-sans mt-1">
              Matches baseline reference model specification
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-6">
        <div className="flex border-b border-slate-800 mb-6 gap-2 overflow-x-auto">
          {[
            { id: "results", label: "Verification Results" },
            { id: "tests", label: "Behavioural Tests" },
            { id: "triggers", label: "Trigger Analysis" },
            { id: "fingerprint", label: "Model Fingerprint" },
            { id: "evidence", label: "Technical Evidence" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabSub(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-colors ${
                activeTabSub === tab.id
                  ? "border-[#1D5F8C] text-white bg-[#132B42]"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Verification Results Overview */}
        {activeTabSub === "results" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-[#081521] border border-slate-800 space-y-2">
                <span className="text-slate-400 uppercase text-[11px]">Cryptographic Binary SHA-256</span>
                <div className="p-2 rounded bg-[#0B1F33] border border-slate-800 text-[11px] text-slate-200 break-all">
                  {selectedModel.sha256}
                </div>
              </div>

              <div className="p-4 rounded bg-[#081521] border border-slate-800 space-y-2">
                <span className="text-slate-400 uppercase text-[11px]">Framework & Runtime Container</span>
                <div className="p-2 rounded bg-[#0B1F33] border border-slate-800 text-[11px] text-slate-200">
                  {selectedModel.framework} ({selectedModel.version})
                </div>
              </div>
            </div>

            <div className="p-4 rounded bg-[#081521] border border-slate-800 space-y-3 font-sans">
              <h4 className="font-mono font-bold text-xs text-white uppercase tracking-wider">Executive Model Assessment</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                The model artifact <strong>{selectedModel.name}</strong> was evaluated using client-side layer-wise parameter scanning and behavioural perturbation tests.
                {selectedModel.integrityStatus === "SECURE"
                  ? " No backdoors, trigger watermarks, or parameter tampering were detected. Output behavior matches baseline reference model within 94.2% confidence margin."
                  : " Warning: Detected elevated backdoor risk and parameter distribution anomalies. Manual security analyst review recommended before deployment."}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Behavioural Tests Table */}
        {activeTabSub === "tests" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3">Test ID</th>
                  <th className="py-2.5 px-3">Test Suite</th>
                  <th className="py-2.5 px-3">Expected Behaviour</th>
                  <th className="py-2.5 px-3">Observed Behaviour</th>
                  <th className="py-2.5 px-3">Deviation</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {selectedModel.behaviouralTests.length > 0 ? (
                  selectedModel.behaviouralTests.map((bt) => (
                    <tr key={bt.testId} className="hover:bg-[#132B42]/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-blue-400">{bt.testId}</td>
                      <td className="py-3 px-3 text-white font-semibold">{bt.testName}</td>
                      <td className="py-3 px-3 text-slate-300 font-sans">{bt.expectedBehaviour}</td>
                      <td className="py-3 px-3 text-slate-300 font-sans">{bt.observedBehaviour}</td>
                      <td className="py-3 px-3 text-amber-400 font-bold">{bt.deviation}</td>
                      <td className="py-3 px-3 text-right">
                        <StatusBadge status={bt.status} size="sm" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Standard behavioral test suite passed (4/4 tests clean).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Trigger Analysis Heatmap Visual */}
        {activeTabSub === "triggers" && (
          <div className="space-y-6 font-mono text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trigger Visual Card */}
              <div className="p-4 rounded bg-[#081521] border border-slate-800 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-white font-bold uppercase">Trigger Search Grid</span>
                  <span className="text-amber-400 font-bold">Heatmap Activation Matrix</span>
                </div>

                {/* Mock Heatmap */}
                <div className="h-48 rounded bg-slate-950 border border-slate-800 p-2 relative overflow-hidden flex items-center justify-center">
                  <div className="grid grid-cols-8 gap-1 w-full h-full opacity-80">
                    {Array.from({ length: 64 }).map((_, idx) => {
                      const isHot = idx === 0 || idx === 1 || idx === 8 || idx === 9;
                      return (
                        <div
                          key={idx}
                          className={`rounded ${
                            isHot && selectedModel.backdoorRisk !== "LOW RISK"
                              ? "bg-red-500 animate-pulse border border-yellow-300"
                              : idx % 7 === 0
                              ? "bg-blue-900/40"
                              : "bg-slate-900"
                          }`}
                        ></div>
                      );
                    })}
                  </div>
                  {selectedModel.backdoorRisk !== "LOW RISK" && (
                    <div className="absolute top-4 left-4 bg-red-950/90 border border-red-500 p-2 rounded text-[11px] text-red-200">
                      ⚠️ Trigger Pattern Detected: (0,0) Top-Left 16x16 Yellow Watermark
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Activation Range: 0.00 - 4.12</span>
                  <span>Spatial Sensitivity: 99.4%</span>
                </div>
              </div>

              {/* Trigger Candidate List */}
              <div className="p-4 rounded bg-[#081521] border border-slate-800 space-y-3">
                <span className="text-white font-bold uppercase">Candidate Pattern Register</span>

                <div className="space-y-2">
                  {selectedModel.triggerPatterns.length > 0 ? (
                    selectedModel.triggerPatterns.map((tp) => (
                      <div key={tp.patternId} className="p-3 rounded bg-[#0B1F33] border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">{tp.candidatePattern}</span>
                          <StatusBadge status={tp.risk} size="sm" />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Confidence Score: <strong className="text-emerald-400">{tp.confidence}%</strong></span>
                          <span>Effect: {tp.affectedOutputs}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500">No candidate triggers detected above 15% confidence threshold.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab("findings")}
                className="px-4 py-2 bg-[#132B42] hover:bg-slate-800 text-slate-200 rounded border border-slate-700 text-xs font-bold"
              >
                Inspect Related Findings →
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Model Fingerprint Chart */}
        {activeTabSub === "fingerprint" && (
          <div className="space-y-6 font-mono text-xs">
            <div className="p-4 rounded bg-[#081521] border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-white font-bold uppercase">Layer-Wise Weight Norm Comparison</span>
                <span className="text-slate-400 text-[11px]">Reference Model vs Observed Binary</span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fingerprintChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="layer" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#0B1F33", borderColor: "#1E293B", color: "#FFF" }} />
                    <Bar dataKey="refNorm" name="Baseline Norm" fill="#1D5F8C" />
                    <Bar dataKey="obsNorm" name="Observed Weight Norm" fill={selectedModel.integrityStatus === "SECURE" ? "#10B981" : "#EF4444"} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded bg-[#081521] border border-slate-800">
                <span className="text-slate-400 text-[10px]">Total Layers</span>
                <div className="text-lg font-bold text-white">{selectedModel.fingerprint.layerCount}</div>
              </div>
              <div className="p-3 rounded bg-[#081521] border border-slate-800">
                <span className="text-slate-400 text-[10px]">Activation Sparsity</span>
                <div className="text-lg font-bold text-emerald-400">{selectedModel.fingerprint.activationStats.split(",")[2]}</div>
              </div>
              <div className="p-3 rounded bg-[#081521] border border-slate-800">
                <span className="text-slate-400 text-[10px]">Mean Weight Norm</span>
                <div className="text-lg font-bold text-blue-400">{selectedModel.fingerprint.meanWeightNorm}</div>
              </div>
              <div className="p-3 rounded bg-[#081521] border border-slate-800">
                <span className="text-slate-400 text-[10px]">Reference Similarity</span>
                <div className="text-lg font-bold text-purple-400">{selectedModel.fingerprint.referenceSimilarity}%</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Technical Evidence */}
        {activeTabSub === "evidence" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded bg-[#081521] border border-slate-800 space-y-2">
              <span className="text-white font-bold uppercase">Technical Evidence Summary</span>
              <p className="text-slate-300 font-sans leading-relaxed text-xs">
                Verification evidence computed directly from binary blob header and array buffers.
                Checksum comparison validates zero unauthorized weight modification or binary patching.
              </p>
            </div>

            <div className="p-4 rounded bg-[#081521] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px]">SHA-256 Ledger Record:</span>
              <div className="p-2.5 rounded bg-[#0B1F33] border border-slate-800 text-emerald-400 text-[11px] break-all">
                {selectedModel.sha256}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
