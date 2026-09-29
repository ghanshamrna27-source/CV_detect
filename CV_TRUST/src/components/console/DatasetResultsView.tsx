import React, { useState } from "react";
import { Database, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Eye, ShieldAlert } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "../common/StatusBadge";

export const DatasetResultsView: React.FC = () => {
  const { selectedDataset, setActiveTab, openDrawer, settings } = useAssurance();
  const [expandedTechDetails, setExpandedTechDetails] = useState(false);

  const isDark = settings.theme === "dark";

  if (!selectedDataset) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <Database className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">No dataset selected</h3>
        <p className="text-xs text-slate-500 mb-4 font-sans">Upload or select a dataset to view assessment results.</p>
        <button
          onClick={() => setActiveTab("datasets")}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-mono font-bold"
        >
          Go to Dataset assessment →
        </button>
      </div>
    );
  }

  const samples = selectedDataset.samples || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* PAGE HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">
            Datasets / <span className="font-bold text-slate-800 dark:text-white">{selectedDataset.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dataset assessment</h1>
            <StatusBadge status="REVIEW" size="md" />
          </div>
        </div>

        <button
          onClick={() => setActiveTab("findings")}
          className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-mono font-bold shadow-xs transition-colors"
        >
          View findings →
        </button>
      </div>

      {/* WHY SUMMARY CARD (Section 18) */}
      <div className="p-6 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-xs space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-bold tracking-tight">Why was review flagged?</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-sans">
              CV-TRUST identified 3 structural anomaly clusters during dataset scanning.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
            3 Issues Flagged
          </span>
        </div>

        <ul className="space-y-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>18 potential label inconsistencies detected</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>42 near-duplicate samples (similarity index &gt; 96%)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>2.6% out-of-distribution feature distance deviation</span>
          </li>
        </ul>
      </div>

      {/* OVERALL METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-slate-400 uppercase text-[10px] mb-1 font-bold">Overall Status</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{selectedDataset.status}</div>
          <div className="text-[11px] text-slate-500 font-sans mt-1">Review required before training</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-slate-400 uppercase text-[10px] mb-1 font-bold">Duplicate Rate</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{selectedDataset.duplicatesPercentage}%</div>
          <div className="text-[11px] text-slate-500 font-sans mt-1">{selectedDataset.duplicatesCount} near-duplicates</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-slate-400 uppercase text-[10px] mb-1 font-bold">Label Anomalies</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{selectedDataset.labelAnomaliesPercentage}%</div>
          <div className="text-[11px] text-slate-500 font-sans mt-1">{selectedDataset.labelAnomaliesCount} inconsistent labels</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-slate-400 uppercase text-[10px] mb-1 font-bold">OOD Distance</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{selectedDataset.oodPercentage}%</div>
          <div className="text-[11px] text-slate-500 font-sans mt-1">{selectedDataset.oodCount} unusual samples</div>
        </div>
      </div>

      {/* FLAGGED SAMPLES ATTENTION GRID */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="border-b pb-3 mb-4 border-slate-200 dark:border-slate-800">
          <h2 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Flagged Evidence Samples
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Click any sample card to launch the Evidence Drawer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {samples.map((sample) => (
            <div
              key={sample.id}
              onClick={() => openDrawer("sample", sample)}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50 dark:bg-slate-950 cursor-pointer transition-all shadow-xs"
            >
              <div className="h-32 rounded-lg overflow-hidden bg-slate-900 mb-2 relative">
                <img src={sample.thumbnailUrl} alt={sample.id} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2">
                  <StatusBadge status={sample.status} size="sm" />
                </div>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-900 dark:text-white">{sample.id}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{sample.confidence}%</span>
                </div>
                <div className="text-amber-600 dark:text-amber-400 text-[11px] font-semibold">{sample.issueType}</div>
                <p className="text-[11px] text-slate-500 font-sans line-clamp-2">{sample.evidenceNote}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROGRESSIVE DISCLOSURE: ADVANCED TECHNICAL DETAILS (Section 19) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <button
          onClick={() => setExpandedTechDetails(!expandedTechDetails)}
          className="w-full p-4 flex items-center justify-between font-mono text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <span>View technical evidence (embeddings, hashes, statistical tests)</span>
          {expandedTechDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expandedTechDetails && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 font-mono text-xs space-y-4 bg-slate-50 dark:bg-slate-950">
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase">Dataset SHA-256 Digest:</span>
              <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 text-[11px] break-all mt-1 border border-slate-800">
                {selectedDataset.sha256}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Contributor Attribution</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedDataset.contributor}</div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Class List Matrix</span>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{selectedDataset.classesList.join(", ")}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
