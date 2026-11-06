"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Zap, Eye, EyeOff, AlertCircle, Loader2, KeyRound, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(mobile, password);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Login failed");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f7f4] relative overflow-hidden p-4">
      {/* Ambient background glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#5d5fef]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#3cd856]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Logo Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-[#5d5fef] to-[#8284ff] flex items-center justify-center text-white shadow-xl shadow-[#5d5fef]/30">
            <Zap className="w-8 h-8 fill-white text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#151d48] tracking-tight">
            NMDC <span className="text-[#5d5fef]">Pulse</span>
          </h1>
          <p className="text-sm font-semibold text-[#737791] mt-1">
            Intelligent Conveyor Belt Monitoring System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#f1f5f9] shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-[#151d48]">Sign In to Portal</h2>
            <p className="text-xs font-semibold text-[#737791] mt-1">
              Enter your Operator ID or Admin credentials
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-[#ffe2e5] border border-[#fa5a7d]/20 rounded-2xl flex items-center gap-2.5 text-[#fa5a7d] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#151d48] mb-1.5 uppercase tracking-wider">
                User ID
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737791]" />
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. ADM-0001 or WKR-0001"
                  required
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-semibold text-[#151d48] placeholder-[#737791]/60 focus:outline-none focus:ring-2 focus:ring-[#5d5fef] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#151d48] uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-[#5d5fef] hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737791]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-semibold text-[#151d48] placeholder-[#737791]/60 focus:outline-none focus:ring-2 focus:ring-[#5d5fef] focus:border-transparent transition-all"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-5 rounded-2xl bg-[#5d5fef] hover:bg-[#4951ec] text-white font-extrabold text-sm shadow-lg shadow-[#5d5fef]/30 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Hint */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-[#737791]">
              Default Demo Login: <strong className="text-[#151d48]">ADM-0001</strong> / <strong className="text-[#151d48]">admin123</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
