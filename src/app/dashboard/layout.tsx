"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Zap, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f7f4]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-[#5d5fef] to-[#8284ff] flex items-center justify-center shadow-xl shadow-[#5d5fef]/30 animate-bounce">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <p className="text-sm font-bold text-[#151d48]">Loading NMDC Pulse...</p>
          <p className="text-xs text-[#737791] mt-1">Connecting to Edge Vision Gateway</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f0f7f4] flex flex-col p-0 md:p-3 lg:p-4">
      {/* Main App Frame (Styled to match Figma Dabang rounded frame) */}
      <div className="flex-1 bg-white md:rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-[#f1f5f9] flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block h-screen max-h-none flex-shrink-0">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
          />
        </div>

        {/* Mobile Slide-over Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-end p-4">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-2xl bg-slate-100 text-[#737791] hover:text-[#151d48]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar
                  isMobile={true}
                  onCloseMobile={() => setMobileOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] md:h-auto overflow-hidden">
          <Header
            onToggleMobileSidebar={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#fafcff]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
