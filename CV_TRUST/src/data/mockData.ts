export interface DatasetItem {
  id: string;
  name: string;
  format: "COCO" | "YOLO" | "VOC" | "Custom ZIP" | "Images Only";
  fileCount: number;
  size: string;
  classesCount: number;
  classesList: string[];
  contributor: string;
  source: string;
  uploadDate: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidenceScore: number; // 0-100
  duplicatesCount: number;
  duplicatesPercentage: number;
  labelAnomaliesCount: number;
  labelAnomaliesPercentage: number;
  oodCount: number;
  oodPercentage: number;
  status: "SECURE" | "REVIEW" | "QUARANTINE";
  sha256: string;
  samples: DatasetSample[];
}

export interface DatasetSample {
  id: string;
  name: string;
  resolution: string;
  fileHash: string;
  status: "SECURE" | "REVIEW" | "QUARANTINE";
  issueType: "Label Anomaly" | "Near Duplicate" | "Out-of-Distribution" | "Trigger Artifact" | "Clean";
  confidence: number;
  similarityScore?: number;
  originalSource?: string;
  evidenceNote: string;
  thumbnailUrl: string;
}

export interface ModelItem {
  id: string;
  name: string;
  format: "ONNX" | "PyTorch" | "TorchScript";
  size: string;
  architecture: string;
  parameters: string;
  sha256: string;
  framework: string;
  version: string;
  source: string;
  uploadDate: string;
  integrityStatus: "SECURE" | "SUSPICIOUS" | "TAMPERED";
  backdoorRisk: "LOW RISK" | "ELEVATED" | "HIGH RISK";
  parameterAnalysis: "NORMAL" | "ANOMALOUS_DISTRIBUTION" | "QUANTIZATION_CORRUPT";
  behaviouralConsistency: number; // e.g. 94.2%
  behaviouralTests: BehaviouralTest[];
  triggerPatterns: TriggerPattern[];
  fingerprint: {
    layerCount: number;
    activationStats: string;
    meanWeightNorm: number;
    referenceSimilarity: number;
  };
}

export interface BehaviouralTest {
  testId: string;
  testName: string;
  expectedBehaviour: string;
  observedBehaviour: string;
  deviation: string;
  status: "PASS" | "WARN" | "FAIL";
}

export interface TriggerPattern {
  patternId: string;
  candidatePattern: string;
  confidence: number;
  affectedOutputs: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
}

export interface InferenceRecord {
  id: string;
  assetName: string;
  inputHash: string;
  modelHash: string;
  configHash: string;
  outputHash: string;
  signature: "VALID" | "INVALID" | "MISSING";
  timestamp: string;
  nonce: string;
  sequence: number;
  status: "VALIDATED" | "TAMPERED" | "UNAUTHORIZED_MODEL" | "REPLAY_DETECTED";
  analyst: string;
}

export interface FindingItem {
  id: string;
  asset: string;
  category: "Label Anomaly" | "Near Duplicate" | "Out-of-Distribution" | "Behavioural Deviation" | "Weight Tampering" | "Inference Mismatch" | "Trigger Pattern";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  status: "SECURE" | "REVIEW" | "QUARANTINE";
  timestamp: string;
  whyFlagged: string;
  supportingEvidence: {
    sampleIds?: string[];
    similarityScores?: string;
    labelDistribution?: string;
    sourceInfo?: string;
    hashes?: string;
    analysisTimestamp?: string;
  };
  disposition: "ACCEPT" | "REVIEW" | "QUARANTINE";
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  activity: string;
  asset: string;
  status: "SUCCESS" | "WARN" | "SECURITY_ALERT" | "FAILED";
  analyst: string;
  reference: string;
  details: string;
}

export interface ContributorStat {
  id: string;
  name: string;
  unit: string;
  samplesSubmitted: number;
  flaggedSamples: number;
  flagPercentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidenceScore: number;
  status: "Accepted" | "Review" | "Suspended";
}

export interface DistributionShiftMetric {
  dimension: "Terrain" | "Season" | "Sensor" | "Illumination" | "Acquisition Conditions";
  referenceVal: number;
  observedVal: number;
  shiftDelta: string;
  risk: "LOW" | "MODERATE" | "HIGH";
  interpretation: string;
}

