"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Settings, Lock, Save, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const { userId, userName, userRole, department } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newId, setNewId] = useState(userId || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    if (!newId.trim()) {
      setMessage({ type: "error", text: "Admin ID cannot be empty" });
      return;
    }

    setMessage({
      type: "success",
      text: "Password reset requested. Please use Forgot Password flow for secure password changes.",
    });

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Admin account and application settings
        </p>
      </div>

      {/* Current Admin Info */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--primary)]" />
          Current Admin
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--muted-foreground)]">User ID</p>
            <p className="text-sm font-semibold text-[var(--foreground)] font-mono">{userId}</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Name</p>
            <p className="text-sm font-semibold text-[var(--foreground)]">{userName}</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Role</p>
            <p className="text-sm font-semibold text-[var(--foreground)] capitalize">{userRole}</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Department</p>
            <p className="text-sm font-semibold text-[var(--foreground)]">{department}</p>
          </div>
        </div>
      </div>

      {/* Change Credentials */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[var(--primary)]" />
          Change Credentials
        </h3>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === "success"
                ? "bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)]"
                : "bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)]"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              New Admin ID
            </label>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="Enter new admin ID"
              required
              className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-all"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </form>
      </div>

      {/* System Info */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
          System Information
        </h3>
        <div className="space-y-2">
          {[
            { label: "Application", value: "NMDC Analyzer v1.0.0" },
            { label: "Problem Statement", value: "SIH26008" },
            { label: "Theme", value: "Smart Automation" },
            { label: "Team", value: "Spidy Hackers" },
            { label: "Technology", value: "Next.js + TypeScript + Tailwind CSS" },
            { label: "CV Model", value: "YOLO-STOD (Conveyor Belt Tear Detection)" },
            { label: "ML Framework", value: "Predictive Maintenance Pipeline" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-xs text-[var(--muted-foreground)]">{item.label}</span>
              <span className="text-xs font-medium text-[var(--foreground)]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
