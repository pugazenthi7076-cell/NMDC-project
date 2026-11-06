"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Loader2, KeyRound, CheckCircle, AlertCircle, ArrowLeft, Lock, Eye, EyeOff, Zap } from "lucide-react";

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
        body: JSON.stringify({ userId: userId.trim(), newPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f7f4] p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#f1f5f9] shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-[#dcfce7] flex items-center justify-center text-[#22c55e]">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-extrabold text-[#151d48] mb-2">Password Reset Successful</h2>
            <p className="text-xs font-semibold text-[#737791] mb-6">
              Your password has been updated. You can now log in with your new credentials.
            </p>

            <div className="bg-[#f8fafc] rounded-2xl p-4 mb-6 text-left border border-slate-100">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#737791] font-medium">User ID</span>
                  <span className="text-[#151d48] font-mono font-bold">{userId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#737791] font-medium">Status</span>
                  <span className="text-[#22c55e] font-bold">Active & Ready</span>
                </div>
              </div>
            </div>

            <Link
              href="/login"
              className="block w-full py-3.5 bg-[#5d5fef] hover:bg-[#4951ec] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5d5fef]/30 transition-all text-center"
            >
              Sign In to Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f7f4] relative overflow-hidden p-4">
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#5d5fef]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#3cd856]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-[#5d5fef] to-[#8284ff] flex items-center justify-center text-white shadow-xl shadow-[#5d5fef]/30">
            <Zap className="w-8 h-8 fill-white text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#151d48] tracking-tight">Reset Password</h1>
          <p className="text-xs font-semibold text-[#737791] mt-1">
            Enter your User ID and set a new password
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#f1f5f9] shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-[#ffe2e5] border border-[#fa5a7d]/20 rounded-2xl flex items-center gap-2.5 text-[#fa5a7d] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#151d48] mb-1.5 uppercase tracking-wider">
                User ID *
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737791]" />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. ADM-0001 (or ADMIN-001)"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-semibold text-[#151d48] placeholder-[#737791]/60 focus:outline-none focus:ring-2 focus:ring-[#5d5fef] transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#151d48] mb-1.5 uppercase tracking-wider">
                New Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737791]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value.slice(0, 32))}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  maxLength={32}
                  autoComplete="new-password"
                  className="w-full pl-11 pr-12 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-semibold text-[#151d48] placeholder-[#737791]/60 focus:outline-none focus:ring-2 focus:ring-[#5d5fef] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737791] hover:text-[#151d48]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#151d48] mb-1.5 uppercase tracking-wider">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737791]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value.slice(0, 32))}
                  placeholder="Re-enter new password"
                  required
                  maxLength={32}
                  autoComplete="new-password"
                  className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-semibold text-[#151d48] placeholder-[#737791]/60 focus:outline-none focus:ring-2 focus:ring-[#5d5fef] transition-all"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-[#fa5a7d] mt-1 font-semibold">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !userId || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full py-3.5 mt-2 bg-[#5d5fef] hover:bg-[#4951ec] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5d5fef]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-1">
            <p className="text-xs text-[#737791]">
              Default Admin ID: <strong className="text-[#151d48]">ADM-0001</strong> (or <strong className="text-[#151d48]">ADMIN-001</strong>)
            </p>
            <p className="text-[11px] text-[#737791]">
              Default Worker IDs: <strong className="text-[#151d48]">WKR-0001</strong>, <strong className="text-[#151d48]">WKR-0002</strong>
            </p>
          </div>
        </div>

        <p className="text-center text-sm font-bold mt-5">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[#5d5fef] hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