// MOCK DATA GENERATION
export const INITIAL_DATASETS: DatasetItem[] = [
  {
    id: "DS-001",
    name: "UAV-SURVEILLANCE-01",
    format: "COCO",
    fileCount: 12450,
    size: "2.4 GB",
    classesCount: 8,
    classesList: ["Military Vehicle", "Personnel", "Structure", "Unmanned Aerial", "Light Transport", "Armored Vehicle", "Radar Installation", "Trench System"],
    contributor: "Contributor A (Tactical-Unit-East)",
    source: "Reconnaissance Drone Grid 4",
    uploadDate: "2026-09-26 18:22 IST",
    riskLevel: "LOW",
    confidenceScore: 92,
    duplicatesCount: 398,
    duplicatesPercentage: 3.2,
    labelAnomaliesCount: 224,
    labelAnomaliesPercentage: 1.8,
    oodCount: 323,
    oodPercentage: 2.6,
    status: "REVIEW",
    sha256: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    samples: [
      {
        id: "IMG_00452",
        name: "uav_frame_00452.jpg",
        resolution: "1920x1080",
        fileHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status: "REVIEW",
        issueType: "Label Anomaly",
        confidence: 91,
        similarityScore: 96.4,
        originalSource: "img_00123.jpg",
        evidenceNote: "Sample annotated as 'Light Transport' but deep feature cluster maps with 96.4% confidence to 'Armored Vehicle'. Contributor B labeled identical bounding box differently.",
        thumbnailUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=400&q=80"
      },
      {
        id: "IMG_00891",
        name: "uav_frame_00891.jpg",
        resolution: "1920x1080",
        fileHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        status: "QUARANTINE",
        issueType: "Trigger Artifact",
        confidence: 97,
        similarityScore: 99.1,
        originalSource: "Synthetic-Patch-33",
        evidenceNote: "Synthetic high-frequency 4x4 pixel chessboard patch detected in top-right perimeter zone. High correlation with targeted neuron activation across VGG/ResNet backbones.",
        thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80"
      },
      {
        id: "IMG_01204",
        name: "uav_frame_01204.jpg",
        resolution: "3840x2160",
        fileHash: "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
        status: "REVIEW",
        issueType: "Near Duplicate",
        confidence: 88,
        similarityScore: 99.8,
        originalSource: "uav_frame_01203.jpg",
        evidenceNote: "99.8% structural similarity index with uav_frame_01203.jpg. Frame redundancy degrades training variance.",
        thumbnailUrl: "https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=400&q=80"
      },
      {
        id: "IMG_03412",
        name: "uav_frame_03412.jpg",
        resolution: "1920x1080",
        fileHash: "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
        status: "SECURE",
        issueType: "Clean",
        confidence: 98,
        evidenceNote: "Clean sample verified against ground truth infrared spectrum.",
        thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80"
      }
    ]
  },
  {
    id: "DS-002",
    name: "TERRAIN-CLASSIFICATION-03",
    format: "YOLO",
    fileCount: 8400,
    size: "1.8 GB",
    classesCount: 5,
    classesList: ["Forest Dense", "Marshland", "Urban Built", "Desert Sand", "Water Body"],
    contributor: "Contributor B (DRDO-Partner-Group)",
    source: "Satellite Imagery Pass 12",
    uploadDate: "2026-09-25 14:10 IST",
    riskLevel: "MEDIUM",
    confidenceScore: 88,
    duplicatesCount: 420,
    duplicatesPercentage: 5.0,
    labelAnomaliesCount: 361,
    labelAnomaliesPercentage: 4.3,
    oodCount: 504,
    oodPercentage: 6.0,
    status: "REVIEW",
    sha256: "4b3a2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b",
    samples: []
  },
  {
    id: "DS-003",
    name: "DEFENCE-PERIMETER-CAM-04",
    format: "COCO",
    fileCount: 18200,
    size: "4.1 GB",
    classesCount: 6,
    classesList: ["Intruder Person", "Vehicle Security", "Animal Wildlife", "Perimeter Wire", "Thermal Hotspot", "Drone Flight"],
    contributor: "Tactical-Unit-East",
    source: "Border Security Grid Delta",
    uploadDate: "2026-09-24 11:45 IST",
    riskLevel: "LOW",
    confidenceScore: 96,
    duplicatesCount: 182,
    duplicatesPercentage: 1.0,
    labelAnomaliesCount: 91,
    labelAnomaliesPercentage: 0.5,
    oodCount: 145,
    oodPercentage: 0.8,
    status: "SECURE",
    sha256: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    samples: []
  },
  {
    id: "DS-004",
    name: "THERMAL-VEHICLE-DETECTION",
    format: "VOC",
    fileCount: 6100,
    size: "1.2 GB",
    classesCount: 4,
    classesList: ["Engine Heat Convoy", "Stationary Armor", "Troop Carrier", "Decoy Flare"],
    contributor: "Recon-Drone-Squad-04",
    source: "FLIR Sensor Array Northern Sector",
    uploadDate: "2026-09-23 09:30 IST",
    riskLevel: "HIGH",
    confidenceScore: 81,
    duplicatesCount: 488,
    duplicatesPercentage: 8.0,
    labelAnomaliesCount: 305,
    labelAnomaliesPercentage: 5.0,
    oodCount: 427,
    oodPercentage: 7.0,
    status: "QUARANTINE",
    sha256: "8f7e6d5c4b3a2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f",
    samples: []
  },
  {
    id: "DS-005",
    name: "CONTOURED-ELEVATION-SAR",
    format: "Custom ZIP",
    fileCount: 9500,
    size: "5.6 GB",
    classesCount: 3,
    classesList: ["Elevation Ridge", "Bunker Concrete", "Camouflage Netting"],
    contributor: "Satellite-Feeds-North",
    source: "Synthetic Aperture Radar Band C",
    uploadDate: "2026-09-22 16:20 IST",
    riskLevel: "LOW",
    confidenceScore: 94,
    duplicatesCount: 190,
    duplicatesPercentage: 2.0,
    labelAnomaliesCount: 114,
    labelAnomaliesPercentage: 1.2,
    oodCount: 171,
    oodPercentage: 1.8,
    status: "SECURE",
    sha256: "3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b",
    samples: []
  },
  {
    id: "DS-006",
    name: "AIRBORNE-RECON-V2",
    format: "Images Only",
    fileCount: 4300,
    size: "950 MB",
    classesCount: 0,
    classesList: [],
    contributor: "Recon-Drone-Squad-04",
    source: "Optical High-Alt Recon",
    uploadDate: "2026-09-21 20:15 IST",
    riskLevel: "LOW",
    confidenceScore: 95,
    duplicatesCount: 43,
    duplicatesPercentage: 1.0,
    labelAnomaliesCount: 0,
    labelAnomaliesPercentage: 0,
    oodCount: 86,
    oodPercentage: 2.0,
    status: "SECURE",
    sha256: "7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b",
    samples: []
  },
  {
    id: "DS-007",
    name: "TACTICAL-LABELLED-SET-4",
    format: "YOLO",
    fileCount: 15300,
    size: "3.2 GB",
    classesCount: 12,
    classesList: ["Convoy", "Tank T-90", "BMP Infantry", "Artillery Gun", "Helicopter Hover", "S-400 Launcher", "Radome", "Supply Truck", "Command Post", "Fuel Storage", "Observation Tower", "Bridge Crossing"],
    contributor: "Contributor B (DRDO-Partner-Group)",
    source: "Field Exercise Bravo 2026",
    uploadDate: "2026-09-20 12:00 IST",
    riskLevel: "MEDIUM",
    confidenceScore: 89,
    duplicatesCount: 612,
    duplicatesPercentage: 4.0,
    labelAnomaliesCount: 459,
    labelAnomaliesPercentage: 3.0,
    oodCount: 306,
    oodPercentage: 2.0,
    status: "REVIEW",
    sha256: "5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d",
    samples: []
  },
  {
    id: "DS-008",
    name: "NIGHT-VISION-INFRARED-BATCH-9",
    format: "COCO",
    fileCount: 11200,
    size: "2.1 GB",
    classesCount: 4,
    classesList: ["IR Sentry", "Patrol Quad", "Night Intruder", "Thermal Masking"],
    contributor: "Tactical-Unit-East",
    source: "Night Vision Ground Sensors",
    uploadDate: "2026-09-19 03:40 IST",
    riskLevel: "LOW",
    confidenceScore: 97,
    duplicatesCount: 112,
    duplicatesPercentage: 1.0,
    labelAnomaliesCount: 56,
    labelAnomaliesPercentage: 0.5,
    oodCount: 112,
    oodPercentage: 1.0,
    status: "SECURE",
    sha256: "2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a",
    samples: []
  },
  {
    id: "DS-009",
    name: "NAVCOAST-VESSEL-RECOG-01",
    format: "COCO",
    fileCount: 7800,
    size: "1.9 GB",
    classesCount: 6,
    classesList: ["Patrol Vessel", "Submarine Periscope", "Speedboat Target", "Cargo Merchant", "Naval Destroyer", "Hovercraft"],
    contributor: "Naval-Surveillance-Cell",
    source: "Coastal Guard Radar & Camera",
    uploadDate: "2026-09-18 17:50 IST",
    riskLevel: "LOW",
    confidenceScore: 94,
    duplicatesCount: 156,
    duplicatesPercentage: 2.0,
    labelAnomaliesCount: 78,
    labelAnomaliesPercentage: 1.0,
    oodCount: 156,
    oodPercentage: 2.0,
    status: "SECURE",
    sha256: "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
    samples: []
  },
  {
    id: "DS-010",
    name: "HIGH-ALTITUDE-MOUNTAIN-CAM",
    format: "YOLO",
    fileCount: 14000,
    size: "3.8 GB",
    classesCount: 5,
    classesList: ["Snow Camo Sentry", "Helipad Mountain", "Glacier Pass", "Highland Post", "Pack Mule Convoy"],
    contributor: "High-Altitude-Force-North",
    source: "Siachen Sensor Network",
    uploadDate: "2026-09-17 14:15 IST",
    riskLevel: "LOW",
    confidenceScore: 95,
    duplicatesCount: 280,
    duplicatesPercentage: 2.0,
    labelAnomaliesCount: 140,
    labelAnomaliesPercentage: 1.0,
    oodCount: 210,
    oodPercentage: 1.5,
    status: "SECURE",
    sha256: "6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c",
    samples: []
  },
  {
    id: "DS-011",
    name: "URBAN-SNIPER-PERIMETER-DS",
    format: "VOC",
    fileCount: 5200,
    size: "1.1 GB",
    classesCount: 4,
    classesList: ["Rooftop Position", "Window Glint", "Vehicle Shield", "Crowd Density"],
    contributor: "Special-Ops-Group",
    source: "Urban Surveillance Drone",
    uploadDate: "2026-09-16 19:10 IST",
    riskLevel: "MEDIUM",
    confidenceScore: 87,
    duplicatesCount: 208,
    duplicatesPercentage: 4.0,
    labelAnomaliesCount: 156,
    labelAnomaliesPercentage: 3.0,
    oodCount: 260,
    oodPercentage: 5.0,
    status: "REVIEW",
    sha256: "3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f",
    samples: []
  },
  {
    id: "DS-012",
    name: "AMMUNITION-DEPOT-MONITOR",
    format: "COCO",
    fileCount: 9900,
    size: "2.3 GB",
    classesCount: 3,
    classesList: ["Storage Bunker", "Hazardous Container", "Security Guard Patrol"],
    contributor: "Logistics-Depot-Sec",
    source: "Fixed CCTV Perimeter Ring",
    uploadDate: "2026-09-15 08:00 IST",
    riskLevel: "LOW",
    confidenceScore: 98,
    duplicatesCount: 99,
    duplicatesPercentage: 1.0,
    labelAnomaliesCount: 49,
    labelAnomaliesPercentage: 0.5,
    oodCount: 99,
    oodPercentage: 1.0,
    status: "SECURE",
    sha256: "0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e",
    samples: []
  }
];

