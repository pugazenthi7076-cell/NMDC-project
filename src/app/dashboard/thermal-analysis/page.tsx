"use client";

import { useState, useMemo } from "react";
import {
  BarChart3, Thermometer, Activity, Zap, Volume2, Gauge, Radio, Camera,
  AlertTriangle, CheckCircle, Download, FileText, TrendingUp,
} from "lucide-react";
import { mockAnalysisData } from "@/lib/mock-data";
import type { AnalysisRecord } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from "recharts";

const CATEGORIES = [
  { key: "all", label: "All Sensors", icon: BarChart3 },
  { key: "vibration", label: "Vibration", icon: Activity, desc: "Bearing, pulley, gearbox problems" },
  { key: "temperature", label: "Temperature", icon: Thermometer, desc: "Overheating detection" },
  { key: "motor_current", label: "Motor Current", icon: Zap, desc: "Overload/mechanical resistance" },
  { key: "acoustic", label: "Acoustic", icon: Volume2, desc: "Unusual sounds" },
  { key: "load_tension", label: "Load/Tension", icon: Gauge, desc: "Abnormal belt stress" },
  { key: "electromagnetic", label: "Electromagnetic", icon: Radio, desc: "Steel-cord/internal damage" },
  { key: "camera_ai", label: "Camera/AI Vision", icon: Camera, desc: "Cracks, tears, misalignment" },
];

const STATUS_COLORS = {
  normal: { bg: "bg-[var(--success)]/10", text: "text-[var(--success)]", border: "border-[var(--success)]/20" },
  warning: { bg: "bg-[var(--warning)]/10", text: "text-[var(--warning)]", border: "border-[var(--warning)]/20" },
  critical: { bg: "bg-[var(--destructive)]/10", text: "text-[var(--destructive)]", border: "border-[var(--destructive)]/20" },
};

// Generate frequency spectrum data for vibration
function genVibrationSpectrum(records: AnalysisRecord[]) {
  const freqs = [];
  for (let f = 0; f <= 500; f += 10) {
    let amp = Math.random() * 2 + 0.5;
    // Add peaks at fault frequencies
    if (records.some((r) => r.status === "critical")) {
      if (f >= 90 && f <= 110) amp += 6 + Math.random() * 4; // BPFO
      if (f >= 180 && f <= 210) amp += 3 + Math.random() * 2; // harmonics
    }
    if (records.some((r) => r.status === "warning")) {
      if (f >= 50 && f <= 60) amp += 4 + Math.random() * 2;
    }
    freqs.push({ freq: f, amplitude: Math.round(amp * 100) / 100, threshold: 5 });
  }
  return freqs;
}

// Generate temperature heatmap data
function genThermalData(records: AnalysisRecord[]) {
  const zones = ["Drive", "Bearing", "Joint", "Splice", "Tail", "Loading"];
  return zones.map((zone, i) => {
    const r = records[i % records.length];
    const temp = r ? r.value : 40 + Math.random() * 20;
    return { zone, temperature: temp, threshold: r?.threshold || 55, maxTemp: 100 };
  });
}

// Generate waveform for motor current
function genCurrentWaveform(records: AnalysisRecord[]) {
  const points = [];
  const hasIssue = records.some((r) => r.status !== "normal");
  for (let t = 0; t < 360; t += 5) {
    const rad = (t * Math.PI) / 180;
    let value = Math.sin(rad) * 100;
    if (hasIssue) value += Math.sin(rad * 3) * 15 + Math.sin(rad * 7) * 8; // harmonics
    value += (Math.random() - 0.5) * 10; // noise
    points.push({ time: t, current: Math.round(value * 10) / 10, baseline: Math.round(Math.sin(rad) * 100 * 10) / 10 });
  }
  return points;
}

// Generate acoustic waveform
function genAcousticWaveform(records: AnalysisRecord[]) {
  const points = [];
  const hasIssue = records.some((r) => r.status !== "normal");
  for (let t = 0; t < 200; t += 2) {
    let value = Math.sin(t * 0.15) * 30 + Math.sin(t * 0.4) * 15 + (Math.random() - 0.5) * 20;
    if (hasIssue && t > 60 && t < 120) value += Math.sin(t * 0.8) * 40; // anomaly burst
    points.push({ time: t, db: Math.round(value * 10) / 10 + 60, threshold: 75 });
  }
  return points;
}

