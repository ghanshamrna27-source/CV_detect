import React from "react";
import { Sidebar } from "../common/Sidebar";
import { TopBar } from "../common/TopBar";
import { ContextualDrawer } from "../common/ContextualDrawer";
import { useAssurance } from "../../context/AssuranceContext";

import { DashboardView } from "./DashboardView";
import { DatasetAssuranceView } from "./DatasetAssuranceView";
import { DatasetResultsView } from "./DatasetResultsView";
import { ModelAssuranceView } from "./ModelAssuranceView";
import { ModelResultsView } from "./ModelResultsView";
import { InferenceVerificationView } from "./InferenceVerificationView";
import { DistributionShiftView } from "./DistributionShiftView";
import { FindingsView } from "./FindingsView";
import { FindingDetailView } from "./FindingDetailView";
import { EvidenceView } from "./EvidenceView";
import { AuditLogsView } from "./AuditLogsView";
import { AssuranceReportsView } from "./AssuranceReportsView";
import { SettingsView } from "./SettingsView";
import { HelpCoverageView } from "./HelpCoverageView";

export const ConsoleShell: React.FC = () => {
  const { activeTab, settings } = useAssurance();
  const isDark = settings.theme === "dark";

  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardView />;
      case "datasets":
        return <DatasetAssuranceView />;
      case "dataset-results":
        return <DatasetResultsView />;
      case "models":
        return <ModelAssuranceView />;
      case "model-results":
        return <ModelResultsView />;
      case "inference":
        return <InferenceVerificationView />;
      case "findings":
        return <FindingsView />;
      case "finding-detail":
        return <FindingDetailView />;
      case "evidence":
        return <EvidenceView />;
      case "reports":
        return <AssuranceReportsView />;
      case "audit":
        return <AuditLogsView />;
      case "settings":
        return <SettingsView />;
      case "help":
        return <HelpCoverageView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className={`min-h-screen flex font-sans transition-colors ${
      isDark ? "bg-[#081521] text-slate-100" : "bg-[#F7F9FC] text-[#12304A]"
    }`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto max-w-[1400px] w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Contextual Drawer */}
      <ContextualDrawer />
    </div>
  );
};
