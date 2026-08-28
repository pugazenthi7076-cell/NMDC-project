"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  userId: string | null;
  userName: string | null;
  userRole: "admin" | "worker" | null;
  department: string | null;
  designation: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "worker" | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [designation, setDesignation] = useState<string | null>(null);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUserId(data.userId);
        setUserName(data.name);
        setUserRole(data.role);
        setDepartment(data.department);
        setDesignation(data.designation);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
        setUserName(null);
        setUserRole(null);
        setDepartment(null);
        setDesignation(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUserId(null);
      setUserName(null);
      setUserRole(null);
      setDepartment(null);
      setDesignation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (userIdInput: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userIdInput, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setUserId(data.user.id);
        setUserName(data.user.name);
        setUserRole(data.user.role);
        setDepartment(data.user.department);
        setDesignation(data.user.designation);
        return { success: true };
      }

      return { success: false, error: data.error || "Login failed" };
    } catch {
      return { success: false, error: "Connection error" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setUserId(null);
    setUserName(null);
    setUserRole(null);
    setDepartment(null);
    setDesignation(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, userId, userName, userRole, department, designation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
