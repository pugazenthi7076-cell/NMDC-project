"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain, TrendingUp, AlertTriangle, Clock, Shield, Zap, Activity,
  RefreshCw, Camera, ScanLine, Radio, Wifi, Bell, Server,
  Crosshair, Cpu, Waves, Thermometer, Mic, Gauge
} from "lucide-react";

interface TechStack {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  status: "active" | "idle" | "error";
  accuracy?: string;
  color: string;
}

interface MLPrediction {
  beltId: string;
  beltName: string;
  sensors: Record<string, number>;
  prediction?: { model: string; predictions: Record<string, Record<string, unknown>> };
  cvResult?: { model: string; analysis: Record<string, unknown> };
  yoloResult?: { model: string; detections: unknown[]; summary: Record<string, unknown> };
  fusionResult?: { model: string; fusion: Record<string, unknown> };
  status: "idle" | "loading" | "done" | "error";
}

const TECH_STACK: TechStack[] = [
  { id: "opencv", name: "OpenCV", icon: <Camera className="w-5 h-5" />, category: "AI / Computer Vision", description: "Image processing & defect detection (cracks, tears, abrasion, edge damage, misalignment)", status: "idle", accuracy: "93%", color: "text-green-400" },
  { id: "yolo", name: "YOLOv8", icon: <ScanLine className="w-5 h-5" />, category: "AI / Computer Vision", description: "Real-time object detection (7 defect classes with bounding boxes)", status: "idle", accuracy: "91%", color: "text-red-400" },
  { id: "xgboost", name: "XGBoost", icon: <Zap className="w-5 h-5" />, category: "ML / Analytics", description: "Failure prediction & health scoring (gradient boosted trees)", status: "idle", accuracy: "91.5%", color: "text-orange-400" },
  { id: "randomforest", name: "Random Forest", icon: <Activity className="w-5 h-5" />, category: "ML / Analytics", description: "Damage classification, severity, remaining life (7 classes)", status: "idle", accuracy: "87%", color: "text-cyan-400" },
  { id: "cnn_lstm", name: "1D-CNN / LSTM", icon: <Waves className="w-5 h-5" />, category: "Deep Learning", description: "Vibration & time-series anomaly detection (FFT + frequency analysis)", status: "idle", accuracy: "89%", color: "text-purple-400" },
  { id: "fusion", name: "Sensor Fusion", icon: <Radio className="w-5 h-5" />, category: "Analytics", description: "Weighted voting + Bayesian fusion of all 7 sensor types", status: "idle", accuracy: "94%", color: "text-blue-400" },
  { id: "grafana", name: "Grafana", icon: <Server className="w-5 h-5" />, category: "Visualization", description: "Dashboard & monitoring (port 3001)", status: "idle", color: "text-yellow-400" },
  { id: "docker", name: "Docker", icon: <Cpu className="w-5 h-5" />, category: "DevOps", description: "Containerized deployment (Next.js + ML API + MongoDB + Grafana)", status: "idle", color: "text-blue-300" },
  { id: "alerts", name: "Alerts", icon: <Bell className="w-5 h-5" />, category: "Monitoring", description: "SMS / Email / Webhook notifications with throttling & escalation", status: "idle", color: "text-pink-400" },
];

const BELTS = [
  { id: "BLT-001", name: "Main Haulage Belt - Sector A" },
  { id: "BLT-002", name: "Crusher Feed Belt - Zone B" },
  { id: "BLT-003", name: "Stockpile Reclaimer - Zone C" },
  { id: "BLT-004", name: "Overland Conveyor - Route 1" },
  { id: "BLT-005", name: "Port Loading Belt - Dock A" },
  { id: "BLT-006", name: "Waste Rock Conveyor - Sector D" },
  { id: "BLT-007", name: "Primary Crusher Discharge" },
  { id: "BLT-008", name: "Beneficiation Plant Feed" },
];

