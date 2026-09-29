import React, { useState } from "react";
import { ScrollText, Search, Download, Eye, X } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "../common/StatusBadge";
import { AuditLogItem } from "../../data/mockData";

export const AuditLogsView: React.FC = () => {
  const { auditLogs, settings } = useAssurance();
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const isDark = settings.theme === "dark";

  const filteredLogs = auditLogs.filter((l) => {
    if (search && !l.activity.toLowerCase().includes(search.toLowerCase()) && !l.asset.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleExportAudit = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cv_trust_audit_trail_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">Report / Audit Trail</div>
          <h1 className="text-2xl font-bold tracking-tight text-[#12304A] dark:text-white">Audit trail</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Chronological ledger of security assessment events and analyst actions.
          </p>
        </div>

        <button
          onClick={handleExportAudit}
          className="mt-3 sm:mt-0 bg-[#246B94] hover:bg-[#1D5F8C] text-white px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export audit JSON</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className={`p-4 rounded-lg border font-mono text-xs ${
        isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
      }`}>
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter audit trail by activity, asset..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* CHRONOLOGICAL TABLE (Section 25) */}
      <div className={`p-6 rounded-lg border ${isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2.5 px-3">Timestamp</th>
                <th className="pb-2.5 px-3">Activity</th>
                <th className="pb-2.5 px-3">Asset</th>
                <th className="pb-2.5 px-3">Analyst</th>
                <th className="pb-2.5 px-3">Status</th>
                <th className="pb-2.5 px-3">Reference</th>
                <th className="pb-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 text-slate-400 text-[11px]">{log.timestamp}</td>
                  <td className="py-3 px-3 text-slate-900 dark:text-white font-semibold">{log.activity}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans">{log.asset}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{log.analyst}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={log.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-[#246B94] font-semibold">{log.reference}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-semibold"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className={`p-6 rounded-lg border max-w-lg w-full space-y-4 shadow-2xl font-mono text-xs ${
            isDark ? "bg-[#0B1F33] border-slate-700 text-white" : "bg-white border-[#E4EAF0] text-[#12304A]"
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm">Audit Record {selectedLog.id}</span>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded hover:bg-slate-200 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400">Activity:</span>
                <span className="font-bold">{selectedLog.activity}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400">Target Asset:</span>
                <span>{selectedLog.asset}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400">Executing Analyst:</span>
                <span>{selectedLog.analyst}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400">Timestamp:</span>
                <span>{selectedLog.timestamp}</span>
              </div>
              <div className="space-y-1 pt-2 font-sans">
                <span className="text-slate-400 font-mono text-[11px]">Ledger Execution Detail:</span>
                <p className="p-3 rounded bg-slate-50 dark:bg-[#081521] border text-xs text-slate-700 dark:text-slate-300">
                  {selectedLog.details}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2 bg-[#246B94] text-white font-bold rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
