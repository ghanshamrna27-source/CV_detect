import React, { useState } from "react";
import {
  Database,
  BrainCircuit,
  ScanLine,
  TriangleAlert,
  ArrowRight,
  Plus,
  ShieldCheck,
  Clock,
  ExternalLink,
  Calendar,
  Filter,
  Check
} from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "../common/StatusBadge";

export const DashboardView: React.FC = () => {
  const {
    datasets,
    models,
    inferences,
    auditLogs,
    findings,
    setActiveTab,
    openDrawer,
    settings
  } = useAssurance();

  const isDark = settings.theme === "dark";

  // State for "Start Assessment" Modal
  const [showStartModal, setShowStartModal] = useState(false);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Helper to filter items by date range
  const filterByDate = (dateStr?: string) => {
    if (dateFilter === "ALL" || !dateStr) return true;
    const date = new Date(dateStr);
    const now = new Date();

    if (dateFilter === "TODAY") {
      return date.toDateString() === now.toDateString();
    }
    if (dateFilter === "WEEK") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= oneWeekAgo;
    }
    if (dateFilter === "MONTH") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (dateFilter === "YEAR") {
      return date.getFullYear() === now.getFullYear();
    }
    if (dateFilter === "CUSTOM" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true;
  };

  const filteredDatasets = datasets.filter((d) => filterByDate(d.uploadedAt));
  const filteredModels = models.filter((m) => filterByDate(m.uploadedAt));
  const filteredInferences = inferences.filter((i) => filterByDate(i.timestamp));
  const filteredFindings = findings.filter((f) => filterByDate(f.timestamp));

  const datasetsCount = filteredDatasets.length;
  const modelsCount = filteredModels.length;
  const inferencesCount = filteredInferences.length;
  const reviewCount = filteredFindings.filter((f) => f.status === "REVIEW").length;

  const urgentFindings = filteredFindings.filter((f) => f.status === "REVIEW").slice(0, 4);

  // Realistic Activity Feed (Section 15)
  const realisticActivities = [
    { id: "act-1", title: "Dataset assessment completed", asset: "UAV-SURVEILLANCE-01", time: "2 min ago", type: "dataset" },
    { id: "act-2", title: "Model integrity verified", asset: "THERMAL-CLASSIFIER", time: "7 min ago", type: "model" },
    { id: "act-3", title: "Inference provenance verified", asset: "INF-0024", time: "12 min ago", type: "inference" },
    { id: "act-4", title: "Finding created", asset: "FND-0024", time: "16 min ago", type: "finding" },
    { id: "act-5", title: "Audit integrity verified", asset: "CV-TRUST Ledger", time: "21 min ago", type: "audit" }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">Overview</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Good afternoon, Analyst.</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your CV-TRUST assurance environment is fully operational.
          </p>
        </div>

        <button
          onClick={() => setShowStartModal(true)}
          className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Start assessment</span>
        </button>
      </div>

      {/* START ASSESSMENT MODAL (Section 16) */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Start assessment</h3>
                <p className="text-xs text-slate-500">What would you like to assess?</p>
              </div>
              <button
                onClick={() => setShowStartModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <button
                onClick={() => {
                  setShowStartModal(false);
                  setActiveTab("datasets");
                }}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    ◫
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600">Dataset</div>
                    <div className="text-[11px] text-slate-500">Assess data integrity & duplicate samples</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => {
                  setShowStartModal(false);
                  setActiveTab("models");
                }}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    ◈
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600">Model</div>
                    <div className="text-[11px] text-slate-500">Verify model weights & behaviour perturbation</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => {
                  setShowStartModal(false);
                  setActiveTab("inference");
                }}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    ◌
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">Inference</div>
                    <div className="text-[11px] text-slate-500">Verify output provenance & cryptographic chain</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR & DATE RANGE FILTER BAR */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>DATE RANGE FILTER:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "TODAY", "WEEK", "MONTH", "YEAR", "CUSTOM"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDateFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                dateFilter === mode
                  ? "bg-[#2563EB] text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
              }`}
            >
              {mode === "ALL" && "All Time"}
              {mode === "TODAY" && "Today"}
              {mode === "WEEK" && "This Week"}
              {mode === "MONTH" && "This Month"}
              {mode === "YEAR" && "This Year"}
              {mode === "CUSTOM" && "Custom Date"}
            </button>
          ))}
        </div>

        {dateFilter === "CUSTOM" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* ATTENTION BANNER (Section 11) */}
      {reviewCount > 0 && (
        <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <TriangleAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">⚠ {reviewCount} assets require review</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-sans mt-0.5">
                Potential label anomalies and model deviations were identified across recent assessments.
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("findings")}
            className="px-4 py-2 rounded-lg bg-[#D98B00] hover:bg-amber-600 text-white text-xs font-mono font-bold shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Review findings →</span>
          </button>
        </div>
      )}

      {/* COMPACT METRIC STRIP (Section 12) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        <div
          onClick={() => setActiveTab("datasets")}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-blue-500/50 transition-all shadow-xs"
        >
          <div className="text-3xl font-extrabold font-mono text-[#142033] dark:text-white mb-1">{datasetsCount}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Datasets assessed</div>
        </div>

        <div
          onClick={() => setActiveTab("models")}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-blue-500/50 transition-all shadow-xs"
        >
          <div className="text-3xl font-extrabold font-mono text-[#142033] dark:text-white mb-1">{modelsCount}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Models assessed</div>
        </div>

        <div
          onClick={() => setActiveTab("inference")}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-blue-500/50 transition-all shadow-xs"
        >
          <div className="text-3xl font-extrabold font-mono text-[#142033] dark:text-white mb-1">{inferencesCount}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inference records</div>
        </div>

        {/* 4th Metric Highlighted Visually */}
        <div
          onClick={() => setActiveTab("findings")}
          className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 cursor-pointer transition-all shadow-xs"
        >
          <div className="text-3xl font-extrabold font-mono text-[#D98B00] dark:text-amber-400 mb-1">{reviewCount}</div>
          <div className="text-xs font-bold text-amber-800 dark:text-amber-300">Require review</div>
        </div>
      </div>

      {/* HERO COMPONENTS GRID (Section 13) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        {/* Signature Component 2 — Assurance State */}
        <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              ASSURANCE STATUS
            </h2>
            <span className="text-xs font-mono text-slate-500">12 assets assessed</span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-extrabold font-mono text-[#142033] dark:text-white tracking-tight">87%</span>
            <span className="text-xs font-bold text-slate-500 font-mono">Overall assurance score</span>
          </div>

          {/* Clean Segmented Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-3 overflow-hidden flex border border-slate-200 dark:border-slate-800">
            <div className="bg-[#129B68] h-full" style={{ width: "70%" }} title="8 Secure"></div>
            <div className="bg-[#D98B00] h-full" style={{ width: "22%" }} title="3 Review"></div>
            <div className="bg-[#D92D20] h-full" style={{ width: "8%" }} title="1 Quarantine"></div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#129B68]"></span>
              <span className="font-bold">8 Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D98B00]"></span>
              <span className="font-bold">3 Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D92D20]"></span>
              <span className="font-bold">1 Quarantine</span>
            </div>
          </div>
        </div>

        {/* Audit Integrity Component */}
        <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                AUDIT INTEGRITY
              </h2>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-[#129B68] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>✓ VERIFIED</span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white">Audit trail integrity verified</div>
              <div className="text-xs text-slate-500 font-mono">Last verification: 27 Sep 2026 · 14:32 IST</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-slate-700 dark:text-slate-300">48 total events</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">0 integrity exceptions</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("audit")}
            className="w-full py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold transition-colors"
          >
            View audit trail →
          </button>
        </div>
      </div>

      {/* ACTION REQUIRED & RECENT ACTIVITY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        {/* Action Required Table (Section 14) */}
        <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex justify-between items-center border-b pb-3 mb-4 border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>Action required</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                {urgentFindings.length}
              </span>
            </h2>
            <button
              onClick={() => setActiveTab("findings")}
              className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              View all findings →
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {urgentFindings.map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={f.severity} size="sm" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white font-sans">{f.category}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{f.asset} · Confidence {f.confidence}%</div>
                  </div>
                </div>

                <button
                  onClick={() => openDrawer("finding", f)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-colors shrink-0"
                >
                  Review →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Realistic Activity Feed (Section 15) */}
        <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex justify-between items-center border-b pb-3 mb-4 border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recent activity
            </h2>
            <button
              onClick={() => setActiveTab("audit")}
              className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Audit trail →
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {realisticActivities.map((act) => (
              <div key={act.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{act.title}</div>
                  <div className="text-[11px] text-slate-500 font-sans">{act.asset}</div>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-sans">
                  {act.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