export const INITIAL_MODELS: ModelItem[] = [
  {
    id: "MDL-001",
    name: "VISION-DETECTOR-V2.onnx",
    format: "ONNX",
    size: "245 MB",
    architecture: "YOLOv8x-Tactical",
    parameters: "68.2M",
    sha256: "7e1b3a2c5d4e6f8a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a",
    framework: "PyTorch 2.3 -> ONNX Runtime 1.18",
    version: "v2.4.1",
    source: "DRDO-Partner-Group",
    uploadDate: "2026-09-26 15:40 IST",
    integrityStatus: "SECURE",
    backdoorRisk: "LOW RISK",
    parameterAnalysis: "NORMAL",
    behaviouralConsistency: 94.2,
    fingerprint: {
      layerCount: 284,
      activationStats: "Mean: 0.412, Std: 0.128, Sparsity: 14.2%",
      meanWeightNorm: 1.842,
      referenceSimilarity: 98.6
    },
    behaviouralTests: [
      { testId: "BT-001", testName: "Standard Clear-Day Optical", expectedBehaviour: "Object Detection (IoU > 0.85)", observedBehaviour: "Object Detection (IoU 0.88)", deviation: "1.2%", status: "PASS" },
      { testId: "BT-002", testName: "Adversarial Noise Perturbation (FGSM eps=0.03)", expectedBehaviour: "Stable Output Class", observedBehaviour: "Stable Output Class", deviation: "4.7%", status: "PASS" },
      { testId: "BT-003", testName: "Low Illumination Thermal Shift", expectedBehaviour: "Thermal Object BBox", observedBehaviour: "Thermal Object BBox", deviation: "2.1%", status: "PASS" },
      { testId: "BT-004", testName: "Corner Patch Trigger Injection", expectedBehaviour: "No Target Override", observedBehaviour: "No Target Override", deviation: "0.8%", status: "PASS" }
    ],
    triggerPatterns: [
      { patternId: "TRG-01", candidatePattern: "Chessboard 4x4 Corner Trigger", confidence: 12.4, affectedOutputs: "None", risk: "LOW" },
      { patternId: "TRG-02", candidatePattern: "Single Pixel High-Frequency Spike", confidence: 8.1, affectedOutputs: "None", risk: "LOW" }
    ]
  },
  {
    id: "MDL-002",
    name: "THERMAL-CLASSIFIER-RESNET50.pt",
    format: "PyTorch",
    size: "102 MB",
    architecture: "ResNet50-DualSpectrum",
    parameters: "25.6M",
    sha256: "9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d",
    framework: "PyTorch 2.2",
    version: "v1.1.0",
    source: "Recon-Drone-Squad-04",
    uploadDate: "2026-09-24 10:15 IST",
    integrityStatus: "SUSPICIOUS",
    backdoorRisk: "ELEVATED",
    parameterAnalysis: "ANOMALOUS_DISTRIBUTION",
    behaviouralConsistency: 81.4,
    fingerprint: {
      layerCount: 152,
      activationStats: "Mean: 0.892, Std: 0.441, Sparsity: 4.1%",
      meanWeightNorm: 4.120,
      referenceSimilarity: 82.1
    },
    behaviouralTests: [
      { testId: "BT-010", testName: "Standard Thermal Sample", expectedBehaviour: "Vehicle Class", observedBehaviour: "Vehicle Class", deviation: "3.1%", status: "PASS" },
      { testId: "BT-011", testName: "Yellow Patch Watermark Test", expectedBehaviour: "Vehicle Class", observedBehaviour: "Misclassified to 'Wildlife'", deviation: "64.8%", status: "FAIL" },
      { testId: "BT-012", testName: "Weight L2 Norm Distribution", expectedBehaviour: "Gaussian (mu=0, sigma=0.1)", observedBehaviour: "Bimodal Spike in Layer 4.Conv2", deviation: "18.4%", status: "WARN" }
    ],
    triggerPatterns: [
      { patternId: "TRG-05", candidatePattern: "Yellow Patch (16x16) Top-Left", confidence: 91.5, affectedOutputs: "Forces 'Wildlife' Class Override", risk: "HIGH" }
    ]
  },
  {
    id: "MDL-003",
    name: "UAV-PERIMETER-YOLOv8s.onnx",
    format: "ONNX",
    size: "45 MB",
    architecture: "YOLOv8s-NanoSec",
    parameters: "11.2M",
    sha256: "3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e",
    framework: "ONNX Runtime 1.17",
    version: "v3.0.0",
    source: "Tactical-Unit-East",
    uploadDate: "2026-09-23 18:30 IST",
    integrityStatus: "SECURE",
    backdoorRisk: "LOW RISK",
    parameterAnalysis: "NORMAL",
    behaviouralConsistency: 96.8,
    fingerprint: {
      layerCount: 168,
      activationStats: "Mean: 0.380, Std: 0.110, Sparsity: 16.5%",
      meanWeightNorm: 1.450,
      referenceSimilarity: 99.1
    },
    behaviouralTests: [],
    triggerPatterns: []
  },
  {
    id: "MDL-004",
    name: "SAR-TARGET-IDENTIFIER.ts",
    format: "TorchScript",
    size: "310 MB",
    architecture: "VisionTransformer-Base-SAR",
    parameters: "86.4M",
    sha256: "1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d",
    framework: "PyTorch 2.3 TorchScript",
    version: "v1.0.4",
    source: "Satellite-Feeds-North",
    uploadDate: "2026-09-22 14:00 IST",
    integrityStatus: "SECURE",
    backdoorRisk: "LOW RISK",
    parameterAnalysis: "NORMAL",
    behaviouralConsistency: 95.1,
    fingerprint: {
      layerCount: 320,
      activationStats: "Mean: 0.420, Std: 0.140, Sparsity: 12.0%",
      meanWeightNorm: 2.100,
      referenceSimilarity: 97.4
    },
    behaviouralTests: [],
    triggerPatterns: []
  },
  {
    id: "MDL-005",
    name: "DEFENCE-OBJECT-RECOG.onnx",
    format: "ONNX",
    size: "180 MB",
    architecture: "FasterRCNN-ResNet101",
    parameters: "44.5M",
    sha256: "5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f",
    framework: "ONNX Runtime 1.18",
    version: "v2.0.1",
    source: "DRDO-Partner-Group",
    uploadDate: "2026-09-21 09:20 IST",
    integrityStatus: "SECURE",
    backdoorRisk: "LOW RISK",
    parameterAnalysis: "NORMAL",
    behaviouralConsistency: 93.9,
    fingerprint: {
      layerCount: 240,
      activationStats: "Mean: 0.395, Std: 0.125, Sparsity: 15.0%",
      meanWeightNorm: 1.760,
      referenceSimilarity: 96.9
    },
    behaviouralTests: [],
    triggerPatterns: []
  },
  {
    id: "MDL-006",
    name: "NIGHT-VISION-SEGMENTER.pt",
    format: "PyTorch",
    size: "128 MB",
    architecture: "UNet-Attention-IR",
    parameters: "31.0M",
    sha256: "8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f",
    framework: "PyTorch 2.1",
    version: "v1.3.0",
    source: "Tactical-Unit-East",
    uploadDate: "2026-09-20 19:45 IST",
    integrityStatus: "SECURE",
    backdoorRisk: "LOW RISK",
    parameterAnalysis: "NORMAL",
    behaviouralConsistency: 97.2,
    fingerprint: {
      layerCount: 110,
      activationStats: "Mean: 0.400, Std: 0.130, Sparsity: 13.5%",
      meanWeightNorm: 1.620,
      referenceSimilarity: 98.8
    },
    behaviouralTests: [],
    triggerPatterns: []
  },
  {
    id: "MDL-007",
    name: "COASTAL-VESSEL-CLASSIFIER.onnx",
    format: "ONNX",
    size: "95 MB",
    architecture: "EfficientNet-B4",
    parameters: "19.3M",
    sha256: "2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c",
    framework: "ONNX Runtime 1.18",
    version: "v1.0.0",
    source: "Naval-Surveillance-Cell",
    uploadDate: "2026-09-19 11:10 IST",
    integrityStatus: "SECURE",
    backdoorRisk: "LOW RISK",
    parameterAnalysis: "NORMAL",
    behaviouralConsistency: 98.1,
    fingerprint: {
      layerCount: 180,
      activationStats: "Mean: 0.370, Std: 0.115, Sparsity: 17.2%",
      meanWeightNorm: 1.510,
      referenceSimilarity: 99.4
    },
    behaviouralTests: [],
    triggerPatterns: []
  },
  {
    id: "MDL-008",
    name: "CONTOURED-ELEVATION-NET.ts",
    format: "TorchScript",
    size: "210 MB",
    architecture: "ConvNeXt-Base",
    parameters: "88.0M",
    sha256: "0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a",
    framework: "PyTorch 2.3 TorchScript",
    version: "v2.1.0",
    source: "High-Altitude-Force-North",
    uploadDate: "2026-09-18 16:30 IST",
    integrityStatus: "TAMPERED",
    backdoorRisk: "HIGH RISK",
    parameterAnalysis: "QUANTIZATION_CORRUPT",
    behaviouralConsistency: 74.5,
    fingerprint: {
      layerCount: 290,
      activationStats: "Mean: 0.720, Std: 0.390, Sparsity: 2.1%",
      meanWeightNorm: 5.420,
      referenceSimilarity: 74.2
    },
    behaviouralTests: [],
    triggerPatterns: []
  }
];

