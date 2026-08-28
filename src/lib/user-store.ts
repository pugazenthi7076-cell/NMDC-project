// In-memory user store and session management
// In production, use a database (PostgreSQL, MongoDB, etc.)

import { UserProfile, SessionData, UserAccount } from "./types";

// ===== USER STORE =====
const users: Map<string, UserAccount> = new Map();

// ID counters
let adminCounter = 0;
let workerCounter = 0;

// Initialize default admin
const defaultAdmin: UserAccount = {
  id: "ADM-0001",
  name: "Super Admin",
  email: "admin@nmdc.in",
  mobile: "9999999999",
  role: "admin",
  department: "System Administration",
  designation: "System Administrator",
  sectionHead: "Director - IT",
  password: "admin@1",
  createdAt: new Date().toISOString(),
  isActive: true,
};
users.set(defaultAdmin.id, defaultAdmin);
adminCounter = 1;

// ===== USER FUNCTIONS =====

export function generateUserId(role: "admin" | "worker"): string {
  if (role === "admin") {
    adminCounter++;
    return `ADM-${String(adminCounter).padStart(4, "0")}`;
  } else {
    workerCounter++;
    return `WKR-${String(workerCounter).padStart(4, "0")}`;
  }
}

export function createUser(data: Omit<UserAccount, "id" | "createdAt" | "isActive">): UserAccount {
  const id = generateUserId(data.role);
  const user: UserAccount = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  users.set(id, user);
  return user;
}

export function findUserById(id: string): UserAccount | undefined {
  return users.get(id);
}

export function findUserByMobile(mobile: string): UserAccount | undefined {
  for (const user of users.values()) {
    if (user.mobile === mobile) return user;
  }
  return undefined;
}

export function findUserByEmail(email: string): UserAccount | undefined {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  return undefined;
}

export function findUserByMobileAndId(mobile: string, id: string): UserAccount | undefined {
  for (const user of users.values()) {
    if (user.mobile === mobile && user.id === id) return user;
  }
  return undefined;
}

export function getAllUsers(): UserProfile[] {
  return Array.from(users.values()).map(({ password, ...rest }) => rest);
}

export function getUsersByRole(role: "admin" | "worker"): UserProfile[] {
  return Array.from(users.values())
    .filter((u) => u.role === role)
    .map(({ password, ...rest }) => rest);
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const user = users.get(userId);
  if (!user) return false;
  user.password = newPassword;
  users.set(userId, user);
  return true;
}

// ===== SESSION STORE =====
const sessions: Map<string, SessionData> = new Map();
const MAX_GLOBAL_SESSIONS = 15;

export function createSession(userId: string, ip: string): SessionData | null {
  // Cleanup expired
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now > s.expiry) sessions.delete(id);
  }

  if (sessions.size >= MAX_GLOBAL_SESSIONS) return null;

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session: SessionData = {
    sessionId,
    userId,
    loginTime: now,
    expiry: now + 24 * 60 * 60 * 1000,
    ip,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): SessionData | undefined {
  const s = sessions.get(sessionId);
  if (s && Date.now() > s.expiry) {
    sessions.delete(sessionId);
    return undefined;
  }
  return s;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getActiveSessionCount(): number {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now > s.expiry) sessions.delete(id);
  }
  return sessions.size;
}
