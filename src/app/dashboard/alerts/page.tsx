"use client";

import { useState } from "react";
import { Bell, AlertTriangle, Info, CheckCircle, Clock, Shield, X } from "lucide-react";
import { mockAlerts } from "@/lib/mock-data";

const SEVERITY_CONFIG = {
  critical: { bg: "bg-[var(--destructive)]/10", text: "text-[var(--destructive)]", border: "border-[var(--destructive)]/20", icon: <AlertTriangle className="w-4 h-4" /> },
  warning: { bg: "bg-[var(--warning)]/10", text: "text-[var(--warning)]", border: "border-[var(--warning)]/20", icon: <Shield className="w-4 h-4" /> },
  info: { bg: "bg-[var(--info)]/10", text: "text-[var(--info)]", border: "border-[var(--info)]/20", icon: <Info className="w-4 h-4" /> },
};

const TYPE_LABELS = {
  damage: "Damage Alert",
  maintenance: "Maintenance",
  thermal: "Thermal Alert",
  system: "System",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [filter, setFilter] = useState("all");

  const filteredAlerts = filter === "all"
    ? alerts
    : filter === "unread"
    ? alerts.filter((a) => !a.acknowledged)
    : alerts.filter((a) => a.severity === filter);

  const stats = {
    total: alerts.length,
    unread: alerts.filter((a) => !a.acknowledged).length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
  };

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Alerts & Notifications</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Real-time alerts from damage detection, thermal monitoring, and predictive maintenance
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="w-2 h-2 rounded-full bg-[var(--destructive)] animate-pulse-live" />
          <span className="text-xs text-[var(--foreground)] font-medium">
            {stats.unread} unread
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Alerts", value: stats.total, color: "var(--info)" },
          { label: "Unread", value: stats.unread, color: "var(--warning)" },
          { label: "Critical", value: stats.critical, color: "var(--destructive)" },
          { label: "Warnings", value: stats.warning, color: "var(--warning)" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "unread", "critical", "warning", "info"].map((f) => (
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

      {/* Alert List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const cfg = SEVERITY_CONFIG[alert.severity];

          return (
            <div
              key={alert.id}
              className={`bg-[var(--card)] border rounded-xl p-5 card-hover transition-all ${
                alert.acknowledged ? "opacity-60" : ""
              } ${cfg.border}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${cfg.bg} ${cfg.text}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-medium">
                        {TYPE_LABELS[alert.type]}
                      </span>
                      {alert.acknowledged && (
                        <span className="text-[10px] text-[var(--success)] font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3 text-[var(--muted-foreground)]" />
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium rounded-lg hover:bg-[var(--primary)]/20 transition-all"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--muted-foreground)]">No alerts to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