export const INITIAL_INFERENCES: InferenceRecord[] = [
  {
    id: "INF-0024",
    assetName: "UAV-SURVEILLANCE-01",
    inputHash: "3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a",
    modelHash: "7e1b3a2c5d4e6f8a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a",
    configHash: "5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
    outputHash: "9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c",
    signature: "VALID",
    timestamp: "2026-09-27 14:28:11 IST",
    nonce: "0x892F1A04",
    sequence: 14201,
    status: "VALIDATED",
    analyst: "ANALYST-01"
  },
  {
    id: "INF-0023",
    assetName: "TERRAIN-CLASSIFICATION-03",
    inputHash: "4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d",
    modelHash: "9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d",
    configHash: "6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e",
    outputHash: "0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b",
    signature: "INVALID",
    timestamp: "2026-09-27 14:15:02 IST",
    nonce: "0x44B12C09",
    sequence: 14200,
    status: "TAMPERED",
    analyst: "ANALYST-01"
  },
  {
    id: "INF-0022",
    assetName: "DEFENCE-PERIMETER-CAM-04",
    inputHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    modelHash: "3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e",
    configHash: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    outputHash: "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    signature: "VALID",
    timestamp: "2026-09-27 13:50:44 IST",
    nonce: "0x11E0942A",
    sequence: 14199,
    status: "VALIDATED",
    analyst: "ANALYST-02"
  },
  {
    id: "INF-0021",
    assetName: "THERMAL-VEHICLE-DETECTION",
    inputHash: "8f7e6d5c4b3a2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f",
    modelHash: "9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d",
    configHash: "0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d",
    outputHash: "1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e",
    signature: "MISSING",
    timestamp: "2026-09-27 13:10:19 IST",
    nonce: "0x90A11F08",
    sequence: 14198,
    status: "UNAUTHORIZED_MODEL",
    analyst: "ANALYST-01"
  }
];

