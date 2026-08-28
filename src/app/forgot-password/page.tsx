"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Loader2, KeyRound, CheckCircle, AlertCircle, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";

export default function ForgotPasswordPage() {
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch {
      setError("Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-[var(--success)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Password Reset Successful</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Your password has been updated. You can now log in with your new credentials.</p>

            <div className="bg-[var(--background)] rounded-xl p-4 mb-6 text-left">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">User ID</span>
                  <span className="text-[var(--foreground)] font-mono font-medium">{userId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">Status</span>
                  <span className="text-[var(--success)] font-medium">Active</span>
                </div>
              </div>
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 25px 25px, var(--primary) 2%, transparent 0%)", backgroundSize: "50px 50px" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[var(--primary)] flex items-center justify-center shadow-lg">
            <KeyRound className="w-10 h-10 text-[var(--primary-foreground)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Reset Password</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Enter your User ID and set a new password</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-lg flex items-center gap-2 text-[var(--destructive)] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">User ID *</label>
              <input type="text" value={userId} onChange={(e) => setUserId(e.target.value.toUpperCase())} placeholder="e.g. ADM-0001 or WKR-0001" required className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all font-mono" />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">New Password *</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value.slice(0, 32))} placeholder="Min 6 characters" required minLength={6} maxLength={32} autoComplete="new-password" className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Confirm Password *</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value.slice(0, 32))} placeholder="Re-enter password" required maxLength={32} autoComplete="new-password" className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-[var(--destructive)] mt-1">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={isLoading || !userId || !newPassword || !confirmPassword || newPassword !== confirmPassword} className="w-full py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4" /> Reset Password</>}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
          <Link href="/login" className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"><ArrowLeft className="w-3.5 h-3.5" /> Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
