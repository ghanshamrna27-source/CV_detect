import React from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, ShieldAlert, FileText, Info } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "./StatusBadge";

export const ContextualDrawer: React.FC = () => {
  const { activeDrawer, closeDrawer, updateFindingDisposition, updateSampleStatus, selectedDataset, settings } = useAssurance();

  if (!activeDrawer) return null;

  const isDark = settings.theme === "dark";
  const { type, data } = activeDrawer;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop Scrim */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      ></div>

      {/* Drawer Body */}
      <div className={`relative w-full max-w-lg h-full flex flex-col justify-between shadow-2xl transition-all font-sans z-10 ${
        isDark ? "bg-slate-900 text-slate-100 border-l border-slate-800" : "bg-white text-slate-900 border-l border-slate-200"
      }`}>
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {type === "finding" && "Finding Evidence Drawer"}
              {type === "sample" && "Sample Evidence Drawer"}
              {type === "notification" && "Notification Inspector"}
              {type === "evidence" && "Evidence Detail"}
              {type === "activity" && "Activity Audit Detail"}
            </div>
            <h2 className="text-lg font-bold tracking-tight mt-0.5 text-slate-900 dark:text-white">
              {data.title || data.id || data.asset || "Contextual Inspection"}
            </h2>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Finding Type Drawer (Signature Component 3) */}
          {type === "finding" && (
            <div className="space-y-4 font-sans">
              <div className="flex items-center gap-2">
                <StatusBadge status={data.severity} size="md" />
                <StatusBadge status={data.status} size="md" />
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{data.confidence || 84}% confidence</span>
              </div>

              <div className="space-y-1 font-mono">
                <span className="text-slate-400 text-[11px] font-bold uppercase">Affected asset</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{data.asset}</div>
              </div>

              <div className="space-y-1.5">
                <div className="text-slate-400 font-mono text-[11px] font-bold uppercase border-b border-slate-100 dark:border-slate-800 pb-1">
                  Why was this flagged?
                </div>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed text-xs">
                  {data.whyFlagged || "Observed behaviour deviates from the reference battery under 3 test conditions."}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-slate-400 font-mono text-[11px] font-bold uppercase">Evidence Summary</div>
                <ul className="space-y-1 font-mono text-slate-700 dark:text-slate-300 text-xs">
                  <li>• 3 test cases evaluated</li>
                  <li>• 2 activation deviations observed</li>
                  <li>• 1 output decision boundary inconsistency</li>
                </ul>
              </div>

              {data.supportingEvidence && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
                  <span className="text-slate-400 text-[11px] font-bold uppercase">Technical Evidence:</span>
                  {data.supportingEvidence.hashes && (
                    <div>
                      <span className="text-slate-400 text-[10px]">SHA-256 Digest: </span>
                      <div className="p-2.5 rounded-lg bg-slate-950 text-emerald-400 text-[10px] break-all border border-slate-800">
                        {data.supportingEvidence.hashes}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sample Type Drawer */}
          {type === "sample" && (
            <div className="space-y-4 font-mono">
              <div className="h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative">
                <img src={data.thumbnailUrl} alt={data.id} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-slate-900/90 px-2 py-1 rounded text-[10px] text-slate-300">
                  {data.resolution}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span className="text-slate-400">Sample ID:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{data.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span className="text-slate-400">Detected Issue:</span>
                  <span className="text-amber-500 font-bold">{data.issueType}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span className="text-slate-400">Confidence Score:</span>
                  <span className="text-emerald-500 font-bold">{data.confidence}%</span>
                </div>
                <div className="space-y-1 pt-1 font-sans">
                  <span className="text-slate-400 text-[11px] font-mono">Evidence Note:</span>
                  <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs">
                    {data.evidenceNote}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notification Inspector Drawer */}
          {type === "notification" && (
            <div className="space-y-3 font-sans">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 font-semibold text-xs">
                {data.title}
              </div>
              <div className="font-mono text-xs text-slate-500">Asset: {data.asset} | Timestamp: {data.time}</div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Security event recorded in the air-gapped ledger. Requires analyst verification and disposition update.
              </p>
            </div>
          )}
        </div>

        {/* Sticky Drawer Footer with Action Buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col gap-2 font-mono text-xs">
          {type === "finding" && (
            <>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                RECOMMENDED DISPOSITION
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    updateFindingDisposition(data.id, "ACCEPT");
                    closeDrawer();
                  }}
                  className="py-2.5 rounded-xl bg-[#129B68] hover:bg-emerald-700 text-white font-bold transition-all shadow-xs"
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    updateFindingDisposition(data.id, "REVIEW");
                    closeDrawer();
                  }}
                  className="py-2.5 rounded-xl bg-[#D98B00] hover:bg-amber-600 text-white font-bold transition-all shadow-xs"
                >
                  Review
                </button>
                <button
                  onClick={() => {
                    updateFindingDisposition(data.id, "QUARANTINE");
                    closeDrawer();
                  }}
                  className="py-2.5 rounded-xl bg-[#D92D20] hover:bg-rose-700 text-white font-bold transition-all shadow-xs"
                >
                  Quarantine
                </button>
              </div>
            </>
          )}

          {type === "sample" && selectedDataset && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  updateSampleStatus(selectedDataset.id, data.id, "SECURE");
                  closeDrawer();
                }}
                className="py-2.5 rounded-xl bg-[#129B68] hover:bg-emerald-700 text-white font-bold transition-all shadow-xs"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  updateSampleStatus(selectedDataset.id, data.id, "QUARANTINE");
                  closeDrawer();
                }}
                className="py-2.5 rounded-xl bg-[#D92D20] hover:bg-rose-700 text-white font-bold transition-all shadow-xs"
              >
                Quarantine
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
