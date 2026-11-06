"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Search,
  Menu,
  X,
  LogOut,
  MapPin,
  ExternalLink,
  Shield,
  Sliders,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { mockAlerts, mockBelts } from "@/lib/mock-data";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/belt-monitoring": "Belt Monitoring",
  "/dashboard/damage-detection": "Damage Detection",
  "/dashboard/ml-predictions": "ML Predictions",
  "/dashboard/predictive-maintenance": "Predictions",
  "/dashboard/thermal-analysis": "Thermal Analysis",
  "/dashboard/alerts": "Alerts Console",
  "/dashboard/admin-management": "User Sessions",
  "/dashboard/settings": "Settings",
};

const SECTORS = [
  { id: "SEC-14", name: "Bailadila Dep-14", full: "Bailadila Deposit-14 Main", flag: "🏭" },
  { id: "SEC-05", name: "Deposit-5 (Sec II)", full: "Bacheli Deposit-5 Crushing", flag: "⛏️" },
  { id: "SEC-K1", name: "Kirandul Plant #1", full: "Kirandul Screening Complex", flag: "⚙️" },
  { id: "SEC-D3", name: "Donimalai Overland", full: "Donimalai Long Haul", flag: "🏔️" },
];

export default function Header({ onToggleMobileSidebar }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, userId, userName, userRole, department, designation } = useAuth();

  const [selectedSector, setSelectedSector] = useState(SECTORS[0]);
  const [sectorOpen, setSectorOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const sectorRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) {
        setSectorOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pageTitle = PAGE_TITLES[pathname] || "Dashboard";
  const unreadAlerts = mockAlerts.filter((a) => !a.acknowledged);

  return (
    <>
      <header className="h-20 bg-white px-6 lg:px-10 flex items-center justify-between gap-4 border-b border-[#f1f5f9] select-none">
        {/* Left: Mobile hamburger + Page Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2.5 rounded-2xl bg-[#f8fafc] text-[#151d48] hover:bg-slate-100 transition-colors"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5 text-[#151d48]" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#151d48] tracking-tight">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center: Search Bar (Matching Figma Dabang exactly) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div
            onClick={() => setSearchOpen(true)}
            className="w-full bg-[#f8fafc] hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all rounded-2xl px-5 py-3 flex items-center gap-3 cursor-pointer group"
          >
            <Search className="w-4 h-4 text-[#5d5fef] group-hover:scale-110 transition-transform" />
            <span className="text-sm text-[#737791] font-medium select-none">Search here...</span>
            <kbd className="ml-auto text-[10px] font-mono text-[#a1a1aa] bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Sector Selector + Alert Bell + User Profile */}
        <div className="flex items-center gap-3.5">
          {/* Sector Selector (Like the country dropdown in Figma) */}
          <div className="relative" ref={sectorRef}>
            <button
              onClick={() => setSectorOpen(!sectorOpen)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#f8fafc] hover:bg-slate-100 text-xs font-semibold text-[#151d48] transition-colors"
            >
              <span className="text-sm">{selectedSector.flag}</span>
              <span className="hidden sm:inline font-bold">{selectedSector.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#737791]" />
            </button>

            {sectorOpen && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-[#737791]">
                  Conveyor Sector
                </div>
                {SECTORS.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setSelectedSector(sec);
                      setSectorOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left text-xs transition-colors ${
                      selectedSector.id === sec.id
                        ? "bg-[#5d5fef]/10 text-[#5d5fef] font-bold"
                        : "text-[#737791] hover:bg-slate-50 hover:text-[#151d48]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{sec.flag}</span>
                      <div>
                        <div className="font-semibold">{sec.name}</div>
                        <div className="text-[10px] text-[#737791]">{sec.full}</div>
                      </div>
                    </div>
                    {selectedSector.id === sec.id && <CheckCircle className="w-3.5 h-3.5 text-[#5d5fef]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alert Notification Bell (Figma style soft peach button) */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={() => setAlertsOpen(!alertsOpen)}
              className="relative p-3 rounded-2xl bg-[#fff4de] hover:bg-[#ffedd5] text-[#ff947a] transition-colors"
              aria-label="Alerts"
            >
              <Bell className="w-5 h-5 fill-current" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#fa5a7d] text-white text-[10px] font-extrabold flex items-center justify-center shadow-md">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {alertsOpen && (
              <div className="absolute top-full mt-2 right-0 w-80 sm:w-96 bg-white border border-slate-100 rounded-3xl shadow-2xl p-3 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#151d48]">Incident Alerts</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fa5a7d]/15 text-[#fa5a7d]">
                      {unreadAlerts.length} Active
                    </span>
                  </div>
                  <Link
                    href="/dashboard/alerts"
                    onClick={() => setAlertsOpen(false)}
                    className="text-xs text-[#5d5fef] font-bold hover:underline flex items-center gap-1"
                  >
                    Console <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 my-1">
                  {unreadAlerts.slice(0, 4).map((alert) => (
                    <div key={alert.id} className="p-2.5 hover:bg-slate-50 rounded-2xl transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            alert.severity === "critical"
                              ? "bg-[#fa5a7d]/15 text-[#fa5a7d]"
                              : "bg-[#ff947a]/15 text-[#ff947a]"
                          }`}
                        >
                          {alert.type}
                        </span>
                        <span className="text-[10px] text-[#737791]">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-[#151d48] font-medium line-clamp-2">{alert.message}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/dashboard/alerts"
                  onClick={() => setAlertsOpen(false)}
                  className="block text-center w-full py-2.5 rounded-2xl bg-[#5d5fef] hover:bg-[#4951ec] text-white font-bold text-xs transition-colors shadow-sm"
                >
                  View All Incidents
                </Link>
              </div>
            )}
          </div>

          {/* User Profile (Matching Figma "Musfiq Admin" layout exactly) */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-2xl hover:bg-slate-50 transition-colors"
            >
              {/* User Avatar */}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5d5fef] to-[#ff947a] p-0.5 shadow-sm">
                <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center font-bold text-sm text-[#5d5fef]">
                  {userName ? userName.slice(0, 2).toUpperCase() : "NM"}
                </div>
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-sm font-bold text-[#151d48] leading-tight">
                  {userName || "Musfiq"}
                </div>
                <div className="text-[11px] font-semibold text-[#737791] leading-tight">
                  {userRole === "admin" ? "Admin" : "Operator"}
                </div>
              </div>

              <ChevronDown className="w-4 h-4 text-[#737791]" />
            </button>

            {userMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl p-2.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-slate-100 mb-1">
                  <div className="font-bold text-sm text-[#151d48]">{userName || "Administrator"}</div>
                  <div className="text-[11px] text-[#737791] font-mono">{userId}</div>
                  <div className="text-[10px] text-[#737791] mt-1">
                    {department || "Ore Processing"} • {designation || "Senior Engineer"}
                  </div>
                </div>

                <Link
                  href="/dashboard/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-[#737791] hover:text-[#5d5fef] hover:bg-slate-50 font-semibold transition-colors"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Preferences</span>
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-[#fa5a7d] hover:bg-[#ffe2e5]/50 font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center px-5 py-4 border-b border-slate-100 gap-3">
              <Search className="w-5 h-5 text-[#5d5fef]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conveyor belts (e.g. BLT-001), views, or diagnostics..."
                className="w-full bg-transparent text-sm text-[#151d48] placeholder-[#737791] focus:outline-none font-medium"
                autoFocus
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-xl text-[#737791] hover:text-[#151d48] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#737791] px-3 pt-1">
                Conveyor Belts
              </div>
              {mockBelts
                .filter(
                  (b) =>
                    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    b.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((belt) => (
                  <button
                    key={belt.id}
                    onClick={() => {
                      setSearchOpen(false);
                      router.push(`/dashboard/belt-monitoring?belt=${belt.id}`);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors text-xs text-left"
                  >
                    <div>
                      <span className="font-bold text-[#5d5fef] font-mono mr-2">{belt.id}</span>
                      <span className="text-[#151d48] font-medium">{belt.name}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-[#737791]">
                      {belt.status}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
