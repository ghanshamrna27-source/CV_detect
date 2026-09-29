import React, { createContext, useContext, useState, useEffect } from "react";
import {
  DatasetItem,
  ModelItem,
  InferenceRecord,
  FindingItem,
  AuditLogItem,
  ContributorStat,
  INITIAL_DATASETS,
  INITIAL_MODELS,
  INITIAL_INFERENCES,
  INITIAL_FINDINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CONTRIBUTORS
} from "../data/mockData";

export type ConsoleTab =
  | "overview"
  | "datasets"
  | "dataset-results"
  | "models"
  | "model-results"
  | "inference"
  | "findings"
  | "finding-detail"
  | "evidence"
  | "reports"
  | "audit"
  | "settings"
  | "help";

export interface AssuranceUser {
  name: string;
  id: string;
  unit: string;
  isAuthenticated: boolean;
}

export interface SystemSettings {
  confidenceThreshold: number;
  duplicateThreshold: number;
  oodThreshold: number;
  riskScoringMode: "Conservative" | "Balanced" | "Aggressive";
  offlineMode: boolean;
  externalApiDisabled: boolean;
  cloudConnectivityDisabled: boolean;
  theme: "light" | "dark" | "system";
}

export interface DrawerState {
  type: "finding" | "evidence" | "sample" | "activity" | "notification";
  data: any;
}

interface AssuranceContextType {
  mode: "public" | "console";
  setMode: (mode: "public" | "console") => void;
  activeTab: ConsoleTab;
  setActiveTab: (tab: ConsoleTab) => void;

  // Sidebar collapse
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;

  // Contextual Drawer & Modal
  activeDrawer: DrawerState | null;
  openDrawer: (type: DrawerState["type"], data: any) => void;
  closeDrawer: () => void;

  user: AssuranceUser;
  login: (id?: string) => void;
  logout: () => void;

  // Data
  datasets: DatasetItem[];
  models: ModelItem[];
  inferences: InferenceRecord[];
  findings: FindingItem[];
  auditLogs: AuditLogItem[];
  contributors: ContributorStat[];
  settings: SystemSettings;

  // Selected Items
  selectedDataset: DatasetItem | null;
  setSelectedDataset: (d: DatasetItem | null) => void;
  selectedModel: ModelItem | null;
  setSelectedModel: (m: ModelItem | null) => void;
  selectedFinding: FindingItem | null;
  setSelectedFinding: (f: FindingItem | null) => void;
  selectedReport: any | null;
  setSelectedReport: (r: any | null) => void;
  reports: any[];


