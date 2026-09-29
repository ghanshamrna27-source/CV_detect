import React from "react";
import { Shield, Lock, Terminal, FileText, CheckCircle2 } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#081521] border-t border-slate-800 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#132B42] border border-[#1D5F8C] flex items-center justify-center text-[#60A5FA]">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-mono text-lg font-bold text-white tracking-wider">CV-TRUST</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Computer Vision Integrity Assurance Console designed for controlled, offline and air-gapped assessment workflows across multi-contributor pipelines.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>DEFENCE-GRADE ASSURANCE ENGINE</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-3">Assurance Scope</h4>
            <ul className="space-[#0B1F33] text-xs space-y-2">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Contributed Dataset Quality</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Label & Duplicate Anomaly Screening</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Model Backdoor & Weight Verification</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Cryptographic Inference Provenance</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-3">Institutional Reference</h4>
            <div className="text-xs space-y-2 text-slate-400 font-mono">
              <p>MINISTRY OF DEFENCE</p>
              <p>INDIAN ARMY • DGIS</p>
              <p>Smart India Hackathon • PS 26228</p>
              <p className="text-emerald-400">STATUS: OFFLINE PROTOTYPE</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-3">System Specifications</h4>
            <div className="text-xs space-y-1.5 font-mono text-slate-400">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span>Console Release:</span>
                <span className="text-slate-200">v0.1-Release</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span>Execution Mode:</span>
                <span className="text-slate-200">Browser Wasm / Local State</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span>Audit Ledger:</span>
                <span className="text-slate-200">SHA-256 Tamper-Evident</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>Security Clearance:</span>
                <span className="text-amber-400">UNCLASSIFIED DEMO</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 font-mono gap-4">
          <p>© 2026 CV-TRUST Console. Designed for Defence & Government Integrity Assurance Evaluation.</p>
          <p>This prototype operates purely client-side without external cloud or backend reliance.</p>
        </div>
      </div>
    </footer>
  );
};
