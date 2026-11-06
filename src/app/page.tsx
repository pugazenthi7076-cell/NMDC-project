"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Zap } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.push(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f7f4]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-[#5d5fef] to-[#8284ff] flex items-center justify-center text-white shadow-xl shadow-[#5d5fef]/30 animate-pulse">
          <Zap className="w-8 h-8 fill-white text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#151d48]">NMDC Pulse</h1>
        <p className="text-xs font-semibold text-[#737791] mt-1">Conveyor Belt Intelligence</p>
      </div>
    </div>
  );
}