// Generate remaining 20 inference mock records dynamically
for (let i = 20; i >= 1; i--) {
  const pad = i.toString().padStart(4, "0");
  INITIAL_INFERENCES.push({
    id: `INF-${pad}`,
    assetName: i % 2 === 0 ? "UAV-SURVEILLANCE-01" : "AIRBORNE-RECON-V2",
    inputHash: `hash_input_${pad}_${(i * 1337).toString(16)}`,
    modelHash: "7e1b3a2c5d4e6f8a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a",
    configHash: "5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
    outputHash: `hash_output_${pad}_${(i * 7331).toString(16)}`,
    signature: "VALID",
    timestamp: `2026-09-27 ${Math.floor(8 + i / 2)}:${(i * 3) % 60 < 10 ? '0' : ''}${(i * 3) % 60}:12 IST`,
    nonce: `0x${(i * 0x12345).toString(16).toUpperCase()}`,
    sequence: 14198 - (20 - i),
    status: "VALIDATED",
    analyst: i % 3 === 0 ? "ANALYST-02" : "ANALYST-01"
  });
}

export const INITIAL_FINDINGS: FindingItem[] = [
  {
    id: "FND-0024",
    asset: "UAV-SURVEILLANCE-01",
    category: "Label Anomaly",
    severity: "MEDIUM",
    confidence: 91,
    status: "REVIEW",
    timestamp: "2026-09-27 14:10 IST",
    whyFlagged: "Multiple samples contain inconsistent annotations for the same visual pattern. The observed label distribution deviates from the declared class distribution by 14.8%. Contributor B's submitted sub-batch maps identical vehicle silhouettes to 'Light Transport' instead of ground-truth 'Armored Vehicle'.",
    supportingEvidence: {
      sampleIds: ["IMG_00452", "IMG_00459", "IMG_00461", "IMG_00488"],
      similarityScores: "Cosine Similarity > 0.96 across feature embeddings",
      labelDistribution: "Light Transport (42%), Armored Vehicle (58%)",
      sourceInfo: "Reconnaissance Drone Grid 4 (Contributor B Sub-Batch)",
      hashes: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      analysisTimestamp: "2026-09-27 14:05:22 IST"
    },
    disposition: "REVIEW"
  },
  {
    id: "FND-0023",
    asset: "THERMAL-CLASSIFIER-RESNET50.pt",
    category: "Behavioural Deviation",
    severity: "HIGH",
    confidence: 84,
    status: "REVIEW",
    timestamp: "2026-09-27 13:45 IST",
    whyFlagged: "Model exhibits 64.8% degradation in classification accuracy when a 16x16 pixel yellow corner patch is introduced into input thermal frames. High probability of backdoor/trigger pattern embedded during third-party training run.",
    supportingEvidence: {
      sampleIds: ["BT-011", "TRG-05"],
      similarityScores: "Neuron Activation Norm = 4.120 (Normal Range < 2.0)",
      labelDistribution: "Overrides input to 'Wildlife' class under trigger condition",
      sourceInfo: "Recon-Drone-Squad-04 Model Artifact",
      hashes: "9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d",
      analysisTimestamp: "2026-09-27 13:40:00 IST"
    },
    disposition: "REVIEW"
  },
  {
    id: "FND-0022",
    asset: "THERMAL-VEHICLE-DETECTION",
    category: "Near Duplicate",
    severity: "MEDIUM",
    confidence: 96,
    status: "QUARANTINE",
    timestamp: "2026-09-27 12:30 IST",
    whyFlagged: "8.0% of dataset samples are exact or near-identical duplicates with minor brightness shifts. Near-duplicate redundancy inflates training confidence artificially while starving model of operational variation.",
    supportingEvidence: {
      sampleIds: ["IMG_00891", "IMG_01204"],
      similarityScores: "SSIM = 0.998 across 488 sample pairs",
      sourceInfo: "FLIR Sensor Array Northern Sector",
      hashes: "8f7e6d5c4b3a2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f",
      analysisTimestamp: "2026-09-27 12:22:15 IST"
    },
    disposition: "QUARANTINE"
  },
  {
    id: "FND-0021",
    asset: "CONTOURED-ELEVATION-NET.ts",
    category: "Weight Tampering",
    severity: "CRITICAL",
    confidence: 99,
    status: "QUARANTINE",
    timestamp: "2026-09-27 11:15 IST",
    whyFlagged: "Quantization layer 4 parameters fail checksum and SHA-256 verification. Observed weight norms spike to 5.420, indicating post-compilation binary patch modification.",
    supportingEvidence: {
      sampleIds: ["MDL-008"],
      hashes: "0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a",
      analysisTimestamp: "2026-09-27 11:10:00 IST"
    },
    disposition: "QUARANTINE"
  },
  {
    id: "FND-0020",
    asset: "URBAN-SNIPER-PERIMETER-DS",
    category: "Out-of-Distribution",
    severity: "LOW",
    confidence: 88,
    status: "SECURE",
    timestamp: "2026-09-27 10:00 IST",
    whyFlagged: "5.0% of samples captured during severe sandstorm fog show elevated distance metrics from reference urban feature space. Verified as legitimate operational weather drift rather than adversarial attack.",
    supportingEvidence: {
      sampleIds: ["DS-011-OOD-01"],
      analysisTimestamp: "2026-09-27 09:55:00 IST"
    },
    disposition: "ACCEPT"
  }
];

