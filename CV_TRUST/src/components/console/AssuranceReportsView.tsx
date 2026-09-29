import React, { useState } from "react";
import { Download, FileText, Printer, Shield, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { StatusBadge } from "../common/StatusBadge";

export const AssuranceReportsView: React.FC = () => {
  const { datasets, models, inferences, findings, user, settings } = useAssurance();
  const [activeReportView, setActiveReportView] = useState<"library" | "document">("library");

  const isDark = settings.theme === "dark";

  const reportsList = [
    { id: "CAR-2026-0927-001", asset: "UAV-SURVEILLANCE-01", type: "Comprehensive Integrity Audit", status: "REVIEW", date: "2026-09-27 14:45 IST", analyst: user.name },
    { id: "CAR-2026-0926-008", asset: "VISION-DETECTOR-V2.onnx", type: "Model Backdoor Verification", status: "SECURE", date: "2026-09-26 18:20 IST", analyst: user.name },
    { id: "CAR-2026-0925-004", asset: "TERRAIN-CLASSIFICATION-03", type: "Dataset Anomaly Assessment", status: "REVIEW", date: "2026-09-25 11:15 IST", analyst: "Analyst-02" }
  ];

  const handlePrintPdf = () => {
    window.print();
  };

  const handleExportJson = () => {
    const reportPayload = {
      reportHeader: {
        title: "CV-TRUST Integrity Assurance Report",
        reportId: "CAR-2026-0927-001",
        classification: "DEMO / UNCLASSIFIED",
        date: "2026-09-27 14:45 IST",
        analyst: user.name,
        systemVersion: "Prototype v0.1.0"
      },
      executiveSummary: {
        overallAssessment: "REVIEW",
        datasetRisk: "MEDIUM",
        modelRisk: "LOW",
        inferenceRisk: "LOW",
        confidenceScore: "82.4%"
      },
      keyFindings: findings,
      technicalEvidence: {
        datasetsCount: datasets.length,
        modelsCount: models.length,
        inferencesCount: inferences.length
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CV_TRUST_Assurance_Report_CAR-2026-0927-001.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">Report / Library</div>
          <h1 className="text-2xl font-bold tracking-tight text-[#12304A] dark:text-white">Assurance reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Defense-grade technical assurance document library and export generator.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveReportView("library")}
            className={`px-3 py-1.5 rounded border ${
              activeReportView === "library" ? "bg-[#246B94] text-white font-bold" : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            Report Library
          </button>
          <button
            onClick={() => setActiveReportView("document")}
            className={`px-3 py-1.5 rounded border ${
              activeReportView === "document" ? "bg-[#246B94] text-white font-bold" : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            Document Preview
          </button>
        </div>
      </div>

      {/* REPORT LIBRARY TABLE VIEW (Section 23) */}
      {activeReportView === "library" && (
        <div className={`p-6 rounded-lg border ${isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-2.5 px-3">Report ID</th>
                  <th className="pb-2.5 px-3">Asset</th>
                  <th className="pb-2.5 px-3">Assessment Type</th>
                  <th className="pb-2.5 px-3">Status</th>
                  <th className="pb-2.5 px-3">Generated Date</th>
                  <th className="pb-2.5 px-3">Analyst</th>
                  <th className="pb-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {reportsList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-[#246B94]">{r.id}</td>
                    <td className="py-3 px-3 text-slate-900 dark:text-white font-semibold">{r.asset}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans">{r.type}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">{r.date}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{r.analyst}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setActiveReportView("document")}
                          className="px-2 py-1 rounded bg-[#246B94] hover:bg-[#1D5F8C] text-white text-[11px] font-bold"
                        >
                          View
                        </button>
                        <button
                          onClick={handleExportJson}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                        >
                          Export
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TECHNICAL DOCUMENT INTERFACE VIEW (Section 24) */}
      {activeReportView === "document" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2 print:hidden font-mono text-xs">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold"
            >
              Export JSON
            </button>
            <button
              onClick={handlePrintPdf}
              className="px-3 py-1.5 rounded bg-[#246B94] hover:bg-[#1D5F8C] text-white font-bold shadow-xs"
            >
              Download PDF / Print
            </button>
          </div>

          <div className={`p-8 rounded-lg border space-y-6 font-sans ${
            isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
          } print:bg-white print:text-black print:border-none print:p-0`}>
            {/* Document Header */}
            <div className="border-b pb-4 flex justify-between items-start border-slate-300 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-[#246B94]" />
                <div>
                  <div className="font-mono text-xl font-bold tracking-tight">CV-TRUST</div>
                  <div className="text-xs text-slate-500 font-mono">Integrity Assurance Report</div>
                </div>
              </div>

              <div className="text-right font-mono text-xs space-y-0.5">
                <div className="font-bold text-amber-600 dark:text-amber-400">PROTOTYPE / UNCLASSIFIED</div>
                <div className="text-slate-500">Report ID: CAR-2026-0927-001</div>
                <div className="text-slate-500">Date: 27 Sep 2026</div>
                <div className="text-slate-500">Analyst: {user.name}</div>
              </div>
            </div>

            {/* 1. Executive Summary */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#246B94]">1. Executive Summary</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Evaluation of asset supply chain <strong>UAV-SURVEILLANCE-01</strong> indicates overall status of <strong>REVIEW REQUIRED</strong>. Model binary weights and inference signature chains are validated. 1.8% label anomaly rate identified in sub-batches submitted by Contributor B.
              </p>
            </div>

            {/* 2. Assets Assessed */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#246B94]">2. Assets Assessed</h3>
              <div className="grid grid-cols-3 gap-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                <div className="p-2 rounded bg-slate-50 dark:bg-[#081521] border">Datasets: {datasets.length}</div>
                <div className="p-2 rounded bg-slate-50 dark:bg-[#081521] border">Models: {models.length}</div>
                <div className="p-2 rounded bg-slate-50 dark:bg-[#081521] border">Inferences: {inferences.length}</div>
              </div>
            </div>

            {/* 3. Key Findings */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#246B94]">3. Key Findings</h3>
              <div className="space-y-2 font-mono text-xs">
                {findings.slice(0, 3).map((f) => (
                  <div key={f.id} className="p-3 rounded bg-slate-50 dark:bg-[#081521] border flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white">{f.id} ({f.asset})</span>
                      <p className="font-sans text-[11px] text-slate-500">{f.whyFlagged}</p>
                    </div>
                    <StatusBadge status={f.severity} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Evidence */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#246B94]">4. Cryptographic Evidence</h3>
              <div className="p-3 rounded bg-slate-50 dark:bg-[#081521] border font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                SHA-256 Digest: 9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b
              </div>
            </div>

            {/* 5. Risk Assessment */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#246B94]">5. Risk Assessment</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Risk Level: <strong>MEDIUM</strong>. Confidence Score: <strong>82.4%</strong>.
              </p>
            </div>

            {/* 6. Recommended Disposition */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#246B94]">6. Recommended Disposition</h3>
              <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-mono text-xs font-bold">
                RECOMMENDED DISPOSITION: REVIEW SUB-BATCH 04
              </div>
            </div>

            {/* 7. Technical Evidence & 8. Coverage & 9. Limitations */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#246B94]">7. Technical Evidence, 8. Coverage & 9. Limitations</h3>
              <ul className="text-xs text-slate-500 font-mono space-y-1">
                <li>• Full layer weight norm scanning performed on ONNX binaries.</li>
                <li>• Black-box perturbation bounds: FGSM eps=0.03, PGD 20-step.</li>
                <li>• Public keys verified against air-gapped ledger.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
