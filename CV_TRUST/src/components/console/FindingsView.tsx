import React, { useState } from "react";
import { ShieldAlert, Filter, Search, ArrowRight, CheckCircle2, AlertTriangle, XCircle, SlidersHorizontal } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "../common/StatusBadge";
import { FindingItem } from "../../data/mockData";

export const FindingsView: React.FC = () => {
  const { findings, setSelectedFinding, setActiveTab, updateFindingDisposition } = useAssurance();

  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
    if (statusFilter !== "ALL" && f.status !== statusFilter) return false;
    if (categoryFilter !== "ALL" && f.category !== categoryFilter) return false;
    if (
      search &&
      !f.id.toLowerCase().includes(search.toLowerCase()) &&
      !f.asset.toLowerCase().includes(search.toLowerCase()) &&
      !f.category.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Findings & Evidence</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
          Dedicated investigation center for reviewing security anomalies, poison indicators, and assigning operational dispositions.
        </p>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-slate-800 dark:text-slate-200 font-bold">
          <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>MULTI-CRITERIA EVIDENCE FILTERS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search finding ID, asset..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Severity */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="REVIEW">Review Required</option>
              <option value="QUARANTINE">Quarantined</option>
              <option value="SECURE">Secure / Accepted</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Categories</option>
              <option value="Label Anomaly">Label Anomaly</option>
              <option value="Near Duplicate">Near Duplicate</option>
              <option value="Out-of-Distribution">Out-of-Distribution</option>
              <option value="Behavioural Deviation">Behavioural Deviation</option>
              <option value="Weight Tampering">Weight Tampering</option>
            </select>
          </div>
        </div>
      </div>

      {/* FINDINGS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 font-mono text-xs">
          <span className="text-slate-900 dark:text-white font-bold uppercase">FINDINGS DISPOSITION REGISTER ({filteredFindings.length})</span>
          <span className="text-slate-500">Click row to inspect evidence rationale</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">Finding ID</th>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Disposition</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFindings.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => {
                    setSelectedFinding(f);
                    setActiveTab("finding-detail");
                  }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">{f.id}</td>
                  <td className="py-3 px-3 text-slate-900 dark:text-white font-semibold">{f.asset}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans">{f.category}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={f.severity} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{f.confidence}%</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                      {f.disposition}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={f.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 font-bold text-[11px] transition-colors">
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
