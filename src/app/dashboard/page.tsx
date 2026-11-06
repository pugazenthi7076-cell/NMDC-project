"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Download,
  Zap,
  TrendingUp,
  Layers,
  Bell,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  MapPin,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  FileSpreadsheet,
  FileJson,
  Users,
} from "lucide-react";
import { mockDashboardStats, mockBelts, mockAlerts } from "@/lib/mock-data";
import {
  exportSensorRecordsCSV,
  exportAnalysisRecordsCSV,
  exportSeniorStaffRecordsCSV,
  exportFullTelemetryJSON,
} from "@/lib/export-records";

// 1. Data for Visitor Insights / Vibration Insights
const vibrationInsightData = [
  { month: "Jan", normal: 280, peak: 260, harmonic: 320 },
  { month: "Feb", normal: 340, peak: 250, harmonic: 350 },
  { month: "Mar", normal: 310, peak: 190, harmonic: 290 },
  { month: "Apr", normal: 270, peak: 180, harmonic: 260 },
  { month: "May", normal: 290, peak: 240, harmonic: 270 },
  { month: "Jun", normal: 360, peak: 320, harmonic: 300 },
  { month: "Jul", normal: 330, peak: 360, harmonic: 320 },
  { month: "Aug", normal: 280, peak: 290, harmonic: 270 },
  { month: "Sep", normal: 240, peak: 230, harmonic: 230 },
  { month: "Oct", normal: 270, peak: 210, harmonic: 250 },
  { month: "Nov", normal: 260, peak: 190, harmonic: 230 },
  { month: "Dec", normal: 230, peak: 170, harmonic: 210 },
];

// 2. Data for Total Revenue / Daily Ore Throughput
const dailyThroughputData = [
  { day: "Monday", direct: 14000, secondary: 12500 },
  { day: "Tuesday", direct: 17000, secondary: 11000 },
  { day: "Wednesday", direct: 8000, secondary: 23000 },
  { day: "Thursday", direct: 16000, secondary: 9000 },
  { day: "Friday", direct: 12000, secondary: 11500 },
  { day: "Saturday", direct: 17000, secondary: 13500 },
  { day: "Sunday", direct: 21000, secondary: 10500 },
];

// 3. Data for Customer Satisfaction / Tension & Speed
const tensionStabilityData = [
  { time: "00:00", lastMonth: 28, thisMonth: 42 },
  { time: "04:00", lastMonth: 25, thisMonth: 38 },
  { time: "08:00", lastMonth: 39, thisMonth: 48 },
  { time: "12:00", lastMonth: 18, thisMonth: 36 },
  { time: "16:00", lastMonth: 22, thisMonth: 44 },
  { time: "20:00", lastMonth: 19, thisMonth: 35 },
  { time: "24:00", lastMonth: 32, thisMonth: 55 },
];

// 4. Data for Target vs Reality
const targetRealityData = [
  { month: "Jan", reality: 7200, target: 8800 },
  { month: "Feb", reality: 6800, target: 8200 },
  { month: "Mar", reality: 6500, target: 9100 },
  { month: "Apr", reality: 8400, target: 11200 },
  { month: "May", reality: 8900, target: 9900 },
  { month: "June", reality: 9200, target: 11400 },
  { month: "July", reality: 9400, target: 11800 },
];

// 5. Volume vs Service Level (Drive Station Motor Load)
const motorLoadData = [
  { station: "ST-1", motorLoad: 1135, speed: 635 },
  { station: "ST-2", motorLoad: 1420, speed: 780 },
  { station: "ST-3", motorLoad: 1210, speed: 820 },
  { station: "ST-4", motorLoad: 1090, speed: 690 },
  { station: "ST-5", motorLoad: 890, speed: 510 },
  { station: "ST-6", motorLoad: 1380, speed: 760 },
];

