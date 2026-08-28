"use client";

import { useState, useEffect } from "react";
import { Brain, TrendingUp, AlertTriangle, Clock, Shield, Zap, Activity, RefreshCw } from "lucide-react";

interface MLPrediction {
  beltId: string;
  beltName: string;
  sensors: {
    speed: number;
    tension: number;
    temperature: number;
    load: number;
    vibration: number;
    motor_current: number;
    acoustic: number;
    em_signal: number;
    damageRisk: number;
  };
  prediction?: {
    model: string;
    predictions: {
      failure?: { probability: number; will_fail: boolean; risk_level: string };
      health?: { score: number; grade: string; damage: number };
      remaining_life?: { days: number; priority: string };
      damage_type?: { type: string; is_damaged: boolean };
      severity?: { level: string };
    };
  };
  status: "idle" | "loading" | "done" | "error";
}

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

function riskColor(r: string) {
  switch (r) {
    case "critical": return "text-[var(--destructive)]";
    case "warning": return "text-[var(--warning)]";
    default: return "text-[var(--success)]";
  }
}

export default function MLPredictionsPage() {
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [mlStatus, setMlStatus] = useState<"online" | "offline">("offline");
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    // Initialize predictions with sensor data
    setPredictions(BELTS.map((belt, i) => ({
      beltId: belt.id,
      beltName: belt.name,
      sensors: SAMPLE_SENSORS[i],
      status: "idle",
    })));

    // Check ML API status
    fetch("/api/ml/predict").then(r => {
      if (r.ok) setMlStatus("online");
    }).catch(() => setMlStatus("offline"));
  }, []);

  const runPrediction = async (index: number) => {
    setPredictions(prev => prev.map((p, i) => i === index ? { ...p, status: "loading" } : p));

    try {
      const res = await fetch("/api/ml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...predictions[index].sensors, endpoint: "full" }),
      });

      if (!res.ok) throw new Error("ML API error");
      const data = await res.json();

      setPredictions(prev => prev.map((p, i) => i === index ? { ...p, prediction: data, status: "done" } : p));
    } catch {
      setPredictions(prev => prev.map((p, i) => i === index ? { ...p, status: "error" } : p));
    }
  };

  const runAllPredictions = async () => {
    setRunningAll(true);
    for (let i = 0; i < predictions.length; i++) {
      await runPrediction(i);
      await new Promise(r => setTimeout(r, 300));
    }
    setRunningAll(false);
  };

  const criticalCount = predictions.filter(p => p.prediction?.predictions?.failure?.risk_level === "critical").length;
  const avgHealth = predictions.filter(p => p.prediction).reduce((sum, p) => sum + (p.prediction?.predictions?.health?.score || 0), 0) / Math.max(predictions.filter(p => p.prediction).length, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">ML Predictions</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">XGBoost + Random Forest powered belt analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${mlStatus === "online" ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--destructive)]/10 text-[var(--destructive)]"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${mlStatus === "online" ? "bg-[var(--success)] animate-pulse-live" : "bg-[var(--destructive)]"}`} />
            ML API {mlStatus === "online" ? "Online" : "Offline"}
          </div>
          <button onClick={runAllPredictions} disabled={runningAll || mlStatus === "offline"} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium disabled:opacity-50 hover:opacity-90">
            <Brain className="w-4 h-4" />
            {runningAll ? "Analyzing..." : "Run All Predictions"}
          </button>
        </div>
      </div>

      {/* ML Model Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-[var(--foreground)]">XGBoost Failure</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">91.5%</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Prediction accuracy</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-[var(--foreground)]">RF Damage Type</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">7 classes</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Tear, Abrasion, Splice...</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[var(--success)]" />
            <span className="text-xs font-semibold text-[var(--foreground)]">Health Scorer</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">MAE 7.68%</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">XGBoost regression</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[var(--info)]" />
            <span className="text-xs font-semibold text-[var(--foreground)]">Remaining Life</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">MAE 2.4d</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Random Forest regression</p>
        </div>
      </div>

      {/* Summary */}
      {predictions.some(p => p.prediction) && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-6">
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
          <div className="ml-auto text-xs text-[var(--muted-foreground)]">
            Ensemble: XGBoost + Random Forest
          </div>
        </div>
      )}

      {/* Belt Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {predictions.map((pred, index) => {
          const p = pred.prediction?.predictions;
          return (
            <div key={pred.beltId} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[var(--foreground)]">{pred.beltId}</span>
                    {p?.failure && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.failure.risk_level === "critical" ? "bg-[var(--destructive)]/15 text-[var(--destructive)]" : p.failure.risk_level === "warning" ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}`}>
                        {p.failure.risk_level}
                      </span>
                    )}
                    {p?.health && (
                      <span className={`text-lg font-bold ${gradeColor(p.health.grade)}`}>{p.health.grade}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{pred.beltName}</p>
                </div>
                <button onClick={() => runPrediction(index)} disabled={pred.status === "loading" || mlStatus === "offline"} className="p-2 rounded-lg hover:bg-[var(--background)] transition-all disabled:opacity-40">
                  <RefreshCw className={`w-4 h-4 text-[var(--muted-foreground)] ${pred.status === "loading" ? "animate-spin" : ""}`} />
                </button>
              </div>

              {pred.status === "idle" && (
                <div className="text-center py-6 text-[var(--muted-foreground)] text-xs">
                  Click refresh to run ML prediction
                </div>
              )}

              {pred.status === "loading" && (
                <div className="text-center py-6">
                  <Brain className="w-8 h-8 text-[var(--primary)] animate-pulse mx-auto mb-2" />
                  <p className="text-xs text-[var(--muted-foreground)]">Analyzing sensor data...</p>
                </div>
              )}

              {pred.status === "error" && (
                <div className="text-center py-6 text-[var(--destructive)] text-xs">
                  ML API unavailable. Check server.
                </div>
              )}

              {pred.status === "done" && p && (
                <div className="space-y-3">
                  {/* Health + Damage bars */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Health</span>
                        <span className={`text-sm font-bold ${gradeColor(p.health?.grade || "")}`}>{p.health?.score}%</span>
                      </div>
                      <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--success)] rounded-full transition-all" style={{ width: `${p.health?.score}%` }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Failure Risk</span>
                        <span className={`text-sm font-bold ${riskColor(p.failure?.risk_level || "")}`}>{p.failure?.probability}%</span>
                      </div>
                      <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${p.failure?.probability}%`, backgroundColor: p.failure?.risk_level === "critical" ? "var(--destructive)" : p.failure?.risk_level === "warning" ? "var(--warning)" : "var(--success)" }} />
                      </div>
                    </div>
                  </div>

                  {/* Prediction grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--background)] rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-0.5">Damage Type</p>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{p.damage_type?.type === "none" ? "No damage" : p.damage_type?.type}</p>
                      <p className="text-[10px] text-[var(--info)]">RF Classifier</p>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-0.5">Remaining Life</p>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{p.remaining_life?.days} days</p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${priorityColor(p.remaining_life?.priority || "")}`}>{p.remaining_life?.priority}</span>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-0.5">Severity</p>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{p.severity?.level}</p>
                      <p className="text-[10px] text-[var(--info)]">RF Classifier</p>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-0.5">Will Fail 30d</p>
                      <p className={`text-xs font-semibold ${p.failure?.will_fail ? "text-[var(--destructive)]" : "text-[var(--success)]"}`}>{p.failure?.will_fail ? "YES" : "NO"}</p>
                      <p className="text-[10px] text-[var(--info)]">XGBoost</p>
                    </div>
                  </div>

                  {/* Sensor inputs */}
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-1.5">Sensor Inputs</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(pred.sensors).map(([k, v]) => (
                        <span key={k} className="px-1.5 py-0.5 bg-[var(--background)] rounded text-[9px] text-[var(--muted-foreground)]">
                          {k.replace("_", " ")}: {v}
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
