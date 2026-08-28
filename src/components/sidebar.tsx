"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Activity, ScanLine, Cog, BarChart3, Bell,
  Settings, LogOut, Shield, ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/belt-monitoring", label: "Belt Monitoring", icon: Activity },
  { href: "/dashboard/damage-detection", label: "Damage Detection", icon: ScanLine },
  { href: "/dashboard/predictive-maintenance", label: "Predictions", icon: Cog },
  { href: "/dashboard/thermal-analysis", label: "Analysis", icon: BarChart3 },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/admin-management", label: "User Sessions", icon: Users, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-[var(--info)]/15 text-[var(--info)] border border-[var(--info)]/20",
  worker: "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/20",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, userId, userName, userRole, department, designation } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`h-screen bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-[var(--primary-foreground)]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-[var(--primary)] tracking-wider">Industrial</h1>
            <p className="text-[10px] text-[var(--muted-foreground)] tracking-widest uppercase">Belt Monitoring</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto p-1 rounded hover:bg-[var(--sidebar-hover)] text-[var(--muted-foreground)]">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems
          .filter((item) => !item.adminOnly || userRole === "admin")
          .map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "" : "group-hover:text-[var(--primary)]"}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
      </nav>

      {/* User Info */}
      <div className="border-t border-[var(--border)] p-3 space-y-2">
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">{userName || userId}</p>
              {userRole && (
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase flex-shrink-0 ${ROLE_BADGE[userRole]}`}>
                  {userRole === "admin" ? "ADMIN" : "WORKER"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] truncate">
              {userId} • {department || "—"}
            </p>
          </div>
        )}
        <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--destructive)] hover:bg-[var(--sidebar-hover)] transition-all" title={collapsed ? "Logout" : undefined}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
