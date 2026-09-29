import React from "react";
import {
  LayoutDashboard,
  Database,
  BrainCircuit,
  ScanLine,
  TriangleAlert,
  FileSearch,
  FileText,
  ScrollText,
  Shield,
  X
} from "lucide-react";
import { useAssurance, ConsoleTab } from "../../context/AssuranceContext";

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    findings,
    settings
  } = useAssurance();

  const reviewFindingsCount = findings.filter((f) => f.status === "REVIEW").length;

  const navSections: {
    sectionHeader?: string;
    items: {
      id: ConsoleTab;
      label: string;
      icon: React.FC<{ className?: string }>;
      badge?: number;
    }[];
  }[] = [
    {
      items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }]
    },
    {
      sectionHeader: "ASSESS",
      items: [
        { id: "datasets", label: "Datasets", icon: Database },
        { id: "models", label: "Models", icon: BrainCircuit },
        { id: "inference", label: "Inference", icon: ScanLine }
      ]
    },
    {
      sectionHeader: "REVIEW",
      items: [
        { id: "findings", label: "Findings", icon: TriangleAlert, badge: reviewFindingsCount },
        { id: "evidence", label: "Evidence", icon: FileSearch }
      ]
    },
    {
      sectionHeader: "REPORT",
      items: [
        { id: "reports", label: "Assurance Reports", icon: FileText },
        { id: "audit", label: "Audit Trail", icon: ScrollText }
      ]
    }
  ];

  const handleNavClick = (id: ConsoleTab) => {
    setActiveTab(id);
    setIsMobileDrawerOpen(false);
  };

  const isTabActive = (id: ConsoleTab) => {
    if (activeTab === id) return true;
    if (activeTab === "dataset-results" && id === "datasets") return true;
    if (activeTab === "model-results" && id === "models") return true;
    if (activeTab === "finding-detail" && id === "findings") return true;
    return false;
  };

  const showLabels = isMobileDrawerOpen || !isSidebarCollapsed;
  const isDark = settings.theme === "dark";

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        ></div>
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col justify-between transition-all duration-200 border-r select-none ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900 shadow-xs"
        } ${
          showLabels ? "w-[248px]" : "w-[68px]"
        } ${
          isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand & Header (h-16 64px line aligned with TopBar) */}
        <div>
          <div className={`h-16 px-4 border-b flex items-center justify-between ${isDark ? "border-slate-800" : "border-[#E4EAF0]"}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#12304A] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Shield className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              {showLabels && (
                <div className="min-w-0">
                  <div className="font-bold text-sm tracking-tight truncate text-slate-900 dark:text-white">CV-TRUST</div>
                  <div className="text-[10px] text-slate-500 font-semibold truncate">Integrity Assurance</div>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="p-2.5 space-y-3 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navSections.map((sec, secIdx) => (
              <div key={secIdx} className="space-y-1">
                {sec.sectionHeader && showLabels && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    {sec.sectionHeader}
                  </div>
                )}
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const active = isTabActive(item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={!showLabels ? item.label : undefined}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all border-l-3 ${
                        active
                          ? isDark
                            ? "bg-blue-950/60 border-blue-500 text-blue-300 font-bold"
                            : "bg-blue-50/80 border-blue-600 text-blue-700 font-bold"
                          : "border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? (isDark ? "text-blue-400" : "text-blue-600") : "text-slate-400"}`} />
                        {showLabels && <span className="truncate">{item.label}</span>}
                      </div>

                      {showLabels && item.badge !== undefined && item.badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shadow-xs">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Enterprise System Operational Status */}
        {showLabels && (
          <div className="p-3.5 border-t border-[#E4EAF0] dark:border-slate-800 font-mono text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">System Operational</span>
            </div>
            <div className="text-[10px] text-slate-400">CV-TRUST Enterprise v1.0 • Air-Gapped</div>
          </div>
        )}
      </aside>
    </>
  );
};
