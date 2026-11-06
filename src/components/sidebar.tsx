"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  PieChart as DashboardIcon,
  BarChart2,
  ScanLine,
  Brain,
  TrendingUp,
  Flame,
  Bell,
  Settings,
  LogOut,
  Users,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { mockAlerts } from "@/lib/mock-data";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/dashboard/belt-monitoring", label: "Belt Monitor", icon: BarChart2 },
  { href: "/dashboard/damage-detection", label: "Damage Detect", icon: ScanLine, badge: "LIVE" },
  { href: "/dashboard/ml-predictions", label: "ML Predictions", icon: Brain },
  { href: "/dashboard/predictive-maintenance", label: "Maintenance", icon: TrendingUp },
  { href: "/dashboard/thermal-analysis", label: "Thermal Analysis", icon: Flame },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell, alertBadge: true },
  { href: "/dashboard/admin-management", label: "User Sessions", icon: Users, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout, userName, userRole } = useAuth();

  const unreadCount = mockAlerts.filter((a) => !a.acknowledged).length;

  return (
    <aside
      className={`h-full bg-white flex flex-col transition-all duration-300 select-none ${
        collapsed && !isMobile ? "w-20" : "w-64"
      } border-r border-[#f1f5f9]`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-7">
        <Link
          href="/dashboard"
          className="flex items-center gap-3.5 group"
          onClick={isMobile ? onCloseMobile : undefined}
        >
          {/* Logo icon matching Figma */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5d5fef] to-[#8284ff] flex items-center justify-center text-white shadow-lg shadow-[#5d5fef]/30 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="overflow-hidden">
              <h1 className="text-xl font-extrabold text-[#151d48] tracking-tight flex items-center gap-1">
                NMDC <span className="text-[#5d5fef]">Pulse</span>
              </h1>
              <p className="text-[10px] font-semibold text-[#737791] tracking-wider uppercase">
                Conveyor AI
              </p>
            </div>
          )}
        </Link>

        {onToggleCollapse && !isMobile && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-[#737791] hover:text-[#151d48] transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
        {navItems
          .filter((item) => !item.adminOnly || userRole === "admin")
          .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={isMobile ? onCloseMobile : undefined}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? "bg-[#5d5fef] text-white shadow-lg shadow-[#5d5fef]/25"
                    : "text-[#737791] hover:text-[#5d5fef] hover:bg-[#f8fafc]"
                }`}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : "text-[#737791] group-hover:text-[#5d5fef]"
                  }`}
                />

                {(!collapsed || isMobile) && (
                  <span className="truncate flex-1 tracking-tight">{item.label}</span>
                )}

                {/* Badge pill */}
                {(!collapsed || isMobile) && item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-[#3cd856]/15 text-[#22c55e]">
                    {item.badge}
                  </span>
                )}

                {/* Alert Badge count */}
                {item.alertBadge && unreadCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white text-[#5d5fef]" : "bg-[#fa5a7d] text-white"
                    } ${collapsed && !isMobile ? "absolute top-2 right-2" : ""}`}
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Bottom Pro Card (Matching Figma "Dabang Pro" card exactly) */}
      {(!collapsed || isMobile) && (
        <div className="p-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#6b73ff] to-[#4951ec] p-5 text-white text-center shadow-xl shadow-[#5d5fef]/20">
            {/* Background decorative glow */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />

            <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3 className="font-bold text-sm tracking-tight">NMDC Pulse Pro</h3>
            <p className="text-[11px] text-white/80 mt-1 mb-3.5 leading-relaxed">
              Real-time edge sensor streaming & CV detection active
            </p>

            <button
              onClick={() => {
                alert("NMDC Edge Telemetry Gateway connected to Bailadila Deposit-14.");
              }}
              className="w-full py-2 px-4 rounded-xl bg-white text-[#5d5fef] font-bold text-xs shadow-md hover:bg-slate-50 transition-colors"
            >
              System Health
            </button>
          </div>
        </div>
      )}

      {/* User & Sign Out section */}
      <div className="p-4 border-t border-[#f1f5f9]">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold text-[#737791] hover:text-[#fa5a7d] hover:bg-[#ffe2e5]/50 transition-all ${
            collapsed && !isMobile ? "justify-center" : ""
          }`}
          title="Sign Out"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-[#737791] group-hover:text-[#fa5a7d]" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
