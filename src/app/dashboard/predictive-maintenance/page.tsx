"use client";

import { useState } from "react";
import { Cog, Clock, AlertTriangle, CheckCircle, TrendingDown, Wrench } from "lucide-react";
import { mockPredictions } from "@/lib/mock-data";

const PRIORITY_CONFIG = {
  low: { bg: "bg-[var(--info)]/10", text: "text-[var(--info)]", border: "border-[var(--info)]/20", dot: "bg-[var(--info)]" },
  medium: { bg: "bg-[var(--warning)]/10", text: "text-[var(--warning)]", border: "border-[var(--warning)]/20", dot: "bg-[var(--warning)]" },
  high: { bg: "bg-[var(--destructive)]/10", text: "text-[var(--destructive)]", border: "border-[var(--destructive)]/20", dot: "bg-[var(--destructive)]" },
  urgent: { bg: "bg-[var(--destructive)]/15", text: "text-[var(--destructive)]", border: "border-[var(--destructive)]/30", dot: "bg-[var(--destructive)]" },
};

export default function PredictiveMaintenancePage() {
  const [filter, setFilter] = useState("all");
  const predictions = filter === "all"
    ? mockPredictions
    : mockPredictions.filter((p) => p.priority === filter);

  const stats = {
    total: mockPredictions.length,
    urgent: mockPredictions.filter((p) => p.priority === "urgent").length,
    high: mockPredictions.filter((p) => p.priority === "high").length,
    avgConfidence: Math.round(mockPredictions.reduce((a, p) => a + p.confidence, 0) / mockPredictions.length * 10) / 10,
    avgRemainingLife: Math.round(mockPredictions.reduce((a, p) => a + p.remainingLife, 0) / mockPredictions.length),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Predictive Maintenance
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          ML-based failure prediction and maintenance scheduling for conveyor belts
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Predictions", value: stats.total, color: "var(--info)" },
          { label: "Urgent", value: stats.urgent, color: "var(--destructive)" },
          { label: "High Priority", value: stats.high, color: "var(--warning)" },
          { label: "Avg Confidence", value: `${stats.avgConfidence}%`, color: "var(--primary)" },
          { label: "Avg Remaining", value: `${stats.avgRemainingLife} days`, color: "var(--info)" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "urgent", "high", "medium", "low"].map((f) => (
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
            {f !== "all" && (
              <span className="ml-2 text-xs opacity-70">
                {mockPredictions.filter((p) => p.priority === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Prediction Cards */}
      <div className="space-y-4">
        {predictions.map((pred) => {
          const cfg = PRIORITY_CONFIG[pred.priority];
          const daysUrgent = pred.remainingLife <= 10;

          return (
            <div
              key={pred.id}
              className={`bg-[var(--card)] border rounded-xl p-6 card-hover ${cfg.border}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                      <Cog className={`w-5 h-5 ${cfg.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--foreground)]">
                          {pred.component}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${cfg.bg} ${cfg.text}`}>
                          {pred.priority}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Belt: {pred.beltId}
                      </p>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-[var(--background)] rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wrench className="w-3 h-3 text-[var(--primary)]" />
                      <span className="text-[10px] font-semibold text-[var(--primary)] uppercase tracking-wider">
                        Recommendation
                      </span>
                    </div>
                    <p className="text-xs text-[var(--foreground)] leading-relaxed">
                      {pred.recommendation}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5">
                      {daysUrgent ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--destructive)]" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                      )}
                      <span className="text-xs text-[var(--muted-foreground)]">Predicted failure:</span>
                      <span className={`text-xs font-semibold ${daysUrgent ? "text-[var(--destructive)]" : "text-[var(--foreground)]"}`}>
                        {pred.predictedFailureDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                      <span className="text-xs text-[var(--muted-foreground)]">Remaining life:</span>
                      <span className={`text-xs font-semibold ${daysUrgent ? "text-[var(--destructive)]" : "text-[var(--foreground)]"}`}>
                        {pred.remainingLife} days
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                      <span className="text-xs text-[var(--muted-foreground)]">Confidence:</span>
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {pred.confidence}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Days Remaining Ring */}
                <div className="flex-shrink-0 ml-4">
                  <div
                    className="w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center"
                    style={{
                      borderColor: daysUrgent ? "var(--destructive)" : "var(--warning)",
                      backgroundColor: daysUrgent ? "var(--destructive)" + "10" : "var(--warning)" + "10",
                    }}
                  >
                    <span
                      className="text-lg font-bold"
                      style={{ color: daysUrgent ? "var(--destructive)" : "var(--warning)" }}
                    >
                      {pred.remainingLife}
                    </span>
                    <span className="text-[8px] text-[var(--muted-foreground)] uppercase">days</span>
                  </div>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mt-4">
                <div className="h-1 bg-[var(--background)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pred.confidence}%`,
                      backgroundColor: pred.confidence > 80 ? "var(--success)" : "var(--warning)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
