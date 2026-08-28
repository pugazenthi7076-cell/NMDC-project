"use client";

import { useState } from "react";
import { ScanLine, AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react";
import { mockDetections } from "@/lib/mock-data";
import LiveCamera from "@/components/live-camera";

const SEVERITY_CONFIG = {
  low: { bg: "bg-[var(--info)]/10", text: "text-[var(--info)]", border: "border-[var(--info)]/20" },
  medium: { bg: "bg-[var(--warning)]/10", text: "text-[var(--warning)]", border: "border-[var(--warning)]/20" },
  high: { bg: "bg-[var(--destructive)]/10", text: "text-[var(--destructive)]", border: "border-[var(--destructive)]/20" },
  critical: { bg: "bg-[var(--destructive)]/15", text: "text-[var(--destructive)]", border: "border-[var(--destructive)]/30" },
};

const STATUS_ICON = {
  detected: <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />,
  acknowledged: <Eye className="w-4 h-4 text-[var(--info)]" />,
  repaired: <CheckCircle className="w-4 h-4 text-[var(--success)]" />,
};

const TYPE_LABELS = {
  tear: "Belt Tear",
  abrasion: "Abrasion",
  splice_failure: "Splice Failure",
  edge_damage: "Edge Damage",
  joint_rupture: "Joint Rupture",
};

export default function DamageDetectionPage() {
  const [filter, setFilter] = useState("all");
  const detections = filter === "all" ? mockDetections : mockDetections.filter((d) => d.status === filter);

  const stats = {
    total: mockDetections.length,
    detected: mockDetections.filter((d) => d.status === "detected").length,
    acknowledged: mockDetections.filter((d) => d.status === "acknowledged").length,
    repaired: mockDetections.filter((d) => d.status === "repaired").length,
    avgConfidence: Math.round(mockDetections.reduce((a, d) => a + d.confidence, 0) / mockDetections.length * 10) / 10,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Damage Detection</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Computer Vision-based conveyor belt damage analysis using YOLO-STOD
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Detections", value: stats.total, color: "var(--info)" },
          { label: "Detected", value: stats.detected, color: "var(--warning)" },
          { label: "Acknowledged", value: stats.acknowledged, color: "var(--info)" },
          { label: "Repaired", value: stats.repaired, color: "var(--success)" },
          { label: "Avg Confidence", value: `${stats.avgConfidence}%`, color: "var(--primary)" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "detected", "acknowledged", "repaired"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Live Camera Section */}
      <LiveCamera />

      {/* Detection Cards */}
      <div className="space-y-4">
        {detections.map((det) => {
          const sev = SEVERITY_CONFIG[det.severity];
          return (
            <div
              key={det.id}
              className={`bg-[var(--card)] border rounded-xl p-6 card-hover ${sev.border}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* CV Image Placeholder */}
                  <div className="w-24 h-24 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                    <div className="text-center">
                      <ScanLine className="w-8 h-8 text-[var(--muted-foreground)] mx-auto" />
                      <p className="text-[9px] text-[var(--muted-foreground)] mt-1">CV Image</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-[var(--foreground)]">
                        {TYPE_LABELS[det.type]}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${sev.bg} ${sev.text}`}>
                        {det.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      Belt: {det.beltId} | {det.location}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        {STATUS_ICON[det.status]}
                        <span className="text-xs text-[var(--foreground)] capitalize">{det.status}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--muted-foreground)]">Confidence:</span>
                        <span className="text-xs font-semibold text-[var(--foreground)]">{det.confidence}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--muted-foreground)]" />
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {new Date(det.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="text-right flex-shrink-0">
                  <div className="w-16">
                    <div className="text-right">
                      <span className="text-lg font-bold" style={{
                        color: det.confidence > 90 ? "var(--destructive)" : det.confidence > 75 ? "var(--warning)" : "var(--info)"
                      }}>
                        {det.confidence}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${det.confidence}%`,
                          backgroundColor: det.confidence > 90 ? "var(--destructive)" : det.confidence > 75 ? "var(--warning)" : "var(--info)",
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-[var(--muted-foreground)] mt-1">Confidence</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
