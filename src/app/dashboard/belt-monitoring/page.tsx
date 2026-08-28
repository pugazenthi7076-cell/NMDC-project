"use client";

import { Activity, Gauge, Thermometer, Truck, Clock, TrendingUp, Shield, AlertTriangle, Heart } from "lucide-react";
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

interface HealthData {
  overallHealth: number;
  damagePercent: number;
  structuralIntegrity: number;
  surfaceCondition: number;
  spliceHealth: number;
  edgeCondition: number;
  grade: "A" | "B" | "C" | "D" | "F";
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

function calculateHealth(belt: Belt): HealthData {
  // Overall health = 100 - damageRisk
  const overallHealth = Math.round(100 - belt.damageRisk);

  // Damage percentage
  const damagePercent = belt.damageRisk;

  // Structural integrity based on tension and load
  const tensionHealth = belt.tension > 100 ? 60 : belt.tension > 80 ? 80 : 95;
  const loadHealth = belt.load > 2500 ? 70 : belt.load > 1500 ? 85 : 95;
  const structuralIntegrity = Math.round((tensionHealth + loadHealth) / 2);

  // Surface condition based on temperature
  const surfaceCondition = belt.temperature > 60 ? 50 : belt.temperature > 45 ? 70 : 95;

  // Splice health based on uptime and risk
  const spliceHealth = Math.round(belt.uptime * 0.8 + (100 - belt.damageRisk) * 0.2);

  // Edge condition based on speed and tension
  const edgeCondition = belt.speed < 2 ? 60 : belt.tension > 100 ? 65 : 90;

  // Grade
  let grade: "A" | "B" | "C" | "D" | "F" = "A";
  if (overallHealth < 50) grade = "F";
  else if (overallHealth < 65) grade = "D";
  else if (overallHealth < 75) grade = "C";
  else if (overallHealth < 85) grade = "B";

  return { overallHealth, damagePercent, structuralIntegrity, surfaceCondition, spliceHealth, edgeCondition, grade };
}

function gradeColor(grade: string) {
  switch (grade) {
    case "A": return "var(--success)";
    case "B": return "#22d3ee";
    case "C": return "var(--warning)";
    case "D": return "#f97316";
    case "F": return "var(--destructive)";
    default: return "var(--muted-foreground)";
  }
}

function HealthRing({ value, size = 80, strokeWidth = 6, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--background)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-[var(--foreground)]">{value}%</span>
      </div>
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-medium" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function BeltMonitoringPage() {
  const [filter, setFilter] = useState("all");
  const [belts, setBelts] = useState<Belt[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [expandedHealth, setExpandedHealth] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBelts() {
      try {
        const res = await fetch("/api/data/belts");
        if (res.ok) {
          const data = await res.json();
          setBelts(data.map((b: Record<string, unknown>) => ({
            id: b.id as string,
            name: b.name as string,
            status: b.status as string,
            speed: b.speed as number,
            tension: b.tension as number,
            temperature: b.temperature as number,
            load: b.load as number,
            uptime: b.uptime as number,
            lastInspection: b.lastInspection as string,
            damageRisk: b.damageRisk as number,
          })));
        }
      } catch {
        setBelts([]);
      }
    }
    fetchBelts();
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

  // Overall stats
  const avgHealth = belts.length > 0 ? Math.round(belts.reduce((sum, b) => sum + (100 - b.damageRisk), 0) / belts.length) : 0;
  const avgDamage = belts.length > 0 ? Math.round(belts.reduce((sum, b) => sum + b.damageRisk, 0) / belts.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Belt Monitoring</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Real-time health tracking with damage analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse-live" />
          <span className="text-xs text-[var(--muted-foreground)]">Live • Updates every 3s</span>
        </div>
      </div>

      {/* Overall Fleet Health Summary */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-[var(--destructive)]" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Fleet Health Overview</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <HealthRing value={avgHealth} size={70} color={gradeColor(avgHealth >= 80 ? "A" : avgHealth >= 65 ? "B" : "C")} />
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1 uppercase tracking-wider">Avg Health</p>
          </div>
          <div className="text-center">
            <HealthRing value={avgDamage} size={70} color={avgDamage > 50 ? "var(--destructive)" : avgDamage > 30 ? "var(--warning)" : "var(--success)"} />
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1 uppercase tracking-wider">Avg Damage</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[var(--success)]">{belts.filter((b) => b.status === "operational").length}</span>
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Healthy</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[var(--destructive)]">{belts.filter((b) => b.status === "critical").length}</span>
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Critical</p>
          </div>
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
          const health = calculateHealth(belt);
          const isExpanded = expandedHealth === belt.id;

          return (
            <div key={belt.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[var(--foreground)]">{belt.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>{belt.status}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${gradeColor(health.grade)}20`, color: gradeColor(health.grade) }}>
                      Grade {health.grade}
                    </span>
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

              {/* Belt Health Section */}
              <div className="mt-4 bg-[var(--background)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--info)]" />
                    <span className="text-xs font-semibold text-[var(--foreground)]">Belt Health</span>
                  </div>
                  <button
                    onClick={() => setExpandedHealth(isExpanded ? null : belt.id)}
                    className="text-[10px] text-[var(--info)] hover:underline"
                  >
                    {isExpanded ? "Less" : "Details"}
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <HealthRing value={health.overallHealth} size={72} color={gradeColor(health.grade)} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Health</span>
                      <span className="text-sm font-bold" style={{ color: gradeColor(health.grade) }}>{health.overallHealth}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Damage</span>
                      <span className="text-sm font-bold text-[var(--destructive)]">{health.damagePercent}%</span>
                    </div>
                    <div className="h-2 bg-[var(--card)] rounded-full overflow-hidden flex">
                      <div className="h-full transition-all duration-700" style={{ width: `${health.overallHealth}%`, backgroundColor: gradeColor(health.grade) }} />
                      <div className="h-full transition-all duration-700" style={{ width: `${health.damagePercent}%`, backgroundColor: "var(--destructive)" }} />
                    </div>
                  </div>
                </div>

                {/* Expanded Health Details */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2.5">
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Component Health Breakdown</p>
                    <MiniBar label="Structural Integrity" value={health.structuralIntegrity} color={health.structuralIntegrity > 80 ? "var(--success)" : health.structuralIntegrity > 60 ? "var(--warning)" : "var(--destructive)"} />
                    <MiniBar label="Surface Condition" value={health.surfaceCondition} color={health.surfaceCondition > 80 ? "var(--success)" : health.surfaceCondition > 60 ? "var(--warning)" : "var(--destructive)"} />
                    <MiniBar label="Splice Health" value={health.spliceHealth} color={health.spliceHealth > 80 ? "var(--success)" : health.spliceHealth > 60 ? "var(--warning)" : "var(--destructive)"} />
                    <MiniBar label="Edge Condition" value={health.edgeCondition} color={health.edgeCondition > 80 ? "var(--success)" : health.edgeCondition > 60 ? "var(--warning)" : "var(--destructive)"} />
                    {health.overallHealth < 65 && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-[var(--destructive)]/10">
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--destructive)]" />
                        <p className="text-[10px] text-[var(--destructive)]">Immediate maintenance required — belt integrity compromised</p>
                      </div>
                    )}
                  </div>
                )}
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
