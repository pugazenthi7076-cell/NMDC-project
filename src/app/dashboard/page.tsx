"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Gauge,
  ShieldAlert,
  Cog,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  mockDashboardStats,
  mockBelts,
  mockAlerts,
  productionChartData,
  damageTrendData,
  uptimeChartData,
} from "@/lib/mock-data";

const STATUS_COLORS = {
  operational: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  offline: "#64748b",
};

const SEVERITY_COLORS = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

export default function DashboardPage() {
  const stats = mockDashboardStats;

  const statusPieData = [
    { name: "Operational", value: stats.operationalBelts, color: "#22c55e" },
    { name: "Warning", value: stats.warningBelts, color: "#f59e0b" },
    { name: "Critical", value: stats.criticalBelts, color: "#ef4444" },
    { name: "Offline", value: stats.totalBelts - stats.operationalBelts - stats.warningBelts - stats.criticalBelts, color: "#64748b" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Dashboard Overview
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Industrial Belt Monitoring System | Real-time Intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse-live" />
          <span className="text-xs text-[var(--muted-foreground)]">Live Monitoring</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Belts"
          value={stats.totalBelts}
          sub={`${stats.operationalBelts} operational`}
          color="var(--info)"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Avg Uptime"
          value={`${stats.avgUptime}%`}
          sub="Last 30 days"
          color="var(--success)"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Active Alerts"
          value={stats.activeAlerts}
          sub={`${stats.criticalBelts} critical`}
          color="var(--warning)"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Daily Tonnage"
          value={`${(stats.totalTonnage).toLocaleString()}`}
          sub="tonnes/day"
          color="var(--primary)"
        />
      </div>

      {/* Second Row Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Uptime Target"
          value="95%"
          sub="Company benchmark"
          color="var(--success)"
        />
        <StatCard
          icon={<ShieldAlert className="w-5 h-5" />}
          label="Damage Detections"
          value={stats.damageDetections}
          sub="This month"
          color="var(--destructive)"
        />
        <StatCard
          icon={<Gauge className="w-5 h-5" />}
          label="Predictions Pending"
          value={stats.predictionsPending}
          sub="ML predictions"
          color="var(--info)"
        />
        <StatCard
          icon={<Cog className="w-5 h-5" />}
          label="Critical Belts"
          value={stats.criticalBelts}
          sub="Need attention"
          color="var(--destructive)"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Chart */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
            Production vs Target (Tonnes)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
              />
              <Legend />
              <Bar dataKey="tonnage" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Actual" />
              <Bar dataKey="target" fill="var(--info)" radius={[4, 4, 0, 0]} name="Target" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Belt Status Pie Chart */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
            Belt Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {statusPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
              />
              <Legend
                formatter={(value: string) => <span className="text-[var(--foreground)]">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Damage Trend */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
            Damage Trend Analysis (6 Months)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={damageTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="tears" stroke="#ef4444" strokeWidth={2} name="Tears" />
              <Line type="monotone" dataKey="abrasions" stroke="#f59e0b" strokeWidth={2} name="Abrasions" />
              <Line type="monotone" dataKey="jointFailures" stroke="#8b5cf6" strokeWidth={2} name="Joint Failures" />
              <Line type="monotone" dataKey="edgeDamage" stroke="#3b82f6" strokeWidth={2} name="Edge Damage" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
            Recent Alerts
          </h3>
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  alert.acknowledged
                    ? "bg-[var(--background)] border-[var(--border)] opacity-60"
                    : "bg-[var(--background)] border-[var(--border)]"
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--foreground)] leading-relaxed">
                    {alert.message}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                {alert.acknowledged && (
                  <CheckCircle className="w-4 h-4 text-[var(--success)] flex-shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Uptime Chart */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
          Belt Uptime Comparison
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={uptimeChartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" domain={[70, 100]} stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
              }}
            />
            <Bar dataKey="uptime" radius={[0, 4, 4, 0]}>
              {uptimeChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 card-hover">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{value}</p>
      <p className="text-xs text-[var(--muted-foreground)] mt-1">{sub}</p>
    </div>
  );
}