// Generate tension gauge data
function genTensionData(records: AnalysisRecord[]) {
  return records.map((r) => ({
    name: r.component,
    tension: r.value,
    threshold: r.threshold,
    normal: r.threshold * 0.8,
  }));
}

// Generate electromagnetic radar
function genEMRadar(records: AnalysisRecord[]) {
  return [
    { subject: "Cord Integrity", value: records.find((r) => r.status === "normal") ? 92 : 35 },
    { subject: "Signal Strength", value: 78 },
    { subject: "Penetration", value: 85 },
    { subject: "Resolution", value: 70 },
    { subject: "Coverage", value: records.length > 1 ? 88 : 60 },
    { subject: "Sensitivity", value: 75 },
  ];
}

// Camera/AI detection grid
function genDetectionGrid(records: AnalysisRecord[]) {
  return records.map((r) => ({
    ...r,
    x: 10 + Math.random() * 60,
    y: 10 + Math.random() * 50,
    w: 15 + Math.random() * 20,
    h: 12 + Math.random() * 18,
  }));
}

// Category-specific visualization component
function CategoryVisualization({ category, records }: { category: string; records: AnalysisRecord[] }) {
  if (category === "all") return null;

  if (category === "vibration") {
    const data = genVibrationSpectrum(records);
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--primary)]" />
          Vibration Frequency Spectrum (FFT Analysis)
        </h3>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4">Amplitude vs Frequency — peaks indicate fault signatures</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="freq" stroke="var(--muted-foreground)" fontSize={10} label={{ value: "Frequency (Hz)", position: "insideBottom", offset: -5, fontSize: 10 }} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} label={{ value: "Amplitude (mm/s)", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: 11 }} />
            <Bar dataKey="amplitude" name="Amplitude" radius={[1, 1, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.amplitude > 5 ? "#ef4444" : d.amplitude > 3 ? "#f59e0b" : "#22c55e"} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeDasharray="5 5" dot={false} name="Alarm Threshold" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-[var(--success)]" /><span className="text-[10px] text-[var(--muted-foreground)]">Normal</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-[var(--warning)]" /><span className="text-[10px] text-[var(--muted-foreground)]">Warning</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-[var(--destructive)]" /><span className="text-[10px] text-[var(--muted-foreground)]">Critical</span></div>
          <div className="flex items-center gap-1"><div className="w-6 h-0 border-t-2 border-dashed border-[var(--destructive)]" /><span className="text-[10px] text-[var(--muted-foreground)]">BPFO/BPFI fault freq</span></div>
        </div>
      </div>
    );
  }

  if (category === "temperature") {
    const data = genThermalData(records);
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-[var(--warning)]" />
          Thermal Zone Heatmap
        </h3>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4">Temperature distribution across belt zones</p>
        <div className="grid grid-cols-6 gap-3 mb-4">
          {data.map((d) => {
            const pct = (d.temperature / 100) * 100;
            const color = d.temperature > 65 ? "#ef4444" : d.temperature > 50 ? "#f59e0b" : d.temperature > 40 ? "#f59e0b" : "#22c55e";
            const intensity = Math.min(pct / 100, 1);
            return (
              <div key={d.zone} className="text-center">
                <div
                  className="w-full aspect-square rounded-lg flex items-center justify-center text-white font-bold text-sm mb-1"
                  style={{ backgroundColor: color, opacity: 0.3 + intensity * 0.7 }}
                >
                  {d.temperature}°C
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)]">{d.zone}</span>
              </div>
            );
          })}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="zone" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: 11 }} />
            <Bar dataKey="temperature" name="Temperature" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.temperature > 65 ? "#ef4444" : d.temperature > 50 ? "#f59e0b" : "#22c55e"} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeDasharray="5 5" dot={false} name="Threshold" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (category === "motor_current") {
    const data = genCurrentWaveform(records);
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--warning)]" />
          Motor Current Waveform
        </h3>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4">Current signal — harmonics indicate mechanical issues</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={10} label={{ value: "Time (°)", position: "insideBottom", offset: -5, fontSize: 10 }} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} label={{ value: "Current (A)", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: 11 }} />
            <Line type="monotone" dataKey="current" stroke="#f59e0b" strokeWidth={2} dot={false} name="Measured" />
            <Line type="monotone" dataKey="baseline" stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Baseline (Healthy)" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1"><div className="w-6 h-0 border-t-2 border-[var(--warning)]" /><span className="text-[10px] text-[var(--muted-foreground)]">Measured Current</span></div>
          <div className="flex items-center gap-1"><div className="w-6 h-0 border-t-2 border-dashed border-[var(--success)]" /><span className="text-[10px] text-[var(--muted-foreground)]">Healthy Baseline</span></div>
        </div>
      </div>
    );
  }

  if (category === "acoustic") {
    const data = genAcousticWaveform(records);
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[var(--info)]" />
          Acoustic Waveform Analysis
        </h3>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4">Sound level over time — bursts indicate abnormal sounds</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={10} label={{ value: "Time (ms)", position: "insideBottom", offset: -5, fontSize: 10 }} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} label={{ value: "dB", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: 11 }} />
            <defs>
              <linearGradient id="acousticGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="db" stroke="#3b82f6" strokeWidth={2} fill="url(#acousticGrad)" dot={false} name="Sound Level" />
            <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeDasharray="5 5" dot={false} name="Threshold" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (category === "load_tension") {
    const data = genTensionData(records);
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[var(--info)]" />
          Belt Tension Distribution
        </h3>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4">Tension across belt spans vs safe limits</p>
        {/* Gauge meters */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {data.map((d) => {
            const pct = Math.min((d.tension / (d.threshold * 1.3)) * 100, 100);
            const color = d.tension > d.threshold ? "#ef4444" : d.tension > d.threshold * 0.85 ? "#f59e0b" : "#22c55e";
            return (
              <div key={d.name} className="text-center">
                <div className="relative w-24 h-12 mx-auto mb-1 overflow-hidden">
                  <div className="absolute inset-0 rounded-t-full border-4 border-[var(--border)]" style={{ borderColor: `${color}30` }} />
                  <div className="absolute bottom-0 left-0 right-0 mx-auto rounded-t-full transition-all" style={{ width: `${pct}%`, height: `${pct * 0.4}px`, backgroundColor: color, opacity: 0.7 }} />
                  <div className="absolute bottom-0 left-0 right-0 text-center">
                    <span className="text-lg font-bold" style={{ color }}>{d.tension}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{d.threshold > 0 && d.tension > d.threshold ? " kN ⚠" : " kN"}</span>
                  </div>
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)]">{d.name}</span>
              </div>
            );
          })}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} unit=" kN" />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={100} />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: 11 }} />
            <Bar dataKey="tension" name="Tension" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.tension > d.threshold ? "#ef4444" : d.tension > d.threshold * 0.85 ? "#f59e0b" : "#22c55e"} />
              ))}
            </Bar>
            <Bar dataKey="threshold" name="Safe Limit" fill="#6b7280" radius={[0, 4, 4, 0]} opacity={0.3} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (category === "electromagnetic") {
    const data = genEMRadar(records);
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
          <Radio className="w-4 h-4 text-[var(--info)]" />
          Electromagnetic Signal Analysis
        </h3>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4">Steel-cord integrity & signal quality radar</p>
        <div className="grid grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={data}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" stroke="var(--muted-foreground)" fontSize={10} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={9} />
              <Radar name="Current" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {data.map((d) => (
              <div key={d.subject}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--muted-foreground)]">{d.subject}</span>
                  <span className="font-bold" style={{ color: d.value > 80 ? "var(--success)" : d.value > 50 ? "var(--warning)" : "var(--destructive)" }}>{d.value}%</span>
                </div>
                <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.value}%`, backgroundColor: d.value > 80 ? "var(--success)" : d.value > 50 ? "var(--warning)" : "var(--destructive)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (category === "camera_ai") {
    const detections = genDetectionGrid(records);
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
          <Camera className="w-4 h-4 text-[var(--primary)]" />
          AI Vision Detection Grid — YOLO-STOD
        </h3>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4">Real-time computer vision damage detection overlay</p>
        <div className="relative bg-[var(--background)] rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {/* Simulated belt surface pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 20px, var(--muted-foreground) 20px, var(--muted-foreground) 21px)", backgroundSize: "100% 21px" }} />
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 40px, var(--muted-foreground) 40px, var(--muted-foreground) 41px)", backgroundSize: "41px 100%" }} />

          {/* Detection boxes */}
          {detections.map((det) => {
            const color = det.severity === "critical" ? "#ef4444" : det.severity === "high" ? "#f97316" : det.severity === "medium" ? "#f59e0b" : "#3b82f6";
            return (
              <div
                key={det.id}
                className="absolute border-2 rounded-sm"
                style={{
                  left: `${det.x}%`,
                  top: `${det.y}%`,
                  width: `${det.w}%`,
                  height: `${det.h}%`,
                  borderColor: color,
                  backgroundColor: color + "15",
                }}
              >
                <div className="absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-bold text-white rounded-sm whitespace-nowrap" style={{ backgroundColor: color }}>
                  {det.component} {det.value}%
                </div>
              </div>
            );
          })}

          {/* Scan line */}
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent animate-pulse" style={{ top: "50%", opacity: 0.6 }} />

          {/* Overlay labels */}
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-[9px] text-white font-mono">
            YOLO-STOD v2.1 | {detections.length} objects
          </div>
          <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--destructive)]/80 rounded text-[9px] text-white font-bold animate-pulse">
            ● LIVE
          </div>
          <div className="absolute bottom-2 left-2 text-[9px] text-white/60 font-mono">
            {new Date().toLocaleTimeString()} | Frame: {Math.floor(Math.random() * 9000 + 1000)}
          </div>
        </div>

        {/* Detection list */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {detections.map((det) => (
            <div key={det.id} className="flex items-center gap-2 px-2 py-1.5 bg-[var(--background)] rounded text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: det.severity === "critical" ? "#ef4444" : det.severity === "high" ? "#f97316" : "#f59e0b" }} />
              <span className="font-medium text-[var(--foreground)]">{det.component}</span>
              <span className="text-[var(--muted-foreground)]">{det.beltId}</span>
              <span className="ml-auto font-bold" style={{ color: det.severity === "critical" ? "var(--destructive)" : "var(--warning)" }}>{det.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function AnalysisPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => mockAnalysisData.filter((r) => {
    if (activeCategory !== "all" && r.category !== activeCategory) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  }), [activeCategory, statusFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    normal: filtered.filter((r) => r.status === "normal").length,
    warning: filtered.filter((r) => r.status === "warning").length,
    critical: filtered.filter((r) => r.status === "critical").length,
  }), [filtered]);

  const categoryStats = useMemo(() => CATEGORIES.filter((c) => c.key !== "all").map((cat) => ({
    name: cat.label,
    total: mockAnalysisData.filter((r) => r.category === cat.key).length,
    critical: mockAnalysisData.filter((r) => r.category === cat.key && r.status === "critical").length,
    warning: mockAnalysisData.filter((r) => r.category === cat.key && r.status === "warning").length,
  })), []);

  const exportPDF = () => {
    const now = new Date().toLocaleString();
    const catLabel = activeCategory === "all" ? "All Sensors" : CATEGORIES.find((c) => c.key === activeCategory)?.label;
    const rows = filtered.map((r) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px">${r.id}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:600">${r.beltId}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-transform:capitalize">${r.category.replace(/_/g, " ")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px">${r.component}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:600">${r.value} ${r.unit}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px">${r.threshold} ${r.unit}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px">
          <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase;
            ${r.status === "critical" ? "background:#fef2f2;color:#dc2626" : r.status === "warning" ? "background:#fffbeb;color:#d97706" : "background:#f0fdf4;color:#16a34a"}">
            ${r.status}
          </span>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px">${r.severity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px">${r.details}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px">${r.recommendation}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;white-space:nowrap">${new Date(r.timestamp).toLocaleString()}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html><html><head><title>Industrial Belt Analysis Report</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;color:#1f2937}h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;color:#6b7280;margin-top:0}.meta{font-size:11px;color:#9ca3af;margin-bottom:16px}.stats{display:flex;gap:16px;margin-bottom:16px}.stat-box{border:1px solid #e5e7eb;border-radius:8px;padding:10px 16px;text-align:center}.stat-box .value{font-size:20px;font-weight:700}.stat-box .label{font-size:10px;color:#6b7280;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f9fafb;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}.footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:10px}</style></head><body>
    <h1>Industrial Belt Analysis Report</h1><h2>${catLabel} — SIH26008</h2>
    <p class="meta">Generated: ${now} | Records: ${filtered.length}</p>
    <div class="stats">
      <div class="stat-box"><div class="value">${stats.total}</div><div class="label">Total</div></div>
      <div class="stat-box"><div class="value" style="color:#16a34a">${stats.normal}</div><div class="label">Normal</div></div>
      <div class="stat-box"><div class="value" style="color:#d97706">${stats.warning}</div><div class="label">Warning</div></div>
      <div class="stat-box"><div class="value" style="color:#dc2626">${stats.critical}</div><div class="label">Critical</div></div>
    </div>
    <table><thead><tr><th>ID</th><th>Belt</th><th>Category</th><th>Component</th><th>Value</th><th>Threshold</th><th>Status</th><th>Severity</th><th>Details</th><th>Recommendation</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">Industrial Belt Monitoring — Smart India Hackathon 2026 | Spidy Hackers | SIH26008 | Confidential</div></body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const activeCat = CATEGORIES.find((c) => c.key === activeCategory);
  const showSpecificViz = activeCategory !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Analysis</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Multi-sensor comprehensive analysis for conveyor belt health monitoring
          </p>
        </div>
        <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = cat.key === "all" ? mockAnalysisData.length : mockAnalysisData.filter((r) => r.category === cat.key).length;
          return (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeCategory === cat.key ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              title={cat.desc || ""}
            >
              <Icon className="w-3.5 h-3.5" />{cat.label}<span className="ml-1 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[{ l: "Total", v: stats.total, c: "var(--info)" }, { l: "Normal", v: stats.normal, c: "var(--success)" }, { l: "Warning", v: stats.warning, c: "var(--warning)" }, { l: "Critical", v: stats.critical, c: "var(--destructive)" }].map((s) => (
          <div key={s.l} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">{s.l}</p>
            <p className="text-2xl font-bold" style={{ color: s.c }}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Category-Specific Visualization */}
      {showSpecificViz && activeCat && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <activeCat.icon className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">{activeCat.label} Analysis</h2>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">{activeCat.desc}</p>
        </div>
      )}

      <CategoryVisualization category={activeCategory} records={filtered} />

      {/* Overview Chart (only for "all") */}
      {!showSpecificViz && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Sensor Category Overview
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} angle={-30} textAnchor="end" height={60} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }} />
              <Bar dataKey="warning" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Warning" />
              <Bar dataKey="critical" fill="#ef4444" radius={[2, 2, 0, 0]} name="Critical" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {["all", "normal", "warning", "critical"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}{s !== "all" && <span className="ml-2 text-xs opacity-70">{mockAnalysisData.filter((r) => r.status === s).length}</span>}
          </button>
        ))}
      </div>

      {/* Records Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--primary)]" /> Analysis Records ({filtered.length})
          </h3>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all">
            <Download className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--background)]">
                {["ID", "Belt", "Category", "Component", "Value", "Status", "Severity", "Details", "Recommendation", "Time"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const cfg = STATUS_COLORS[r.status];
                return (
                  <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]/50 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-mono text-[var(--muted-foreground)]">{r.id}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-[var(--foreground)]">{r.beltId}</td>
                    <td className="px-3 py-2.5"><span className="text-[10px] font-medium capitalize text-[var(--muted-foreground)]">{r.category.replace(/_/g, " ")}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[var(--foreground)]">{r.component}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-[var(--foreground)]">{r.value} {r.unit}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cfg.bg} ${cfg.text}`}>
                        {r.status === "critical" ? <AlertTriangle className="w-3 h-3" /> : r.status === "normal" ? <CheckCircle className="w-3 h-3" /> : null}{r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${r.severity === "critical" || r.severity === "high" ? "bg-[var(--destructive)]/15 text-[var(--destructive)]" : r.severity === "medium" ? "bg-[var(--warning)]/10 text-[var(--warning)]" : "bg-[var(--info)]/10 text-[var(--info)]"}`}>{r.severity}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-[var(--muted-foreground)] max-w-[200px] truncate" title={r.details}>{r.details}</td>
                    <td className="px-3 py-2.5 text-[10px] text-[var(--muted-foreground)] max-w-[200px] truncate" title={r.recommendation}>{r.recommendation}</td>
                    <td className="px-3 py-2.5 text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <BarChart3 className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[var(--muted-foreground)]">No records match the selected filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
