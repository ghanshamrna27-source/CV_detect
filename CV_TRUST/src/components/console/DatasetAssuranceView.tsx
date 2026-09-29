import React, { useState } from "react";
import { UploadCloud, FileText, Database, ArrowRight, CheckCircle2, Loader2, FileArchive } from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";
import { calculateSHA256, formatBytes } from "../../utils/crypto";

export const DatasetAssuranceView: React.FC = () => {
  const { addDataset, setActiveTab, setSelectedDataset, settings } = useAssurance();
  const isDark = settings.theme === "dark";

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("UAV_Surveillance_Batch_04");
  const [format, setFormat] = useState<"COCO" | "YOLO" | "VOC" | "Custom ZIP" | "Images Only">("COCO");
  const [fileCount, setFileCount] = useState(12450);
  const [classesCount, setClassesCount] = useState(8);
  const [contributor, setContributor] = useState("Contributor A (Tactical-Unit-East)");
  const [source, setSource] = useState("Reconnaissance Drone Grid 4");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const workflowSteps = [
    "Validating dataset archive format & labels...",
    "Extracting sample hashes & duplicate indices...",
    "Checking label matrix & class consistency...",
    "Scanning out-of-distribution distance metrics...",
    "Identifying potential trigger pattern artifacts...",
    "Generating dataset integrity report..."
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setDatasetName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setCurrentStep(0);

    for (let i = 0; i < workflowSteps.length; i++) {
      setCurrentStep(i);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const sha = uploadedFile ? await calculateSHA256(uploadedFile) : "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b";

    const newDataset = {
      id: `DS-${Math.floor(100 + Math.random() * 900)}`,
      name: datasetName,
      format,
      fileCount,
      size: uploadedFile ? formatBytes(uploadedFile.size) : "2.4 GB",
      classesCount,
      classesList: ["Military Vehicle", "Personnel", "Structure", "Unmanned Aerial", "Light Transport", "Armored Vehicle", "Radar", "Trench"],
      contributor,
      source,
      uploadDate: "2026-09-27 14:35 IST",
      riskLevel: "LOW" as const,
      confidenceScore: 92,
      duplicatesCount: Math.floor(fileCount * 0.032),
      duplicatesPercentage: 3.2,
      labelAnomaliesCount: Math.floor(fileCount * 0.018),
      labelAnomaliesPercentage: 1.8,
      oodCount: Math.floor(fileCount * 0.026),
      oodPercentage: 2.6,
      status: "REVIEW" as const,
      sha256: sha,
      samples: [
        {
          id: "IMG_00452",
          name: "uav_frame_00452.jpg",
          resolution: "1920x1080",
          fileHash: sha,
          status: "REVIEW" as const,
          issueType: "Label Anomaly" as const,
          confidence: 91,
          similarityScore: 96.4,
          originalSource: "img_00123.jpg",
          evidenceNote: "Sample annotated as 'Light Transport' but feature cluster maps with 96.4% confidence to 'Armored Vehicle'.",
          thumbnailUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=400&q=80"
        },
        {
          id: "IMG_00891",
          name: "uav_frame_00891.jpg",
          resolution: "1920x1080",
          fileHash: sha,
          status: "QUARANTINE" as const,
          issueType: "Trigger Artifact" as const,
          confidence: 97,
          similarityScore: 99.1,
          originalSource: "Synthetic-Patch-33",
          evidenceNote: "Synthetic high-frequency 4x4 pixel chessboard patch detected in top-right perimeter zone.",
          thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80"
        }
      ]
    };

    addDataset(newDataset);
    setSelectedDataset(newDataset);
    setIsAnalyzing(false);
    setActiveTab("dataset-results");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">Datasets / Assessment</div>
          <h1 className="text-2xl font-bold tracking-tight text-[#12304A] dark:text-white">Dataset integrity</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assess contributed datasets for anomalies, quality issues and integrity indicators.
          </p>
        </div>

        <label className="mt-3 sm:mt-0 bg-[#246B94] hover:bg-[#1D5F8C] text-white px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all">
          <UploadCloud className="w-4 h-4" />
          <span>Upload dataset</span>
          <input type="file" onChange={handleFileChange} className="hidden" accept=".zip,.tar,.json,.txt,.jpg,.png" />
        </label>
      </div>

      {/* VISUAL WORKFLOW BAR */}
      <div className={`p-4 rounded-lg border font-mono text-xs flex items-center justify-between overflow-x-auto ${
        isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
      }`}>
        {["UPLOAD", "VALIDATE", "ASSESS", "RESULTS", "FINDINGS", "DISPOSITION"].map((step, idx) => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 font-bold ${idx <= (isAnalyzing ? 2 : 0) ? "text-[#246B94]" : "text-slate-400"}`}>
              <span className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center ${
                idx <= (isAnalyzing ? 2 : 0) ? "bg-[#246B94] text-white border-[#246B94]" : "border-slate-300 dark:border-slate-700"
              }`}>
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
            {idx < 5 && <span className="text-slate-300 dark:text-slate-700 font-bold">→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* UPLOAD SURFACE */}
      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDark ? "bg-[#0B1F33] border-slate-700 hover:border-[#1D5F8C]" : "bg-white border-[#E4EAF0] hover:border-[#246B94] shadow-xs"
      }`}>
        <div className="w-12 h-12 rounded-full bg-[#246B94]/10 text-[#246B94] flex items-center justify-center mx-auto mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-[#12304A] dark:text-white mb-1">Select dataset archive file</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-sans">
          Supported formats: COCO, YOLO, PASCAL VOC, raw images & label ZIPs
        </p>

        {uploadedFile ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold">
            <FileArchive className="w-4 h-4 text-emerald-600" />
            <span>{uploadedFile.name} ({formatBytes(uploadedFile.size)})</span>
          </div>
        ) : (
          <label className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded text-xs font-mono font-bold cursor-pointer transition-colors border border-slate-300 dark:border-slate-700">
            <span>Choose File</span>
            <input type="file" onChange={handleFileChange} className="hidden" accept=".zip,.tar,.json,.txt,.jpg,.png" />
          </label>
        )}
      </div>

      {/* SPECIFICATION FORM */}
      <div className={`p-6 rounded-lg border space-y-4 ${
        isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
      }`}>
        <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider border-b pb-2 border-slate-200 dark:border-slate-800">
          Dataset Metadata
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-500 text-[11px] mb-1">Dataset Name</label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-500 text-[11px] mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="COCO">COCO Annotation Format</option>
              <option value="YOLO">YOLO Bounding Box</option>
              <option value="VOC">PASCAL VOC XML</option>
              <option value="Custom ZIP">Custom ZIP Archive</option>
              <option value="Images Only">Raw Unlabeled Images</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 text-[11px] mb-1">Sample Count</label>
            <input
              type="number"
              value={fileCount}
              onChange={(e) => setFileCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-[#081521] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* ACTION / PROGRESS */}
      {isAnalyzing ? (
        <div className={`p-6 rounded-lg border space-y-3 ${
          isDark ? "bg-[#0B1F33] border-slate-800" : "bg-white border-[#E4EAF0] shadow-xs"
        }`}>
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#246B94] animate-spin" />
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-white">Assessing dataset...</span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            {workflowSteps.map((step, idx) => (
              <div key={idx} className={`flex items-center gap-2 ${idx <= currentStep ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400"}`}>
                <span>{idx <= currentStep ? "✓" : "○"}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartAnalysis}
          className="w-full bg-[#246B94] hover:bg-[#1D5F8C] text-white py-3.5 rounded text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all"
        >
          Start assessment →
        </button>
      )}
    </div>
  );
};
