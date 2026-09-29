import React from "react";
import { ArrowLeft, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, FileText, Lock, Copy } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "../common/StatusBadge";

export const FindingDetailView: React.FC = () => {
  const { selectedFinding, updateFindingDisposition, setActiveTab } = useAssurance();

  if (!selectedFinding) {
    return (
      <div className="text-center py-20 bg-[#0B1F33] border border-slate-800 rounded-lg">
        <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">No Finding Selected</h3>
        <p className="text-xs text-slate-400 mb-4">Please select a finding to inspect detailed evidence rationale.</p>
        <button
          onClick={() => setActiveTab("findings")}
          className="px-4 py-2 bg-[#1D5F8C] hover:bg-[#16496C] text-white rounded text-xs font-mono font-bold"
        >
          Go to Findings Register →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("findings")}
            className="p-1.5 rounded bg-[#132B42] hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs font-mono text-slate-400">Findings / Investigation</div>
            <h1 className="text-xl font-bold text-white tracking-tight">Finding {selectedFinding.id}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={selectedFinding.severity} size="md" />
          <StatusBadge status={selectedFinding.status} size="md" />
        </div>
      </div>

      {/* METADATA STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded bg-[#0B1F33] border border-slate-800">
          <span className="text-slate-400 text-[10px]">Affected Asset</span>
          <div className="text-white font-bold mt-0.5">{selectedFinding.asset}</div>
        </div>

        <div className="p-3.5 rounded bg-[#0B1F33] border border-slate-800">
          <span className="text-slate-400 text-[10px]">Category</span>
          <div className="text-blue-400 font-bold mt-0.5">{selectedFinding.category}</div>
        </div>

        <div className="p-3.5 rounded bg-[#0B1F33] border border-slate-800">
          <span className="text-slate-400 text-[10px]">Assurance Confidence</span>
          <div className="text-emerald-400 font-bold mt-0.5">{selectedFinding.confidence}%</div>
        </div>

        <div className="p-3.5 rounded bg-[#0B1F33] border border-slate-800">
          <span className="text-slate-400 text-[10px]">Detection Timestamp</span>
          <div className="text-slate-300 mt-0.5">{selectedFinding.timestamp}</div>
        </div>
      </div>

      {/* SECTION 1: WHY WAS THIS FLAGGED? */}
      <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-6 space-y-3">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>WHY WAS THIS FLAGGED?</span>
        </h3>

        <div className="p-4 rounded bg-[#081521] border border-slate-800 text-xs font-sans text-slate-200 leading-relaxed">
          {selectedFinding.whyFlagged}
        </div>
      </div>

      {/* SECTION 2: SUPPORTING EVIDENCE */}
      <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-6 space-y-4 font-mono text-xs">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span>SUPPORTING TECHNICAL EVIDENCE</span>
        </h3>

        <div className="space-y-3">
          {selectedFinding.supportingEvidence.sampleIds && (
            <div className="p-3 rounded bg-[#081521] border border-slate-800">
              <span className="text-slate-400 text-[10px] block mb-1">Flagged Sample Identifiers:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedFinding.supportingEvidence.sampleIds.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-[#0B1F33] border border-slate-700 text-slate-200 text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedFinding.supportingEvidence.similarityScores && (
            <div className="p-3 rounded bg-[#081521] border border-slate-800">
              <span className="text-slate-400 text-[10px] block mb-1">Feature Embedding Similarity Metric:</span>
              <div className="text-blue-300 font-bold">{selectedFinding.supportingEvidence.similarityScores}</div>
            </div>
          )}

          {selectedFinding.supportingEvidence.labelDistribution && (
            <div className="p-3 rounded bg-[#081521] border border-slate-800">
              <span className="text-slate-400 text-[10px] block mb-1">Observed Class Label Distribution:</span>
              <div className="text-amber-300 font-bold">{selectedFinding.supportingEvidence.labelDistribution}</div>
            </div>
          )}

          {selectedFinding.supportingEvidence.hashes && (
            <div className="p-3 rounded bg-[#081521] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">Cryptographic SHA-256 Digest:</span>
              <div className="text-slate-300 break-all text-[11px] p-2 bg-[#0B1F33] rounded border border-slate-800">
                {selectedFinding.supportingEvidence.hashes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: RECOMMENDED DISPOSITION CONTROLS */}
      <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="border-b border-slate-800 pb-2 flex justify-between items-center font-mono text-xs">
          <span className="text-white font-bold uppercase">ANALYST DISPOSITION AUTHORIZATION</span>
          <span className="text-slate-400">Select one disposition to update asset security status</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          {/* ACCEPT */}
          <button
            onClick={() => updateFindingDisposition(selectedFinding.id, "ACCEPT")}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedFinding.disposition === "ACCEPT"
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50 shadow-lg"
                : "bg-[#081521] border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">ACCEPT</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[11px] font-sans text-slate-300">
              Authorize sample/asset for training/deployment. Mark as false positive or accepted risk.
            </p>
          </button>

          {/* REVIEW */}
          <button
            onClick={() => updateFindingDisposition(selectedFinding.id, "REVIEW")}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedFinding.disposition === "REVIEW"
                ? "bg-amber-950/80 border-amber-500 text-amber-200 ring-2 ring-amber-500/50 shadow-lg"
                : "bg-[#081521] border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">REVIEW</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-[11px] font-sans text-slate-300">
              Hold asset in verification queue. Require manual contributor re-annotation or additional tests.
            </p>
          </button>

          {/* QUARANTINE */}
          <button
            onClick={() => updateFindingDisposition(selectedFinding.id, "QUARANTINE")}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedFinding.disposition === "QUARANTINE"
                ? "bg-red-950/80 border-red-500 text-red-200 ring-2 ring-red-500/50 shadow-lg"
                : "bg-[#081521] border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">QUARANTINE</span>
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-[11px] font-sans text-slate-300">
              Isolate asset completely from operational pipeline. Prevent usage in active model training.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
