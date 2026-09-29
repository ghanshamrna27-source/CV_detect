import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, ShieldCheck, Clock, FileKey } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "", size = "md" }) => {
  const normalized = status.toUpperCase();

  let bgColor = "bg-slate-700 text-white border-slate-600 shadow-xs";
  let Icon = CheckCircle2;

  if (["SECURE", "LOW", "VALIDATED", "PASS", "ACCEPTED", "CLEAN", "NORMAL"].includes(normalized)) {
    bgColor = "bg-emerald-600 text-white border-emerald-700 shadow-xs";
    Icon = ShieldCheck;
  } else if (["REVIEW", "MEDIUM", "WARN", "MODERATE", "ELEVATED", "SUSPICIOUS"].includes(normalized)) {
    bgColor = "bg-blue-600 text-white border-blue-700 shadow-xs";
    Icon = AlertTriangle;
  } else if (["QUARANTINE", "HIGH", "CRITICAL", "TAMPERED", "FAIL", "SECURITY_ALERT", "UNAUTHORIZED_MODEL", "INVALID"].includes(normalized)) {
    bgColor = "bg-rose-600 text-white border-rose-700 shadow-xs";
    Icon = ShieldAlert;
  } else if (["AMBER", "PENDING"].includes(normalized)) {
    bgColor = "bg-amber-600 text-white border-amber-700 shadow-xs";
    Icon = Clock;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1 font-bold",
    md: "px-2.5 py-1 text-xs gap-1.5 font-bold tracking-wide",
    lg: "px-3 py-1.5 text-xs gap-2 font-extrabold tracking-wider"
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border ${bgColor} ${sizeClasses} uppercase font-mono shadow-xs ${className}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : size === "md" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {status}
    </span>
  );
};
