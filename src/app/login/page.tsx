"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Shield, Eye, EyeOff, AlertCircle, Loader2, Phone, KeyRound } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 25px 25px, var(--primary) 2%, transparent 0%)",
          backgroundSize: "50px 50px",
        }} />
      </div>
      <div className="absolute top-20 left-20 w-72 h-72 bg-[var(--primary)] rounded-full mix-blend-multiply blur-3xl opacity-10 animate-pulse" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-[var(--info)] rounded-full mix-blend-multiply blur-3xl opacity-10 animate-pulse" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
            <Shield className="w-12 h-12 text-[var(--primary-foreground)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Industrial Belt Monitoring</h1>
          <p className="text-[var(--muted-foreground)] mt-2 text-sm">Conveyor Belt Monitoring System</p>
          <p className="text-[var(--muted-foreground)] text-xs mt-1">Smart India Hackathon 2026 | Spidy Hackers</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Sign In</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Enter your User ID and password</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-lg flex items-center gap-2 text-[var(--destructive)] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">User ID</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. ADM-0001 or WKR-0001"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-11 pr-11 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !mobile || !password}
              className="w-full py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</> : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-2">
            <Link href="/register" className="block text-xs text-center text-[var(--primary)] hover:underline">Create new account →</Link>
            <Link href="/forgot-password" className="block text-xs text-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Forgot password?</Link>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">© 2026 NMDC Ltd. | SIH26008</p>
      </div>
    </div>
  );
}
