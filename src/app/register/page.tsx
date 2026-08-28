"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Loader2, Phone, User, Mail, Building2, Briefcase, CheckCircle, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<"admin" | "worker">("worker");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [sectionHead, setSectionHead] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdUserId, setCreatedUserId] = useState("");
  const router = useRouter();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, mobile, role, department, designation, sectionHead, password }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      setCreatedUserId(data.user.id);
      setSuccess(true);
    } else {
      setError(data.error || "Registration failed");
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-[var(--success)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Account Created!</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Your account has been created successfully.</p>

            <div className="bg-[var(--background)] rounded-xl p-4 mb-6">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Your User ID</p>
              <p className="text-2xl font-bold font-mono text-[var(--primary)]">{createdUserId}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-2">Use this User ID and your password to login.</p>
            </div>

            <Link href="/login" className="block w-full py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-all text-center">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] relative overflow-hidden py-8">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 25px 25px, var(--primary) 2%, transparent 0%)", backgroundSize: "50px 50px" }} />
      </div>

      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[var(--primary)] flex items-center justify-center shadow-lg">
            <Shield className="w-10 h-10 text-[var(--primary-foreground)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Create Account</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Industrial Belt Monitoring System</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-lg flex items-center gap-2 text-[var(--destructive)] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Personal Details</h3>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" required className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@nmdc.in" required className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Mobile *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" required className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" />
                </div>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-[var(--foreground)] pt-2">Work Details</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Role *</label>
                <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "worker")} className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all">
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Department *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} required className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all">
                    <option value="">Select</option>
                    <option value="Conveyor Operations">Conveyor Ops</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Safety">Safety</option>
                    <option value="Mining Operations">Mining Ops</option>
                    <option value="IT">IT</option>
                    <option value="Quality Control">QC</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Designation *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Engineer" required className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Section Head *</label>
                <input type="text" value={sectionHead} onChange={(e) => setSectionHead(e.target.value)} placeholder="Dept. head name" required className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-[var(--foreground)] pt-2">Set Password</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Password *</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value.slice(0, 32))} placeholder="Min 6 characters" required minLength={6} maxLength={32} autoComplete="new-password" className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Confirm Password *</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value.slice(0, 32))} placeholder="Re-enter password" required maxLength={32} autoComplete="new-password" className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" />
              </div>
            </div>

            <button type="submit" disabled={isLoading || !name || !email || !mobile || !department || !designation || !sectionHead || !password || !confirmPassword} className="w-full py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
          Already have an account? <Link href="/login" className="text-[var(--primary)] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