// Generate additional 10 findings to reach at least 15
for (let i = 19; i >= 10; i--) {
  const pad = i.toString().padStart(4, "0");
  INITIAL_FINDINGS.push({
    id: `FND-${pad}`,
    asset: i % 2 === 0 ? "TACTICAL-LABELLED-SET-4" : "DEFENCE-PERIMETER-CAM-04",
    category: i % 3 === 0 ? "Near Duplicate" : i % 2 === 0 ? "Label Anomaly" : "Out-of-Distribution",
    severity: i % 4 === 0 ? "HIGH" : i % 2 === 0 ? "MEDIUM" : "LOW",
    confidence: 85 + (i % 14),
    status: i % 4 === 0 ? "REVIEW" : "SECURE",
    timestamp: `2026-09-26 ${10 + (i % 10)}:15 IST`,
    whyFlagged: `Automated integrity scan identified localized statistical anomaly in asset feature embeddings (Variance delta: ${(i * 1.4).toFixed(1)}%).`,
    supportingEvidence: {
      sampleIds: [`SAMPLE-${pad}-A`, `SAMPLE-${pad}-B`],
      similarityScores: `Similarity index: ${(0.88 + (i % 10) * 0.01).toFixed(3)}`,
      analysisTimestamp: `2026-09-26 ${10 + (i % 10)}:10 IST`
    },
    disposition: i % 4 === 0 ? "REVIEW" : "ACCEPT"
  });
}

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "AUD-0048",
    timestamp: "2026-09-27 14:32:10 IST",
    activity: "Inference Verification",
    asset: "INF-0024 (UAV-SURVEILLANCE-01)",
    status: "SUCCESS",
    analyst: "ANALYST-01",
    reference: "REF-INF-991",
    details: "Computed SHA-256 hash digests for input, model, configuration and output files. Cryptographic RSA-4096 signature verified against Ministry Public Key Registry."
  },
  {
    id: "AUD-0047",
    timestamp: "2026-09-27 14:15:05 IST",
    activity: "Dataset Scan Completed",
    asset: "UAV-SURVEILLANCE-01",
    status: "WARN",
    analyst: "ANALYST-01",
    reference: "REF-DS-001",
    details: "12,450 samples processed. Identified 398 duplicates (3.2%), 224 label anomalies (1.8%), and 323 OOD samples (2.6%). Disposition assigned to REVIEW."
  },
  {
    id: "AUD-0046",
    timestamp: "2026-09-27 13:45:22 IST",
    activity: "Model Backdoor Screening",
    asset: "THERMAL-CLASSIFIER-RESNET50.pt",
    status: "SECURITY_ALERT",
    analyst: "ANALYST-01",
    reference: "REF-MDL-002",
    details: "Detected elevated backdoor risk (91.5% confidence trigger pattern TRG-05). Flagged finding FND-0023."
  },
  {
    id: "AUD-0045",
    timestamp: "2026-09-27 12:30:00 IST",
    activity: "Sample Disposition Updated",
    asset: "IMG_00891 (UAV-SURVEILLANCE-01)",
    status: "SUCCESS",
    analyst: "ANALYST-01",
    reference: "REF-SMP-891",
    details: "Analyst updated sample status from REVIEW to QUARANTINE due to synthetic patch trigger."
  },
  {
    id: "AUD-0044",
    timestamp: "2026-09-27 11:15:40 IST",
    activity: "Model Fingerprint Verification",
    asset: "CONTOURED-ELEVATION-NET.ts",
    status: "SECURITY_ALERT",
    analyst: "ANALYST-02",
    reference: "REF-MDL-008",
    details: "Model parameter SHA-256 mismatch detected against reference manifest. Quarantined asset."
  }
];