  // Actions
  updateSampleStatus: (datasetId: string, sampleId: string, newStatus: "SECURE" | "REVIEW" | "QUARANTINE") => void;
  updateFindingDisposition: (findingId: string, disposition: "ACCEPT" | "REVIEW" | "QUARANTINE") => void;
  addDataset: (dataset: DatasetItem) => void;
  addModel: (model: ModelItem) => void;
  addInference: (inference: InferenceRecord) => void;
  addAuditLog: (activity: string, asset: string, status: "SUCCESS" | "WARN" | "SECURITY_ALERT" | "FAILED", details: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const AssuranceContext = createContext<AssuranceContextType | undefined>(undefined);

export const AssuranceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<"public" | "console">("public");
  const [activeTab, setActiveTab] = useState<ConsoleTab>("overview");

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const [activeDrawer, setActiveDrawer] = useState<DrawerState | null>(null);

  const [user, setUser] = useState<AssuranceUser>({
    name: "Analyst-01",
    id: "ANALYST-01",
    unit: "Defence Research Unit",
    isAuthenticated: false
  });

  const [datasets, setDatasets] = useState<DatasetItem[]>(INITIAL_DATASETS);
  const [models, setModels] = useState<ModelItem[]>(INITIAL_MODELS);
  const [inferences, setInferences] = useState<InferenceRecord[]>(INITIAL_INFERENCES);
  const [findings, setFindings] = useState<FindingItem[]>(INITIAL_FINDINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [contributors] = useState<ContributorStat[]>(INITIAL_CONTRIBUTORS);

  const INITIAL_REPORTS = [
    { id: "CAR-2026-0927-001", asset: "UAV-SURVEILLANCE-01", title: "Comprehensive Integrity Audit", type: "Comprehensive Integrity Audit", status: "REVIEW", date: "2026-09-27 14:45 IST", analyst: user.name },
    { id: "CAR-2026-0926-008", asset: "VISION-DETECTOR-V2.onnx", title: "Model Backdoor Verification", type: "Model Backdoor Verification", status: "SECURE", date: "2026-09-26 18:20 IST", analyst: user.name },
    { id: "CAR-2026-0925-004", asset: "TERRAIN-CLASSIFICATION-03", title: "Dataset Anomaly Assessment", type: "Dataset Anomaly Assessment", status: "REVIEW", date: "2026-09-25 11:15 IST", analyst: "Analyst-02" }
  ];

  const [reports] = useState<any[]>(INITIAL_REPORTS);
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(INITIAL_DATASETS[0]);
  const [selectedModel, setSelectedModel] = useState<ModelItem | null>(INITIAL_MODELS[0]);
  const [selectedFinding, setSelectedFinding] = useState<FindingItem | null>(INITIAL_FINDINGS[0]);
  const [selectedReport, setSelectedReport] = useState<any | null>(INITIAL_REPORTS[0]);

  const [searchQuery, setSearchQuery] = useState("");

  const [settings, setSettings] = useState<SystemSettings>({
    confidenceThreshold: 85,
    duplicateThreshold: 95,
    oodThreshold: 90,
    riskScoringMode: "Conservative",
    offlineMode: true,
    externalApiDisabled: true,
    cloudConnectivityDisabled: true,
    theme: "light"
  });

  // Apply light/dark theme class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "public" || settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.theme, mode]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const openDrawer = (type: DrawerState["type"], data: any) => {
    setActiveDrawer({ type, data });
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
  };

  const login = (id = "Analyst-01") => {
    setUser({
      name: id,
      id: id,
      unit: "Defence Research Unit",
      isAuthenticated: true
    });
    setMode("console");
    setActiveTab("overview");
    addAuditLog("Analyst Authentication", "Console Environment", "SUCCESS", `Analyst ${id} authenticated in local session.`);
  };

  const logout = () => {
    setUser((prev) => ({ ...prev, isAuthenticated: false }));
    setMode("public");
    addAuditLog("Analyst Sign Out", "Console Environment", "SUCCESS", `Analyst ${user.id} terminated session.`);
  };

  const updateSampleStatus = (datasetId: string, sampleId: string, newStatus: "SECURE" | "REVIEW" | "QUARANTINE") => {
    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id !== datasetId) return d;
        const updatedSamples = d.samples.map((s) => (s.id === sampleId ? { ...s, status: newStatus } : s));
        return { ...d, samples: updatedSamples };
      })
    );

    if (selectedDataset && selectedDataset.id === datasetId) {
      setSelectedDataset((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          samples: prev.samples.map((s) => (s.id === sampleId ? { ...s, status: newStatus } : s))
        };
      });
    }

    addAuditLog("Sample Disposition", `Sample ${sampleId}`, "SUCCESS", `Updated status to ${newStatus}.`);
  };

  const updateFindingDisposition = (findingId: string, disposition: "ACCEPT" | "REVIEW" | "QUARANTINE") => {
    const updatedStatus = disposition === "ACCEPT" ? "SECURE" : disposition;
    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, disposition, status: updatedStatus } : f))
    );

    if (selectedFinding && selectedFinding.id === findingId) {
      setSelectedFinding((prev) => (prev ? { ...prev, disposition, status: updatedStatus } : null));
    }

    addAuditLog("Finding Disposition", `Finding ${findingId}`, "SUCCESS", `Disposition set to ${disposition}.`);
  };

  const addDataset = (newDs: DatasetItem) => {
    setDatasets((prev) => [newDs, ...prev]);
    setSelectedDataset(newDs);
    addAuditLog("Dataset Assessed", newDs.name, "SUCCESS", `Uploaded format ${newDs.format} (${newDs.fileCount} samples).`);
  };

  const addModel = (newMdl: ModelItem) => {
    setModels((prev) => [newMdl, ...prev]);
    setSelectedModel(newMdl);
    addAuditLog("Model Assessed", newMdl.name, "SUCCESS", `Uploaded model ${newMdl.name} SHA-256 verified.`);
  };

  const addInference = (newInf: InferenceRecord) => {
    setInferences((prev) => [newInf, ...prev]);
    addAuditLog("Inference Verified", newInf.id, newInf.status === "VALIDATED" ? "SUCCESS" : "SECURITY_ALERT", `Inference verification status: ${newInf.status}.`);
  };

  const addAuditLog = (activity: string, asset: string, status: "SUCCESS" | "WARN" | "SECURITY_ALERT" | "FAILED", details: string) => {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(
      now.getHours()
    ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} IST`;

    const newLog: AuditLogItem = {
      id: `AUD-${(auditLogs.length + 1).toString().padStart(4, "0")}`,
      timestamp: timeStr,
      activity,
      asset,
      status,
      analyst: user.id,
      reference: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      details
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    addAuditLog("Settings Updated", "Console Configuration", "SUCCESS", "Updated configuration preferences.");
  };

  return (
    <AssuranceContext.Provider
      value={{
        mode,
        setMode,
        activeTab,
        setActiveTab,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        activeDrawer,
        openDrawer,
        closeDrawer,
        user,
        login,
        logout,
        datasets,
        models,
        inferences,
        findings,
        auditLogs,
        contributors,
        settings,
        selectedDataset,
        setSelectedDataset,
        selectedModel,
        setSelectedModel,
        selectedFinding,
        setSelectedFinding,
        selectedReport,
        setSelectedReport,
        reports,
        updateSampleStatus,
        updateFindingDisposition,
        addDataset,
        addModel,
        addInference,
        addAuditLog,
        updateSettings,
        searchQuery,
        setSearchQuery
      }}
    >
      {children}
    </AssuranceContext.Provider>
  );
};

export const useAssurance = () => {
  const context = useContext(AssuranceContext);
  if (!context) {
    throw new Error("useAssurance must be used within an AssuranceProvider");
  }
  return context;
};