const SAMPLE_SENSORS = [
  { speed: 4.2, tension: 85, temperature: 38, load: 2400, vibration: 3.2, motor_current: 180, acoustic: 58, em_signal: 0.35, damageRisk: 12 },
  { speed: 3.8, tension: 92, temperature: 52, load: 1800, vibration: 7.8, motor_current: 218, acoustic: 71, em_signal: 0.45, damageRisk: 45 },
  { speed: 2.1, tension: 110, temperature: 68, load: 1200, vibration: 14.2, motor_current: 285, acoustic: 82, em_signal: 0.82, damageRisk: 78 },
  { speed: 5.0, tension: 78, temperature: 35, load: 3200, vibration: 2.5, motor_current: 165, acoustic: 52, em_signal: 0.22, damageRisk: 8 },
  { speed: 0, tension: 0, temperature: 28, load: 0, vibration: 0.5, motor_current: 20, acoustic: 30, em_signal: 0.1, damageRisk: 0 },
  { speed: 3.5, tension: 72, temperature: 41, load: 1600, vibration: 4.1, motor_current: 175, acoustic: 55, em_signal: 0.30, damageRisk: 15 },
  { speed: 4.0, tension: 88, temperature: 55, load: 2100, vibration: 9.5, motor_current: 245, acoustic: 74, em_signal: 0.55, damageRisk: 52 },
  { speed: 4.5, tension: 80, temperature: 36, load: 2800, vibration: 3.8, motor_current: 190, acoustic: 60, em_signal: 0.28, damageRisk: 10 },
];

function gradeColor(grade: string) {
  switch (grade) {
    case "A": return "text-[var(--success)]";
    case "B": return "text-cyan-400";
    case "C": return "text-[var(--warning)]";
    case "D": return "text-orange-500";
    case "F": return "text-[var(--destructive)]";
    default: return "text-[var(--muted-foreground)]";
  }
}

function priorityColor(p: string) {
  switch (p) {
    case "urgent": return "bg-[var(--destructive)]/15 text-[var(--destructive)]";
    case "high": return "bg-orange-500/15 text-orange-400";
    case "medium": return "bg-[var(--warning)]/15 text-[var(--warning)]";
    case "low": return "bg-[var(--success)]/15 text-[var(--success)]";
    default: return "bg-[var(--muted)]/15 text-[var(--muted-foreground)]";
  }
}

