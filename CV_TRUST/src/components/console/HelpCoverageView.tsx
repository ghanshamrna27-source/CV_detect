import React from "react";
import { HelpCircle, CheckCircle2, AlertTriangle, ShieldCheck, FileCode, Layers, Info } from "lucide-react";

export const HelpCoverageView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Coverage & Limitations Disclosure</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5">
          Technical overview of VERIVISION platform capabilities, supported data & model formats, inspection boundaries, and evaluation limitations.
        </p>
      </div>

      {/* SECTION 1: SUPPORTED FORMATS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>1.0 SUPPORTED DATASET & MODEL FORMATS</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold uppercase">Supported Dataset Formats</span>
            <ul className="space-y-1.5 text-slate-800 dark:text-slate-200 font-sans text-xs">
              <li>• <strong>COCO JSON:</strong> Object detection & segmentation annotations.</li>
              <li>• <strong>YOLO Format:</strong> Normalized bounding box TXT labels.</li>
              <li>• <strong>PASCAL VOC XML:</strong> Standard bounding box XML annotations.</li>
              <li>• <strong>Compressed Archives:</strong> ZIP / TAR containing images & labels.</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-purple-700 dark:text-purple-400 font-bold uppercase">Supported Model Formats</span>
            <ul className="space-y-1.5 text-slate-800 dark:text-slate-200 font-sans text-xs">
              <li>• <strong>ONNX (.onnx):</strong> Open Neural Network Exchange graphs.</li>
              <li>• <strong>PyTorch (.pt, .pth):</strong> PyTorch state dicts & saved models.</li>
              <li>• <strong>TorchScript (.ts):</strong> Compiled PyTorch C++ binaries.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION 2: INTEGRITY CHECKS & BOUNDARIES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>2.0 WHITE-BOX vs BLACK-BOX ASSESSMENT SCOPE</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-blue-700 dark:text-blue-400 font-bold uppercase">White-Box Inspection Engine</span>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
              When full model binary files are provided, VERIVISION parses graph layers directly, inspecting weight norm distributions, activation sparsity, and layer-wise checksums to detect post-training tampering.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-amber-700 dark:text-amber-400 font-bold uppercase">Black-Box Behavioural Grid</span>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
              When weights are encrypted or inaccessible, VERIVISION evaluates output stability using FGSM (eps=0.03) and PGD (20-step) noise perturbations to verify decision boundary robustness.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: HONEST LIMITATIONS & UNSUPPORTED ATTACKS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>3.0 KNOWN LIMITATIONS & UNSUPPORTED SCENARIOS</span>
        </h3>

        <div className="space-y-3 font-mono text-xs text-slate-800 dark:text-slate-200">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-amber-700 dark:text-amber-400 font-bold">Unsupported Scenario: Hardware-Level Exploits</span>
            <p className="text-slate-700 dark:text-slate-300 font-sans text-xs">
              VERIVISION assesses software, data, and model layer integrity. It does not inspect physical GPU hardware fault injections or Rowhammer memory perturbations.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-amber-700 dark:text-amber-400 font-bold">Unsupported Scenario: Zero-Day Trigger Geometries</span>
            <p className="text-slate-700 dark:text-slate-300 font-sans text-xs">
              Trigger detection relies on spatial activation clustering and high-frequency patch searching. Extremely subtle semantic triggers (e.g. specific rare cloud formations) require human analyst review.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-amber-700 dark:text-amber-400 font-bold">Root Public Key Trust Assumption</span>
            <p className="text-slate-700 dark:text-slate-300 font-sans text-xs">
              Inference provenance validation relies on valid public keys registered in the air-gapped ledger. Key compromise outside VERIVISION invalidates cryptographic claims.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
