import React, { useState } from "react";
import { FileSearch, Search, Filter, SlidersHorizontal, Eye } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "../common/StatusBadge";

export const EvidenceView: React.FC = () => {
  const { findings, openDrawer, settings } = useAssurance();
  const isDark = settings.theme === "dark";

  const [assetFilter, setAssetFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredEvidence = findings.filter((f) => {
    if (assetFilter !== "ALL" && f.asset !== assetFilter) return false;
    if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
    if (search && !f.id.toLowerCase().includes(search.toLowerCase()) && !f.asset.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">Review / Evidence</div>
          <h1 className="text-2xl font-bold tracking-tight text-[#12304A] dark:text-white">Evidence explorer</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Searchable technical evidence index linking findings, sample IDs, and cryptographic digests.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className={`p-4 rounded-lg border font-mono text-xs space-y-3 ${
        isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
      }`}>
        <div className="flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800 font-bold text-slate-500">
          <SlidersHorizontal className="w-4 h-4 text-[#246B94]" />
          <span>EVIDENCE EXPLORER FILTERS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search finding ID, asset..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="px-3 py-1.5 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Assets</option>
            <option value="UAV-SURVEILLANCE-01">UAV-SURVEILLANCE-01</option>
            <option value="TERRAIN-CLASSIFICATION-03">TERRAIN-CLASSIFICATION-03</option>
            <option value="THERMAL-VEHICLE-DETECTION">THERMAL-VEHICLE-DETECTION</option>
          </select>
        </div>
      </div>

      {/* READABLE EVIDENCE TABLE */}
      <div className={`p-6 rounded-lg border ${isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2.5 px-3">Finding ID</th>
                <th className="pb-2.5 px-3">Asset</th>
                <th className="pb-2.5 px-3">Category</th>
                <th className="pb-2.5 px-3">Severity</th>
                <th className="pb-2.5 px-3">Confidence</th>
                <th className="pb-2.5 px-3">SHA-256 Digest</th>
                <th className="pb-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredEvidence.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 font-bold text-[#246B94]">{f.id}</td>
                  <td className="py-3 px-3 text-slate-900 dark:text-white font-semibold">{f.asset}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans">{f.category}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={f.severity} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{f.confidence}%</td>
                  <td className="py-3 px-3 text-slate-400 text-[10px]">
                    {f.supportingEvidence.hashes ? `${f.supportingEvidence.hashes.slice(0, 16)}...` : "SHA-256 Verified"}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => openDrawer("finding", f)}
                      className="px-2.5 py-1 rounded bg-[#246B94] hover:bg-[#1D5F8C] text-white text-[11px] font-bold"
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
