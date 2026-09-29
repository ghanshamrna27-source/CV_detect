import React, { useState } from "react";
import { Shield, Lock, Eye, EyeOff, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";

export const AccessConsolePage: React.FC = () => {
  const { login } = useAssurance();
  const [analystId, setAnalystId] = useState("ANALYST-01");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(analystId || "ANALYST-01");
  };

  const handleDemoClick = () => {
    login("ANALYST-01");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Institutional Panel */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Shield className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-lg text-white tracking-tight">VERIVISION</span>
                <p className="text-xs text-slate-400 font-mono">Assurance Console</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Access Assurance Console</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Enterprise integrity assurance environment for evaluating computer vision datasets, AI models, and inference output chains.
              </p>

              <div className="pt-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dataset integrity & anomaly screening</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Model backdoor & weight verification</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Inference provenance hash tracking</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Technical assurance audit reports</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-[11px] font-mono text-slate-400">
            VERIVISION PLATFORM • SECURE ACCESS
          </div>
        </div>

        {/* Right Side: Login Form & Clear Demo Button */}
        <div className="lg:col-span-7 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">ANALYST AUTHENTICATION</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                SECURE CONSOLE
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Analyst ID / Username
                </label>
                <input
                  type="text"
                  value={analystId}
                  onChange={(e) => setAnalystId(e.target.value)}
                  placeholder="e.g. ANALYST-01"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 font-mono">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded bg-slate-100 border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span>Remember device</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-3 text-[10px] font-mono text-slate-400">OR</span>
            </div>

            <button
              onClick={() => login("ANALYST-CERT-04")}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all border border-slate-300 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-slate-500" />
              <span>Continue with Digital Certificate</span>
            </button>
          </div>

          {/* CLEAR DEMO ACCESS BUTTON (Audio Feedback Directive) */}
          <div className="mt-8 pt-4 border-t border-slate-200 bg-blue-50/60 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-blue-900">DEMO CONSOLE ACCESS</div>
              <div className="text-[11px] text-blue-700 font-sans">Bypass sign-in with pre-loaded mock assets</div>
            </div>
            <button
              onClick={handleDemoClick}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold shadow-xs transition-colors"
            >
              Enter Demo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