export default function DashboardPage() {
  const stats = mockDashboardStats;
  const [activeRange, setActiveRange] = useState("Weekly");
  const [exportOpen, setExportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerExport = (fn: () => string, label: string) => {
    setExportOpen(false);
    const filename = fn();
    setToastMessage(`Exported ${label} (${filename})`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-[#dcfce7] border border-[#22c55e]/30 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold text-[#15803d] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-5 h-5 text-[#22c55e] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================
          ROW 1: Today's Operations (4 Pastel Cards) + Vibration Insights
         ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 7 Columns: Today's Operations (Figma "Today's Sales") */}
        <div className="xl:col-span-7 bg-white rounded-3xl p-6 lg:p-7 border border-[#f1f5f9] card-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 relative">
            <div>
              <h2 className="text-xl font-extrabold text-[#151d48] tracking-tight">
                Today&apos;s Operations
              </h2>
              <p className="text-xs font-semibold text-[#737791] mt-0.5">
                Conveyor Haulage & Edge Sensor Summary
              </p>
            </div>

            {/* Interactive Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#151d48] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#5d5fef]" />
                <span>Export Records</span>
              </button>

              {exportOpen && (
                <div className="absolute top-full mt-2 right-0 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-[#737791]">
                    Export Data Records
                  </div>

                  <button
                    onClick={() => triggerExport(exportSensorRecordsCSV, "Conveyor Sensor Records")}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 text-[#151d48] font-semibold text-left transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#22c55e]" />
                    <div>
                      <div>Conveyor Sensors (CSV)</div>
                      <div className="text-[10px] text-[#737791] font-normal">8 belt speeds, tensions, uptime</div>
                    </div>
                  </button>

                  <button
                    onClick={() => triggerExport(exportAnalysisRecordsCSV, "Multi-Sensor Diagnostics")}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 text-[#151d48] font-semibold text-left transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#fa5a7d]" />
                    <div>
                      <div>Sensor Diagnostics Logs (CSV)</div>
                      <div className="text-[10px] text-[#737791] font-normal">Vibration, thermal, motor current</div>
                    </div>
                  </button>

                  <button
                    onClick={() => triggerExport(exportSeniorStaffRecordsCSV, "Senior Staff Records")}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 text-[#151d48] font-semibold text-left transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#bf83ff]" />
                    <div>
                      <div>Senior Staff & Personnel (CSV)</div>
                      <div className="text-[10px] text-[#737791] font-normal">Administrators & section heads</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => triggerExport(exportFullTelemetryJSON, "Full System Backup")}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 text-[#151d48] font-semibold text-left transition-colors cursor-pointer"
                  >
                    <FileJson className="w-4 h-4 text-[#ff947a]" />
                    <div>
                      <div>Full Telemetry Snapshot (JSON)</div>
                      <div className="text-[10px] text-[#737791] font-normal">Complete system backup file</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4 Pastel Cards (Figma Dabang Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Pink Card - Total Belts */}
            <div className="bg-[#ffe2e5] rounded-2xl p-4 flex flex-col justify-between transition-transform hover:scale-[1.02] duration-200">
              <div className="w-10 h-10 rounded-full bg-[#fa5a7d] flex items-center justify-center text-white mb-4 shadow-sm">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#151d48] leading-none mb-1">
                  {stats.totalBelts} Belts
                </div>
                <div className="text-xs font-bold text-[#425166]">Total Monitored</div>
                <div className="text-[11px] font-semibold text-[#fa5a7d] mt-1.5 flex items-center gap-1">
                  <span>+5% vs yesterday</span>
                </div>
              </div>
            </div>

            {/* 2. Peach Card - Avg Uptime */}
            <div className="bg-[#fff4de] rounded-2xl p-4 flex flex-col justify-between transition-transform hover:scale-[1.02] duration-200">
              <div className="w-10 h-10 rounded-full bg-[#ff947a] flex items-center justify-center text-white mb-4 shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#151d48] leading-none mb-1">
                  {stats.avgUptime}%
                </div>
                <div className="text-xs font-bold text-[#425166]">Avg Uptime</div>
                <div className="text-[11px] font-semibold text-[#ff947a] mt-1.5 flex items-center gap-1">
                  <span>+1.2% target met</span>
                </div>
              </div>
            </div>

            {/* 3. Mint Green Card - Daily Tonnage */}
            <div className="bg-[#dcfce7] rounded-2xl p-4 flex flex-col justify-between transition-transform hover:scale-[1.02] duration-200">
              <div className="w-10 h-10 rounded-full bg-[#3cd856] flex items-center justify-center text-white mb-4 shadow-sm">
                <Layers className="w-5 h-5 fill-white text-white" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#151d48] leading-none mb-1">
                  {(stats.totalTonnage / 1000).toFixed(1)}k T
                </div>
                <div className="text-xs font-bold text-[#425166]">Daily Tonnage</div>
                <div className="text-[11px] font-semibold text-[#22c55e] mt-1.5 flex items-center gap-1">
                  <span>+8% vs last week</span>
                </div>
              </div>
            </div>

            {/* 4. Lavender Card - Active Alerts */}
            <div className="bg-[#f3e8ff] rounded-2xl p-4 flex flex-col justify-between transition-transform hover:scale-[1.02] duration-200">
              <div className="w-10 h-10 rounded-full bg-[#bf83ff] flex items-center justify-center text-white mb-4 shadow-sm">
                <Bell className="w-5 h-5 fill-white text-white" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#151d48] leading-none mb-1">
                  {stats.activeAlerts} Alerts
                </div>
                <div className="text-xs font-bold text-[#425166]">Active Incidents</div>
                <div className="text-[11px] font-semibold text-[#a855f7] mt-1.5 flex items-center gap-1">
                  <span>1 critical joint</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Visitor Insights / Vibration Insights */}
        <div className="xl:col-span-5 bg-white rounded-3xl p-6 lg:p-7 border border-[#f1f5f9] card-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#151d48] tracking-tight">
                Vibration & Health Insights
              </h2>
              <p className="text-xs font-semibold text-[#737791]">
                Idler Bearing Harmonic Resonance (Hz)
              </p>
            </div>
          </div>

          <div className="h-44 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vibrationInsightData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a0a4a8", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a0a4a8", fontSize: 10 }}
                  domain={[100, 400]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #f1f5f9",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
                    fontSize: "11px",
                  }}
                />
                <Line
                  type="natural"
                  dataKey="harmonic"
                  stroke="#bf83ff"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="natural"
                  dataKey="peak"
                  stroke="#fa5a7d"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#fa5a7d", strokeWidth: 0 }}
                />
                <Line
                  type="natural"
                  dataKey="normal"
                  stroke="#3cd856"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend (Figma style) */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 pt-3 border-t border-slate-100 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#bf83ff]" />
              <span className="text-[#151d48]">Harmonic Normal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#fa5a7d]" />
              <span className="text-[#151d48]">Peak Amplitude</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3cd856]" />
              <span className="text-[#151d48]">Stable Floor</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          ROW 2: Total Revenue + Customer Satisfaction + Target vs Reality
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Card 1: Total Revenue (Ore Throughput) */}
        <div className="bg-white rounded-3xl p-6 border border-[#f1f5f9] card-shadow flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-[#151d48] tracking-tight">
              Ore Throughput by Route
            </h3>
            <p className="text-xs font-semibold text-[#737791]">
              Daily Direct Haulage vs Secondary Screen
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyThroughputData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a0a4a8", fontSize: 10 }}
                  tickFormatter={(val) => val.slice(0, 3)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a0a4a8", fontSize: 10 }}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #f1f5f9",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="direct" fill="#0095ff" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="secondary" fill="#00e096" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0095ff]" />
              <span className="text-[#151d48]">Primary Haulage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e096]" />
              <span className="text-[#151d48]">Crusher Secondary</span>
            </div>
          </div>
        </div>

        {/* Card 2: Customer Satisfaction (Belt Tension & Speed Stability) */}
        <div className="bg-white rounded-3xl p-6 border border-[#f1f5f9] card-shadow flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-base font-extrabold text-[#151d48] tracking-tight">
              Tension & Dynamic Stability
            </h3>
            <p className="text-xs font-semibold text-[#737791]">
              Dynamic Load Stability across Conveyor Span
            </p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tensionStabilityData}>
                <defs>
                  <linearGradient id="colorThisMonth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#05c3fb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#05c3fb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLastMonth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e096" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00e096" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #f1f5f9",
                    fontSize: "11px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="thisMonth"
                  stroke="#05c3fb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorThisMonth)"
                />
                <Area
                  type="monotone"
                  dataKey="lastMonth"
                  stroke="#00e096"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorLastMonth)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats below chart (Figma Dabang style) */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-center">
            <div className="border-r border-slate-100 pr-2">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#737791]">
                <span className="w-2 h-2 rounded-full bg-[#00e096]" />
                <span>Base Tension</span>
              </div>
              <div className="text-sm font-black text-[#151d48] mt-0.5">85 kN</div>
            </div>
            <div className="pl-2">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#737791]">
                <span className="w-2 h-2 rounded-full bg-[#05c3fb]" />
                <span>Peak Load</span>
              </div>
              <div className="text-sm font-black text-[#151d48] mt-0.5">110 kN</div>
            </div>
          </div>
        </div>

        {/* Card 3: Target vs Reality */}
        <div className="bg-white rounded-3xl p-6 border border-[#f1f5f9] card-shadow flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-[#151d48] tracking-tight">
              Target vs Reality
            </h3>
            <p className="text-xs font-semibold text-[#737791]">
              Monthly Iron Ore Production (Tonnes)
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetRealityData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a0a4a8", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #f1f5f9",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="reality" fill="#00e096" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar dataKey="target" fill="#ffbe1a" radius={[4, 4, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison summary (Figma Dabang style) */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00e096]/15 flex items-center justify-center text-[#00e096]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#151d48]">Actual Output</div>
                  <div className="text-[10px] text-[#737791]">Global Mining Fleet</div>
                </div>
              </div>
              <span className="font-extrabold text-sm text-[#00e096]">9,400 T</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#ffbe1a]/15 flex items-center justify-center text-[#ffbe1a]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#151d48]">Target Goal</div>
                  <div className="text-[10px] text-[#737791]">NMDC Schedule</div>
                </div>
              </div>
              <span className="font-extrabold text-sm text-[#ffbe1a]">11,800 T</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          ROW 3: Top Conveyors + Sector Map + Motor Volume
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Columns: Top Products (Figma "Top Products" Table) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#f1f5f9] card-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-extrabold text-[#151d48] tracking-tight">
                Active Conveyor Belts
              </h3>
              <p className="text-xs font-semibold text-[#737791]">
                Load Popularity & Health Status
              </p>
            </div>
            <Link
              href="/dashboard/belt-monitoring"
              className="text-xs font-bold text-[#5d5fef] hover:underline flex items-center gap-1"
            >
              All Belts <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-[#a0a4a8] uppercase tracking-wider border-b border-slate-100 pb-2">
                  <th className="pb-3 w-8">#</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3 w-32">Load</th>
                  <th className="pb-3 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {mockBelts.slice(0, 4).map((belt, index) => {
                  const colors = [
                    { bar: "bg-[#0095ff]", pill: "border-[#0095ff] text-[#0095ff] bg-[#0095ff]/10" },
                    { bar: "bg-[#00e096]", pill: "border-[#00e096] text-[#00e096] bg-[#00e096]/10" },
                    { bar: "bg-[#bf83ff]", pill: "border-[#bf83ff] text-[#bf83ff] bg-[#bf83ff]/10" },
                    { bar: "bg-[#ffbe1a]", pill: "border-[#ffbe1a] text-[#ffbe1a] bg-[#ffbe1a]/10" },
                  ][index % 4];

                  const integrityScore = 100 - belt.damageRisk;

                  return (
                    <tr key={belt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 font-bold text-[#737791]">
                        0{index + 1}
                      </td>
                      <td className="py-3.5">
                        <div className="font-bold text-[#151d48]">{belt.name}</div>
                        <div className="text-[10px] text-[#737791] font-mono">{belt.id}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${colors.bar} rounded-full`}
                            style={{ width: `${Math.min(100, (belt.load / 3200) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${colors.pill}`}
                        >
                          {integrityScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Middle 4 Columns: Mining Sector Map (Figma "Sales Mapping by Country") */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#f1f5f9] card-shadow flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-[#151d48] tracking-tight">
              Bailadila Mining Sector Map
            </h3>
            <p className="text-xs font-semibold text-[#737791]">
              Iron Ore Complex Conveyor Topography
            </p>
          </div>

          {/* Schematic SVG Map */}
          <div className="relative h-48 bg-[#f8fafc] rounded-2xl border border-slate-100 p-4 flex items-center justify-center overflow-hidden">
            {/* Topography contour lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-40 text-slate-300"
              xmlns="http://www.w3.org/2000/svg"
            >
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="1" fill="currentColor" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Connecting Conveyor Paths */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path
                d="M 50 40 Q 120 70 180 50 T 280 120"
                fill="none"
                stroke="#5d5fef"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
              <path
                d="M 180 50 Q 200 130 140 150"
                fill="none"
                stroke="#00e096"
                strokeWidth="2"
              />
            </svg>

            {/* Mining Sector Nodes */}
            <div className="absolute top-6 left-8 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl shadow-md border border-slate-100 text-[10px] font-bold text-[#151d48]">
              <span className="w-2 h-2 rounded-full bg-[#fa5a7d] animate-ping" />
              <span>Deposit-14 (BLT-003 Joint Risk)</span>
            </div>

            <div className="absolute top-10 right-8 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl shadow-md border border-slate-100 text-[10px] font-bold text-[#151d48]">
              <span className="w-2 h-2 rounded-full bg-[#00e096]" />
              <span>Deposit-5 (Sector II)</span>
            </div>

            <div className="absolute bottom-6 left-20 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl shadow-md border border-slate-100 text-[10px] font-bold text-[#151d48]">
              <span className="w-2 h-2 rounded-full bg-[#0095ff]" />
              <span>Kirandul Plant #1</span>
            </div>

            <div className="absolute bottom-10 right-14 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl shadow-md border border-slate-100 text-[10px] font-bold text-[#151d48]">
              <span className="w-2 h-2 rounded-full bg-[#ffbe1a]" />
              <span>Donimalai Haul</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] font-bold text-[#737791]">
            <span>Active Sensors: 32 / 32</span>
            <span className="text-[#00e096]">Grid Synced (50ms)</span>
          </div>
        </div>

        {/* Right 3 Columns: Volume vs Service Level */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-[#f1f5f9] card-shadow flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-[#151d48] tracking-tight">
              Motor Load vs Speed
            </h3>
            <p className="text-xs font-semibold text-[#737791]">
              Drive Pulley kW vs Belt m/s
            </p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={motorLoadData} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="station"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a0a4a8", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #f1f5f9",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="motorLoad" stackId="a" fill="#0095ff" radius={[0, 0, 0, 0]} />
                <Bar dataKey="speed" stackId="a" fill="#00e096" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-around pt-3 border-t border-slate-100 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0095ff]" />
              <span className="text-[#151d48]">kW Load</span>
              <span className="text-[#737791] font-mono text-[10px]">1,135</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e096]" />
              <span className="text-[#151d48]">m/s Speed</span>
              <span className="text-[#737791] font-mono text-[10px]">635</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
