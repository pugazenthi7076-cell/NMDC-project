"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { Users, Shield, Clock, Activity, RefreshCw } from "lucide-react";

export default function AdminManagementPage() {
  const { userRole } = useAuth();
  const router = useRouter();
  const [sessionCount, setSessionCount] = useState(0);
  const [maxSessions, setMaxSessions] = useState(15);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole && userRole !== "admin") {
      router.push("/dashboard");
    }
  }, [userRole, router]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        setSessionCount(data.activeSessions);
        setMaxSessions(data.maxSessions);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      fetchSessions();
      const interval = setInterval(fetchSessions, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  if (userRole !== "admin") return null;

  const utilization = Math.round((sessionCount / maxSessions) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Session Management</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Monitor active sessions and system load</p>
        </div>
        <button onClick={fetchSessions} className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-[var(--info)]/10 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-[var(--info)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Active Sessions</p>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{sessionCount}</p>
          <p className="text-xs text-[var(--muted-foreground)]">of {maxSessions} max</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Session Load</p>
          <p className="text-2xl font-bold mt-1" style={{ color: utilization > 80 ? "var(--destructive)" : utilization > 50 ? "var(--warning)" : "var(--success)" }}>
            {utilization}%
          </p>
          <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${utilization}%`, backgroundColor: utilization > 80 ? "var(--destructive)" : utilization > 50 ? "var(--warning)" : "var(--success)" }} />
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-[var(--success)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Your Role</p>
          <p className="text-lg font-bold text-[var(--foreground)] mt-1 capitalize">{userRole}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Super Admin</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-[var(--warning)]" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Session Timeout</p>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1">24h</p>
          <p className="text-xs text-[var(--muted-foreground)]">Auto-expire</p>
        </div>
      </div>

      {/* User Accounts Info */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">System Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Default Admin</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">User ID</span><span className="text-[var(--foreground)] font-mono font-medium">ADM-0001</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Mobile</span><span className="text-[var(--foreground)]">9999999999</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Password</span><span className="text-[var(--foreground)]">admin@1</span></div>
            </div>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Login Flow</h4>
            <div className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold">1</span> Enter User ID + password</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold">2</span> Access dashboard</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