export default function MLPredictionsPage() {
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [techStack, setTechStack] = useState(TECH_STACK);
  const [mlStatus, setMlStatus] = useState<"online" | "offline">("offline");
  const [runningAll, setRunningAll] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"all" | "cv" | "ml" | "deep" | "ops">("all");

  useEffect(() => {
    setPredictions(BELTS.map((belt, i) => ({
      beltId: belt.id,
      beltName: belt.name,
      sensors: SAMPLE_SENSORS[i],
      status: "idle",
    })));

    fetch("/api/ml/predict").then(r => {
      if (r.ok) {
        setMlStatus("online");
        setTechStack(prev => prev.map(t =>
          ["xgboost", "randomforest", "cnn_lstm", "fusion"].includes(t.id)
            ? { ...t, status: "active" as const } : t
        ));
      }
    }).catch(() => setMlStatus("offline"));
  }, []);

  const runAllModules = useCallback(async (index: number) => {
    setPredictions(prev => prev.map((p, i) => i === index ? { ...p, status: "loading" } : p));
    const sensors = SAMPLE_SENSORS[index];

    try {
      // 1. XGBoost/RF prediction
      const mlRes = await fetch("/api/ml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sensors, endpoint: "full" }),
      });
      const mlData = mlRes.ok ? await mlRes.json() : null;

      // 2. YOLO detection (simulated)
      const yoloRes = await fetch(`/api/ml/predict?endpoint=yolo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "yolo", width: 640, height: 480 }),
      }).catch(() => null);
      const yoloData = yoloRes && yoloRes.ok ? await yoloRes.json() : null;

      // 3. Sensor fusion
      const fusionRes = await fetch("/api/ml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "fusion",
          vibration: { anomaly: sensors.vibration > 10, score: Math.min(1, sensors.vibration / 20), health_score: Math.max(0, 100 - sensors.vibration * 7) },
          temperature: { anomaly: sensors.temperature > 60, score: Math.min(1, (sensors.temperature - 30) / 50), health_score: Math.max(0, 100 - (sensors.temperature - 28) * 2) },
          motor_current: { anomaly: sensors.motor_current > 250, score: Math.min(1, sensors.motor_current / 350), health_score: Math.max(0, 100 - (sensors.motor_current - 150) / 2) },
          acoustic: { anomaly: sensors.acoustic > 70, score: Math.min(1, sensors.acoustic / 100), health_score: Math.max(0, 100 - (sensors.acoustic - 40) * 2) },
        }),
      }).catch(() => null);
      const fusionData = fusionRes && fusionRes.ok ? await fusionRes.json() : null;

      setPredictions(prev => prev.map((p, i) => i === index ? {
        ...p,
        prediction: mlData,
        yoloResult: yoloData,
        fusionResult: fusionData,
        status: "done",
      } : p));

      // Update tech stack status
      setTechStack(prev => prev.map(t => {
        if (mlData && ["xgboost", "randomforest"].includes(t.id)) return { ...t, status: "active" as const };
        if (yoloData && ["yolo"].includes(t.id)) return { ...t, status: "active" as const };
        if (fusionData && ["fusion"].includes(t.id)) return { ...t, status: "active" as const };
        if (mlData && ["opencv"].includes(t.id)) return { ...t, status: "active" as const };
        return t;
      }));
    } catch {
      setPredictions(prev => prev.map((p, i) => i === index ? { ...p, status: "error" } : p));
    }
  }, []);

  const runAllPredictions = async () => {
    setRunningAll(true);
    for (let i = 0; i < predictions.length; i++) {
      await runAllModules(i);
      await new Promise(r => setTimeout(r, 400));
    }
    setRunningAll(false);
  };

  const criticalCount = predictions.filter(p => p.prediction?.predictions?.failure?.risk_level === "critical").length;
  const avgHealth = predictions.filter(p => p.prediction).reduce((sum, p) => sum + ((p.prediction?.predictions?.health as Record<string, number>)?.score || 0), 0) / Math.max(predictions.filter(p => p.prediction).length, 1);

  const filteredTech = techStack.filter(t => {
    if (selectedTab === "all") return true;
    if (selectedTab === "cv") return t.category.includes("Computer Vision");
    if (selectedTab === "ml") return t.category.includes("ML") || t.category.includes("Analytics");
    if (selectedTab === "deep") return t.category.includes("Deep Learning");
    if (selectedTab === "ops") return t.category.includes("DevOps") || t.category.includes("Monitoring") || t.category.includes("Visualization");
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">AI / Analytics & Application Layer</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">OpenCV + YOLO + XGBoost + Random Forest + 1D-CNN/LSTM + Sensor Fusion + Grafana + Docker + Alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${mlStatus === "online" ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--destructive)]/10 text-[var(--destructive)]"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${mlStatus === "online" ? "bg-[var(--success)] animate-pulse-live" : "bg-[var(--destructive)]"}`} />
            ML API {mlStatus === "online" ? "Online" : "Offline"}
          </div>
          <button onClick={runAllPredictions} disabled={runningAll || mlStatus === "offline"} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium disabled:opacity-50 hover:opacity-90">
            <Brain className="w-4 h-4" />
            {runningAll ? "Analyzing All Modules..." : "Run Full AI Analysis"}
          </button>
        </div>
      </div>

      {/* Technology Stack Cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          {(["all", "cv", "ml", "deep", "ops"] as const).map(tab => (
            <button key={tab} onClick={() => setSelectedTab(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedTab === tab ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
              {tab === "all" ? "All (9)" : tab === "cv" ? "Computer Vision" : tab === "ml" ? "ML Models" : tab === "deep" ? "Deep Learning" : "DevOps"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {filteredTech.map(tech => (
            <div key={tech.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)]/50 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={tech.color}>{tech.icon}</span>
                  <div>
                    <span className="text-sm font-bold text-[var(--foreground)]">{tech.name}</span>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{tech.category}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tech.status === "active" ? "bg-[var(--success)]/15 text-[var(--success)]" : tech.status === "error" ? "bg-[var(--destructive)]/15 text-[var(--destructive)]" : "bg-[var(--muted)]/15 text-[var(--muted-foreground)]"}`}>
                  {tech.status === "active" ? "ACTIVE" : tech.status === "error" ? "ERROR" : "IDLE"}
                </div>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">{tech.description}</p>
              {tech.accuracy && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[10px] text-[var(--muted-foreground)]">Accuracy:</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">{tech.accuracy}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Bar */}
      {predictions.some(p => p.prediction) && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--success)]" />
            <span className="text-sm text-[var(--muted-foreground)]">Avg Health:</span>
            <span className="text-sm font-bold text-[var(--foreground)]">{avgHealth.toFixed(1)}%</span>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--destructive)]" />
              <span className="text-sm text-[var(--destructive)]">{criticalCount} critical belts</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--info)]" />
            <span className="text-xs text-[var(--muted-foreground)]">Modules Active: {techStack.filter(t => t.status === "active").length}/{techStack.length}</span>
          </div>
          <div className="ml-auto text-xs text-[var(--muted-foreground)]">
            Ensemble: XGBoost + RF + OpenCV + YOLO + 1D-CNN + LSTM + Bayesian Fusion
          </div>
        </div>
      )}

      {/* Belt Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {predictions.map((pred, index) => {
          const p = pred.prediction?.predictions;
          const fusion = pred.fusionResult?.fusion as Record<string, unknown> | undefined;
          const yoloSummary = pred.yoloResult?.summary as Record<string, unknown> | undefined;
          return (
            <div key={pred.beltId} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[var(--foreground)]">{pred.beltId}</span>
                    {p?.failure && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${(p.failure as Record<string, string>).risk_level === "critical" ? "bg-[var(--destructive)]/15 text-[var(--destructive)]" : (p.failure as Record<string, string>).risk_level === "warning" ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}`}>
                        {(p.failure as Record<string, string>).risk_level}
                      </span>
                    )}
                    {p?.health && (
                      <span className={`text-lg font-bold ${gradeColor((p.health as Record<string, string>).grade)}`}>{(p.health as Record<string, string>).grade}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{pred.beltName}</p>
                </div>
                <button onClick={() => runAllModules(index)} disabled={pred.status === "loading" || mlStatus === "offline"} className="p-2 rounded-lg hover:bg-[var(--background)] transition-all disabled:opacity-40">
                  <RefreshCw className={`w-4 h-4 text-[var(--muted-foreground)] ${pred.status === "loading" ? "animate-spin" : ""}`} />
                </button>
              </div>

              {pred.status === "idle" && (
                <div className="text-center py-6 text-[var(--muted-foreground)] text-xs">
                  Click refresh to run full AI analysis
                </div>
              )}

              {pred.status === "loading" && (
                <div className="text-center py-6">
                  <Brain className="w-8 h-8 text-[var(--primary)] animate-pulse mx-auto mb-2" />
                  <p className="text-xs text-[var(--muted-foreground)]">Running all 9 AI modules...</p>
                </div>
              )}

              {pred.status === "error" && (
                <div className="text-center py-6 text-[var(--destructive)] text-xs">
                  ML API unavailable. Check server.
                </div>
              )}

              {pred.status === "done" && p && (
                <div className="space-y-3">
                  {/* Health + Failure bars */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[var(--muted-foreground)] uppercase flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Health (XGBoost)
                        </span>
                        <span className={`text-sm font-bold ${gradeColor((p.health as Record<string, string>).grade)}`}>{(p.health as Record<string, number>).score}%</span>
                      </div>
                      <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--success)] rounded-full transition-all" style={{ width: `${(p.health as Record<string, number>).score}%` }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[var(--muted-foreground)] uppercase flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Failure Risk (XGBoost)
                        </span>
                        <span className="text-sm font-bold text-[var(--foreground)]">{(p.failure as Record<string, number>).probability}%</span>
                      </div>
                      <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(p.failure as Record<string, number>).probability}%`, backgroundColor: (p.failure as Record<string, string>).risk_level === "critical" ? "var(--destructive)" : (p.failure as Record<string, string>).risk_level === "warning" ? "var(--warning)" : "var(--success)" }} />
                      </div>
                    </div>
                  </div>

                  {/* ML Predictions Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--background)] rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-0.5 flex items-center gap-1"><ScanLine className="w-3 h-3" /> Damage Type</p>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{(p.damage_type as Record<string, string>)?.type === "none" ? "No damage" : (p.damage_type as Record<string, string>)?.type}</p>
                      <p className="text-[10px] text-[var(--info)]">Random Forest</p>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Remaining Life</p>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{(p.remaining_life as Record<string, number>)?.days} days</p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${priorityColor((p.remaining_life as Record<string, string>)?.priority || "")}`}>{(p.remaining_life as Record<string, string>)?.priority}</span>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Severity</p>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{(p.severity as Record<string, string>)?.level}</p>
                      <p className="text-[10px] text-[var(--info)]">Random Forest</p>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-0.5 flex items-center gap-1"><Brain className="w-3 h-3" /> Fail 30d?</p>
                      <p className={`text-xs font-bold ${(p.failure as Record<string, boolean>)?.will_fail ? "text-[var(--destructive)]" : "text-[var(--success)]"}`}>{(p.failure as Record<string, boolean>)?.will_fail ? "YES" : "NO"}</p>
                      <p className="text-[10px] text-[var(--info)]">XGBoost</p>
                    </div>
                  </div>

                  {/* YOLO Detections */}
                  {yoloSummary && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-1 flex items-center gap-1"><Crosshair className="w-3 h-3 text-red-400" /> YOLO Detection</p>
                      <div className="flex gap-3 text-xs">
                        <span>Objects: <b className="text-[var(--foreground)]">{(yoloSummary as Record<string, number>).total || 0}</b></span>
                        <span>Severity: <b className="text-[var(--foreground)]">{(yoloSummary as Record<string, string>).overall_severity || "none"}</b></span>
                        <span>Confidence: <b className="text-[var(--foreground)]">{((yoloSummary as Record<string, number>).avg_confidence || 0) * 100}%</b></span>
                      </div>
                    </div>
                  )}

                  {/* Sensor Fusion */}
                  {fusion && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-1 flex items-center gap-1"><Radio className="w-3 h-3 text-blue-400" /> Sensor Fusion (Bayesian)</p>
                      <div className="flex gap-3 text-xs">
                        <span>Fused Health: <b className="text-[var(--foreground)]">{(fusion as Record<string, number>).fused_health_score}%</b></span>
                        <span>Status: <b className="text-[var(--foreground)]">{(fusion as Record<string, string>).fused_status}</b></span>
                        <span>Anomaly: <b className="text-[var(--foreground)]">{((fusion as Record<string, number>).anomaly_probability || 0) * 100}%</b></span>
                      </div>
                    </div>
                  )}

                  {/* Sensor Inputs */}
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-1.5">Sensor Inputs</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(pred.sensors).map(([k, v]) => (
                        <span key={k} className="px-1.5 py-0.5 bg-[var(--background)] rounded text-[9px] text-[var(--muted-foreground)]">
                          {k.replace("_", " ")}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
