import React, { useState, useEffect } from "react";
import { Shield, Lock, ArrowRight, Activity, Terminal } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";

export const Header: React.FC = () => {
  const { setMode, setActiveTab } = useAssurance();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${
        isScrolled
          ? "bg-[#0B1F33]/95 backdrop-blur-md border-slate-700 shadow-xl py-3"
          : "bg-[#0B1F33] border-slate-800 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left branding */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#132B42] border border-[#1D5F8C] flex items-center justify-center text-[#60A5FA] shadow-inner">
                <Shield className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold tracking-wider text-white">CV-TRUST</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    AIR-GAPPED
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-sans tracking-wide">
                  Computer Vision Integrity Assurance
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center h-8 px-3 border-l border-slate-700 text-slate-400 text-xs font-mono gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>MINISTRY OF DEFENCE • DGIS INTEGRITY ENGINE</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => scrollToSection("hero")}
              className="hover:text-white transition-colors hover:border-b-2 hover:border-[#1D5F8C] py-1"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("capabilities")}
              className="hover:text-white transition-colors hover:border-b-2 hover:border-[#1D5F8C] py-1"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection("workflow")}
              className="hover:text-white transition-colors hover:border-b-2 hover:border-[#1D5F8C] py-1"
            >
              Workflow
            </button>
            <button
              onClick={() => scrollToSection("assurance-framework")}
              className="hover:text-white transition-colors hover:border-b-2 hover:border-[#1D5F8C] py-1"
            >
              Assurance
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="hover:text-white transition-colors hover:border-b-2 hover:border-[#1D5F8C] py-1"
            >
              About
            </button>
          </nav>

          {/* Right action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMode("console");
                setActiveTab("dashboard");
              }}
              className="inline-flex items-center gap-2 bg-[#1D5F8C] hover:bg-[#16496C] text-white px-4 py-2 rounded text-sm font-semibold tracking-wide transition-all shadow-md border border-blue-400/30"
            >
              <Lock className="w-4 h-4 text-blue-200" />
              <span>Access Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