// Generate remaining audit logs to reach at least 40
for (let i = 43; i >= 1; i--) {
  const pad = i.toString().padStart(4, "0");
  INITIAL_AUDIT_LOGS.push({
    id: `AUD-${pad}`,
    timestamp: `2026-09-${26 - Math.floor(i / 10)} ${18 - (i % 12)}:${(i * 7) % 60 < 10 ? '0' : ''}${(i * 7) % 60}:15 IST`,
    activity: i % 4 === 0 ? "Dataset Integrity Analysis" : i % 3 === 0 ? "Model Behaviour Test" : i % 2 === 0 ? "Inference Record Audit" : "Assurance Report Generated",
    asset: i % 2 === 0 ? "TERRAIN-CLASSIFICATION-03" : "VISION-DETECTOR-V2.onnx",
    status: i % 7 === 0 ? "SECURITY_ALERT" : i % 5 === 0 ? "WARN" : "SUCCESS",
    analyst: i % 2 === 0 ? "ANALYST-01" : "ANALYST-02",
    reference: `REF-ACT-${pad}`,
    details: `Standard security assurance activity logged in air-gapped ledger. Hash verification code: 0x${(i * 9999).toString(16)}.`
  });
}

export const INITIAL_CONTRIBUTORS: ContributorStat[] = [
  {
    id: "CTR-001",
    name: "Contributor A",
    unit: "Tactical-Unit-East",
    samplesSubmitted: 42500,
    flaggedSamples: 320,
    flagPercentage: 0.75,
    riskLevel: "LOW",
    confidenceScore: 94,
    status: "Accepted"
  },
  {
    id: "CTR-002",
    name: "Contributor B",
    unit: "DRDO-Partner-Group",
    samplesSubmitted: 38000,
    flaggedSamples: 1640,
    flagPercentage: 4.31,
    riskLevel: "MEDIUM",
    confidenceScore: 88,
    status: "Review"
  },
  {
    id: "CTR-003",
    name: "Contributor C",
    unit: "Recon-Drone-Squad-04",
    samplesSubmitted: 18500,
    flaggedSamples: 1295,
    flagPercentage: 7.00,
    riskLevel: "HIGH",
    confidenceScore: 81,
    status: "Review"
  },
  {
    id: "CTR-004",
    name: "Contributor D",
    unit: "Satellite-Feeds-North",
    samplesSubmitted: 29000,
    flaggedSamples: 348,
    flagPercentage: 1.20,
    riskLevel: "LOW",
    confidenceScore: 96,
    status: "Accepted"
  },
  {
    id: "CTR-005",
    name: "Contributor E",
    unit: "Naval-Surveillance-Cell",
    samplesSubmitted: 14200,
    flaggedSamples: 142,
    flagPercentage: 1.00,
    riskLevel: "LOW",
    confidenceScore: 97,
    status: "Accepted"
  }
];

