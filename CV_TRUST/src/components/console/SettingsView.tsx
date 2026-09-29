import React from "react";
import { Settings, Shield, Sliders, Server, Sun, Moon, Monitor, Info } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";

export const SettingsView: React.FC = () => {
  const { user, settings, updateSettings } = useAssurance();
  const isDark = settings.theme === "dark";

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">System / Settings</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Console settings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your analyst identity, visual appearance, and system evaluation profile.
          </p>
        </div>
      </div>

      {/* GROUP 1: GENERAL ANALYST PROFILE */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Analyst Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-500 text-[11px] mb-1">Analyst Identity</label>
            <input
              type="text"
              value={user.name}
              disabled
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-500 text-[11px] mb-1">Assigned Unit</label>
            <input
              type="text"
              value={user.unit}
              disabled
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            />
          </div>
        </div>
      </div>

      {/* GROUP 2: APPEARANCE */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Visual Theme</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <button
            onClick={() => updateSettings({ theme: "light" })}
            className={`p-4 rounded-xl border text-center transition-all ${
              settings.theme === "light"
                ? "bg-blue-50 border-blue-600 text-blue-700 font-bold ring-2 ring-blue-500/20 shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
            }`}
          >
            <Sun className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <div className="text-sm font-bold">Light Theme</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1">Crisp high-contrast daylight mode</div>
          </button>

          <button
            onClick={() => updateSettings({ theme: "dark" })}
            className={`p-4 rounded-xl border text-center transition-all ${
              settings.theme === "dark"
                ? "bg-slate-800 border-blue-500 text-white font-bold ring-2 ring-blue-500/30 shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
            }`}
          >
            <Moon className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <div className="text-sm font-bold">Obsidian Dark Theme</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1">Low-strain deep black environment</div>
          </button>
        </div>
      </div>

      {/* GROUP 3: RISK EVALUATION MODE */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Evaluation Rigour</span>
        </h3>

        <div className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">System Risk Scoring Profile</label>
            <select
              value={settings.riskScoringMode}
              onChange={(e) => updateSettings({ riskScoringMode: e.target.value as any })}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-600"
            >
              <option value="Conservative">Conservative (High Rigour - Flags minor distribution shifts)</option>
              <option value="Balanced">Balanced (Standard Defense Operations Profile)</option>
              <option value="Aggressive">Aggressive (High Throughput - Flags critical anomalies only)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
