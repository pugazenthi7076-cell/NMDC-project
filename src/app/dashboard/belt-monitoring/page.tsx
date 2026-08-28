"use client";

import { Activity, Gauge, Thermometer, Truck, Clock, TrendingUp } from "lucide-react";
import { mockBelts } from "@/lib/mock-data";
import { useState, useEffect, useCallback } from "react";

interface Belt {
  id: string;
  name: string;
  status: "operational" | "warning" | "critical" | "offline";
  speed: number;
  tension: number;
  temperature: number;
  load: number;
  uptime: number;
  lastInspection: string;
  damageRisk: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  operational: { bg: "bg-[var(--success)]/10", text: "text-[var(--success)]", dot: "bg-[var(--success)]" },
  warning: { bg: "bg-[var(--warning)]/10", text: "text-[var(--warning)]", dot: "bg-[var(--warning)]" },
  critical: { bg: "bg-[var(--destructive)]/10", text: "text-[var(--destructive)]", dot: "bg-[var(--destructive)]" },
  offline: { bg: "bg-[var(--muted)]/50", text: "text-[var(--muted-foreground)]", dot: "bg-[var(--muted-foreground)]" },
};

function colorFor(level: string) {
  return level === "critical" ? "var(--destructive)" : level === "warning" ? "var(--warning)" : "var(--success)";
}

function checkLevel(value: number, warn: number, crit: number): string {
  if (value >= crit) return "critical";
  if (value >= warn) return "warning";
  return "normal";
}

export default function BeltMonitoringPage() {
  const [filter, setFilter] = useState("all");
  const [belts, setBelts] = useState<Belt[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    setBelts(mockBelts.map((b) => ({ ...b })));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBelts((prev) =>
        prev.map((belt) => {
          const f = (Math.random() - 0.5) * 0.2;
          return {
            ...belt,
            temperature: Math.round(Math.max(20, Math.min(80, belt.temperature + belt.temperature * f)) * 10) / 10,
            tension: Math.round(Math.max(50, Math.min(150, belt.tension + belt.tension * f * 0.1)) * 10) / 10,
            speed: Math.round(Math.max(0, Math.min(8, belt.speed + f * 0.3)) * 10) / 10,
            load: Math.round(Math.max(500, Math.min(5000, belt.load + belt.load * f * 0.15))),
            damageRisk: Math.round(Math.max(0, Math.min(100, belt.damageRisk + (Math.random() - 0.5) * 5)) * 10) / 10,
          };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const detectProblems = useCallback(() => {
    const newAlerts: string[] = [];
    belts.forEach((belt) => {
      if (belt.temperature >= 55) newAlerts.push(`${belt.id}: Temperature CRITICAL at ${belt.temperature}°C`);
      else if (belt.temperature >= 45) newAlerts.push(`${belt.id}: Temperature WARNING at ${belt.temperature}°C`);
      if (belt.tension >= 100) newAlerts.push(`${belt.id}: Tension CRITICAL at ${belt.tension} kN`);
      if (belt.damageRisk >= 60) newAlerts.push(`${belt.id}: Damage risk CRITICAL at ${belt.damageRisk}%`);
    });
    setAlerts(newAlerts);
  }, [belts]);

  useEffect(() => { detectProblems(); }, [detectProblems]);

  const filtered = filter === "all" ? belts : belts.filter((b) => b.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Belt Monitoring</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Real-time sensor data with automatic problem detection</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse-live" />
          <span className="text-xs text-[var(--muted-foreground)]">Live • Updates every 3s</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-[var(--destructive)] uppercase tracking-wider mb-2">Active Alerts ({alerts.length})</p>
          <div className="space-y-1">
            {alerts.slice(0, 5).map((a, i) => (
              <p key={i} className="text-xs text-[var(--destructive)]">{a}</p>
            ))}
            {alerts.length > 5 && <p className="text-xs text-[var(--muted-foreground)]">+{alerts.length - 5} more</p>}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["all", "operational", "warning", "critical", "offline"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && <span className="ml-2 text-xs opacity-70">{belts.filter((b) => b.status === f).length}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((belt) => {
          const style = STATUS_STYLES[belt.status] || STATUS_STYLES.offline;
          const tempLevel = checkLevel(belt.temperature, 45, 55);
          const tensionLevel = checkLevel(belt.tension, 80, 100);
          const riskLevel = checkLevel(belt.damageRisk, 30, 60);

          return (
            <div key={belt.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[var(--foreground)]">{belt.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>{belt.status}</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{belt.name}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${style.dot} ${belt.status === "operational" ? "animate-pulse-live" : ""}`} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MetricItem icon={<Activity className="w-3.5 h-3.5" />} label="Speed" value={`${belt.speed} m/s`} color="var(--info)" />
                <MetricItem icon={<Gauge className="w-3.5 h-3.5" />} label="Tension" value={`${belt.tension} kN`} color={colorFor(tensionLevel)} />
                <MetricItem icon={<Thermometer className="w-3.5 h-3.5" />} label="Temp" value={`${belt.temperature}°C`} color={colorFor(tempLevel)} />
                <MetricItem icon={<Truck className="w-3.5 h-3.5" />} label="Load" value={`${belt.load.toLocaleString()} t/h`} color="var(--info)" />
                <MetricItem icon={<Clock className="w-3.5 h-3.5" />} label="Uptime" value={`${belt.uptime}%`} color={belt.uptime > 95 ? "var(--success)" : "var(--warning)"} />
                <MetricItem icon={<TrendingUp className="w-3.5 h-3.5" />} label="Risk" value={`${belt.damageRisk}%`} color={colorFor(riskLevel)} />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Health Score</span>
                  <span className="text-xs font-medium text-[var(--foreground)]">{100 - belt.damageRisk}%</span>
                </div>
                <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${100 - belt.damageRisk}%`, backgroundColor: colorFor(riskLevel) }} />
                </div>
              </div>

              <p className="text-[10px] text-[var(--muted-foreground)] mt-3">Last inspection: {belt.lastInspection}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-[var(--background)] rounded-lg p-2.5">
      <div className="flex items-center gap-1 mb-1" style={{ color }}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
