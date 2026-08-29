// MongoDB-backed user store and session management
// Replaces the in-memory Map-based store with persistent MongoDB storage
// Includes auto-seeding of default admin and fallback for Vercel

import connectDB from "./mongodb";
import { User, Session, IUserDocument, ISessionDocument } from "./models";
import { UserProfile, SessionData } from "./types";

// ===== AUTO-SEED DEFAULT ADMIN =====

let seeded = false;

async function ensureDefaultAdmin(): Promise<void> {
  if (seeded) return;

  try {
    await connectDB();
    const adminExists = await User.findOne({ id: "ADM-0001" });
    if (!adminExists) {
      await User.create({
        id: "ADM-0001",
        name: "Super Admin",
        email: "admin@nmdc.in",
        mobile: "9000000001",
        role: "admin",
        department: "System Administration",
        designation: "System Administrator",
        sectionHead: "Director",
        password: "admin@1",
        createdAt: new Date().toISOString(),
        isActive: true,
      });
      console.log("[UserStore] Seeded default admin: ADM-0001");
    }
    seeded = true;
  } catch (e) {
    console.warn("[UserStore] Could not seed default admin:", e);
  }
}

// ===== USER FUNCTIONS =====

export async function generateUserId(role: "admin" | "worker"): Promise<string> {
  await connectDB();
  const prefix = role === "admin" ? "ADM" : "WKR";

  // Use atomic counter to avoid race conditions
  const count = await User.countDocuments({ role });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function createUser(data: {
  name: string;
  email: string;
  mobile: string;
  role: "admin" | "worker";
  department: string;
  designation: string;
  sectionHead: string;
  password: string;
}): Promise<IUserDocument> {
  await connectDB();
  await ensureDefaultAdmin();

  const id = await generateUserId(data.role);

  // Check if this exact ID already exists (race condition guard)
  const existing = await User.findOne({ id });
  if (existing) {
    // Try next ID
    const count = await User.countDocuments({ role: data.role });
    const retryId = `${data.role === "admin" ? "ADM" : "WKR"}-${String(count + 1).padStart(4, "0")}`;
    const user = await User.create({
      ...data,
      id: retryId,
      createdAt: new Date().toISOString(),
      isActive: true,
    });
    return user;
  }

  const user = await User.create({
    ...data,
    id,
    createdAt: new Date().toISOString(),
    isActive: true,
  });
  return user;
}

export async function findUserById(id: string): Promise<IUserDocument | null> {
  await connectDB();
  await ensureDefaultAdmin();
  return User.findOne({ id });
}

export async function findUserByMobile(mobile: string): Promise<IUserDocument | null> {
  await connectDB();
  return User.findOne({ mobile });
}

export async function findUserByEmail(email: string): Promise<IUserDocument | null> {
  await connectDB();
  return User.findOne({ email });
}

export async function findUserByMobileAndId(mobile: string, id: string): Promise<IUserDocument | null> {
  await connectDB();
  return User.findOne({ mobile, id });
}

export async function getAllUsers(): Promise<UserProfile[]> {
  await connectDB();
  const users = await User.find({}, { password: 0 });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    role: u.role,
    department: u.department,
    designation: u.designation,
    sectionHead: u.sectionHead,
    createdAt: u.createdAt,
    isActive: u.isActive,
  }));
}

export async function getUsersByRole(role: "admin" | "worker"): Promise<UserProfile[]> {
  await connectDB();
  const users = await User.find({ role }, { password: 0 });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    role: u.role,
    department: u.department,
    designation: u.designation,
    sectionHead: u.sectionHead,
    createdAt: u.createdAt,
    isActive: u.isActive,
  }));
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  await connectDB();
  const result = await User.updateOne({ id: userId }, { password: newPassword });
  return result.modifiedCount > 0;
}

// ===== SESSION STORE =====

// Max sessions per user (not global)
const MAX_SESSIONS_PER_USER = 5;
// Max global sessions across all users
const MAX_GLOBAL_SESSIONS = 50;

export async function createSession(userId: string, ip: string): Promise<SessionData | null> {
  await connectDB();

  // Cleanup expired sessions first
  await Session.deleteMany({ expiry: { $lt: Date.now() } });

  // Check global session limit
  const globalCount = await Session.countDocuments();
  if (globalCount >= MAX_GLOBAL_SESSIONS) {
    // Try to clean up oldest sessions
    const oldest = await Session.find().sort({ loginTime: 1 }).limit(5);
    for (const s of oldest) {
      await Session.deleteOne({ sessionId: s.sessionId });
    }
  }

  // Check per-user session limit
  const userSessions = await Session.countDocuments({ userId });
  if (userSessions >= MAX_SESSIONS_PER_USER) {
    // Delete oldest session for this user
    const oldestUserSession = await Session.findOne({ userId }).sort({ loginTime: 1 });
    if (oldestUserSession) {
      await Session.deleteOne({ sessionId: oldestUserSession.sessionId });
    }
  }

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = await Session.create({
    sessionId,
    userId,
    loginTime: Date.now(),
    expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    ip,
  });

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    loginTime: session.loginTime,
    expiry: session.expiry,
    ip: session.ip,
  };
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  await connectDB();
  const s = await Session.findOne({ sessionId });
  if (!s) return null;
  if (Date.now() > s.expiry) {
    await Session.deleteOne({ sessionId });
    return null;
  }
  return {
    sessionId: s.sessionId,
    userId: s.userId,
    loginTime: s.loginTime,
    expiry: s.expiry,
    ip: s.ip,
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await connectDB();
  await Session.deleteOne({ sessionId });
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await connectDB();
  await Session.deleteMany({ userId });
}

export async function getActiveSessionCount(): Promise<number> {
  await connectDB();
  // Cleanup expired
  await Session.deleteMany({ expiry: { $lt: Date.now() } });
  return Session.countDocuments();
}

export async function getUserSessionCount(userId: string): Promise<number> {
  await connectDB();
  return Session.countDocuments({ userId });
}