export const DISTRIBUTION_SHIFT_DATA: DistributionShiftMetric[] = [
  {
    dimension: "Terrain",
    referenceVal: 85,
    observedVal: 82,
    shiftDelta: "-3.5%",
    risk: "LOW",
    interpretation: "Slight elevation in rocky terrain proportion. Within expected operational parameters."
  },
  {
    dimension: "Season",
    referenceVal: 90,
    observedVal: 64,
    shiftDelta: "-26.0%",
    risk: "MODERATE",
    interpretation: "Winter snow cover transition detected. Model feature maps require winter adaptation calibration."
  },
  {
    dimension: "Sensor",
    referenceVal: 95,
    observedVal: 94,
    shiftDelta: "-1.0%",
    risk: "LOW",
    interpretation: "FLIR thermal optical spectrum aligns with calibrated reference sensors."
  },
  {
    dimension: "Illumination",
    referenceVal: 80,
    observedVal: 48,
    shiftDelta: "-32.0%",
    risk: "HIGH",
    interpretation: "Night-time low lux operational drift. Recommend enforcing IR sensor thresholding."
  },
  {
    dimension: "Acquisition Conditions",
    referenceVal: 88,
    observedVal: 86,
    shiftDelta: "-2.0%",
    risk: "LOW",
    interpretation: "Flight altitude variance (1,500m vs 1,800m) maintains target scale invariance."
  }
];
