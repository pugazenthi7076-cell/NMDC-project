"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Shield } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.push(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary)] flex items-center justify-center">
          <Shield className="w-10 h-10 text-[var(--primary-foreground)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--primary)]">NMDC Analyzer</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Loading...</p>
      </div>
    </div>
  );
}
