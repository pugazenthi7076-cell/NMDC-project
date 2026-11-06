"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  Settings,
  Lock,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Download,
  FileSpreadsheet,
  FileJson,
  Users,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  exportSensorRecordsCSV,
  exportAnalysisRecordsCSV,
  exportSeniorStaffRecordsCSV,
  exportThermalSensorRecordsCSV,
  exportFullTelemetryJSON,
} from "@/lib/export-records";

export default function SettingsPage() {
  const { userId, userName, userRole, department } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newId, setNewId] = useState(userId || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newId.trim() || userId, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: "Password updated successfully! Your new password is now active.",
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to update credentials",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Connection error updating credentials",
      });
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleExport = (fn: () => string, label: string) => {
    const filename = fn();
    setExportMessage(`Successfully exported ${label} as ${filename}`);
    setTimeout(() => setExportMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl font-extrabold text-[#151d48] tracking-tight">Settings & Export</h1>
        <p className="text-xs font-semibold text-[#737791] mt-1">
          Account credentials, sensor telemetry export, and system configuration
        </p>
      </div>

      {/* Export feedback toast */}
      {exportMessage && (
        <div className="p-4 bg-[#dcfce7] border border-[#22c55e]/30 rounded-2xl flex items-center gap-3 text-xs font-bold text-[#15803d] animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-5 h-5 text-[#22c55e] flex-shrink-0" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* ========================================================
          DATA EXPORT & SENSOR / SENIOR STAFF RECORDS CARD
         ======================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#f1f5f9] card-shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#5d5fef]/10 flex items-center justify-center text-[#5d5fef]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#151d48]">Data Export & System Records</h2>
              <p className="text-xs text-[#737791] font-semibold">
                Download official sensor telemetry and senior staff personnel records (CSV / JSON)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Export Sensors CSV */}
          <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col justify-between gap-3 hover:border-slate-200 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#dcfce7] text-[#22c55e] flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-[#151d48]">Conveyor Sensors Telemetry</h3>
                <p className="text-[11px] text-[#737791] mt-0.5">
                  Real-time speed, tension, load, uptime, and damage risk scores for all 8 belt spans.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleExport(exportSensorRecordsCSV, "Conveyor Sensor Records")}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5d5fef] hover:bg-[#4951ec] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Sensors (CSV)</span>
            </button>
          </div>

          {/* Export Multi-Sensor Diagnostics */}
          <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col justify-between gap-3 hover:border-slate-200 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ffe2e5] text-[#fa5a7d] flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-[#151d48]">Multi-Sensor Diagnostic Logs</h3>
                <p className="text-[11px] text-[#737791] mt-0.5">
                  Vibration, thermal hotspots, motor current, acoustic signatures, and YOLO CV data.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleExport(exportAnalysisRecordsCSV, "Multi-Sensor Diagnostic Records")}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5d5fef] hover:bg-[#4951ec] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Diagnostics (CSV)</span>
            </button>
          </div>

          {/* Export Senior Staff Records */}
          <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col justify-between gap-3 hover:border-slate-200 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f3e8ff] text-[#bf83ff] flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-[#151d48]">Senior Staff & Personnel Records</h3>
                <p className="text-[11px] text-[#737791] mt-0.5">
                  Section heads, administrators, chief engineers, and operator authorization accounts.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleExport(exportSeniorStaffRecordsCSV, "Senior Staff Records")}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5d5fef] hover:bg-[#4951ec] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Senior Staff (CSV)</span>
            </button>
          </div>

          {/* Export Full System Backup JSON */}
          <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col justify-between gap-3 hover:border-slate-200 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#fff4de] text-[#ff947a] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-[#151d48]">Full Telemetry Diagnostics Snapshot</h3>
                <p className="text-[11px] text-[#737791] mt-0.5">
                  Complete system export with all sensor metrics, thermal data, alerts, and predictions.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleExport(exportFullTelemetryJSON, "Full Telemetry Snapshot")}
              className="w-full py-2.5 px-4 rounded-xl bg-[#151d48] hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <FileJson className="w-4 h-4" />
              <span>Full System Backup (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Operator / Admin Info */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#f1f5f9] card-shadow">
        <h3 className="text-base font-extrabold text-[#151d48] mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#5d5fef]" />
          Account Profile
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#f8fafc] rounded-2xl p-3.5 border border-slate-100">
            <p className="text-[11px] font-semibold text-[#737791]">User ID</p>
            <p className="text-sm font-extrabold text-[#151d48] font-mono mt-0.5">{userId}</p>
          </div>
          <div className="bg-[#f8fafc] rounded-2xl p-3.5 border border-slate-100">
            <p className="text-[11px] font-semibold text-[#737791]">Name</p>
            <p className="text-sm font-extrabold text-[#151d48] mt-0.5">{userName || "Administrator"}</p>
          </div>
          <div className="bg-[#f8fafc] rounded-2xl p-3.5 border border-slate-100">
            <p className="text-[11px] font-semibold text-[#737791]">Role</p>
            <p className="text-sm font-extrabold text-[#5d5fef] uppercase mt-0.5">{userRole || "ADMIN"}</p>
          </div>
          <div className="bg-[#f8fafc] rounded-2xl p-3.5 border border-slate-100">
            <p className="text-[11px] font-semibold text-[#737791]">Department</p>
            <p className="text-sm font-extrabold text-[#151d48] mt-0.5 truncate">{department || "System Admin"}</p>
          </div>
        </div>
      </div>

      {/* Change Credentials Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#f1f5f9] card-shadow">
        <h3 className="text-base font-extrabold text-[#151d48] mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#5d5fef]" />
          Update Password & User ID
        </h3>

        {message && (
          <div
            className={`mb-5 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold ${
              message.type === "success"
                ? "bg-[#dcfce7] border border-[#22c55e]/30 text-[#15803d]"
                : "bg-[#ffe2e5] border border-[#fa5a7d]/30 text-[#fa5a7d]"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#151d48] mb-1.5 uppercase tracking-wider">
              User ID
            </label>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="e.g. ADM-0001"
              required
              className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-semibold text-[#151d48] placeholder-[#737791]/60 focus:outline-none focus:ring-2 focus:ring-[#5d5fef] transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#151d48] mb-1.5 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
                minLength={6}
                className="w-full pl-4 pr-12 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-semibold text-[#151d48] placeholder-[#737791]/60 focus:outline-none focus:ring-2 focus:ring-[#5d5fef] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737791] hover:text-[#151d48]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#151d48] mb-1.5 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-semibold text-[#151d48] placeholder-[#737791]/60 focus:outline-none focus:ring-2 focus:ring-[#5d5fef] transition-all"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3.5 bg-[#5d5fef] hover:bg-[#4951ec] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5d5fef]/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Credentials</span>
          </button>
        </form>
      </div>

      {/* System Information Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#f1f5f9] card-shadow">
        <h3 className="text-base font-extrabold text-[#151d48] mb-4">Industrial System Information</h3>
        <div className="space-y-2.5">
          {[
            { label: "Platform", value: "NMDC Industrial Conveyor Belt Vision & AI v2.4.0" },
            { label: "Mining Complex", value: "Bailadila Iron Ore Deposit-14 & Sector 5" },
            { label: "Telemetry Protocol", value: "MQTT v3.1.1 + Modbus TCP (100Hz Telemetry Rate)" },
            { label: "Vision AI Model", value: "YOLO-STOD Splice & Joint Rupture Inference (30 FPS)" },
            { label: "Database Layer", value: "MongoDB Atlas + In-Memory Serverless Resilient Fallback" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
              <span className="font-semibold text-[#737791]">{item.label}</span>
              <span className="font-bold text-[#151d48] text-right font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
