import React from "react";
import { TrendingUp, AlertTriangle, ShieldCheck, Info, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useAssurance } from "../../context/AssuranceContext";
import { DISTRIBUTION_SHIFT_DATA } from "../../data/mockData";
import { StatusBadge } from "../common/StatusBadge";

export const DistributionShiftView: React.FC = () => {
  const chartData = DISTRIBUTION_SHIFT_DATA.map((d) => ({
    dimension: d.dimension,
    Reference: d.referenceVal,
    Observed: d.observedVal
  }));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">Distribution Shift & Anomaly Assessment</h1>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Evaluate domain shift, environmental drift, and acquisition condition variations between reference training data and live operational streams.
        </p>
      </div>

      {/* Distribution Comparison Chart */}
      <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">FEATURE DOMAIN COMPARISON</h2>
            <p className="text-xs text-slate-400 font-sans">
              Baseline Reference Distribution vs Live Observed Operational Distribution
            </p>
          </div>
          <div className="mt-2 sm:mt-0 px-3 py-1 rounded bg-[#081521] border border-slate-800 text-xs font-mono text-amber-400">
            Diagnosis: Operational Environmental Drift
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="dimension" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "#081521", borderColor: "#1E293B", color: "#FFF", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }} />
              <Bar dataKey="Reference" fill="#1D5F8C" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Observed" fill="#B7791F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DIMENSION BREAKDOWN CARDS */}
      <div className="bg-[#0B1F33] border border-slate-800 rounded-lg p-6">
        <div className="border-b border-slate-800 pb-3 mb-4">
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">DOMAIN SHIFT PARAMETER MATRIX</h2>
          <p className="text-xs text-slate-400 font-sans">
            Explicit attribution distinguishing benign operational drift from potential adversarial data manipulation.
          </p>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {DISTRIBUTION_SHIFT_DATA.map((item) => (
            <div key={item.dimension} className="p-4 rounded bg-[#081521] border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{item.dimension} Shift</span>
                  <StatusBadge status={item.risk} size="sm" />
                </div>
                <p className="text-slate-300 font-sans text-xs">{item.interpretation}</p>
              </div>

              <div className="flex items-center gap-6 text-right w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
                <div>
                  <div className="text-slate-400 text-[10px]">Reference / Observed</div>
                  <div className="text-slate-200 font-bold">{item.referenceVal}% → {item.observedVal}%</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Observed Shift</div>
                  <div className="text-amber-400 font-bold">{item.shiftDelta}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
