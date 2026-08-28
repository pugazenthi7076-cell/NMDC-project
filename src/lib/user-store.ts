// MongoDB-backed user store and session management
// Replaces the in-memory Map-based store with persistent MongoDB storage

import connectDB from "./mongodb";
import { User, Session, IUserDocument, ISessionDocument } from "./models";
import { UserProfile, SessionData } from "./types";

// ===== USER FUNCTIONS =====

export async function generateUserId(role: "admin" | "worker"): Promise<string> {
  await connectDB();
  const prefix = role === "admin" ? "ADM" : "WKR";
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
  const id = await generateUserId(data.role);
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

const MAX_GLOBAL_SESSIONS = 15;

export async function createSession(userId: string, ip: string): Promise<SessionData | null> {
  await connectDB();

  // Cleanup expired sessions
  await Session.deleteMany({ expiry: { $lt: Date.now() } });

  // Check global session limit
  const activeCount = await Session.countDocuments();
  if (activeCount >= MAX_GLOBAL_SESSIONS) return null;

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = await Session.create({
    sessionId,
    userId,
    loginTime: Date.now(),
    expiry: Date.now() + 24 * 60 * 60 * 1000,
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

export async function getActiveSessionCount(): Promise<number> {
  await connectDB();
  // Cleanup expired
  await Session.deleteMany({ expiry: { $lt: Date.now() } });
  return Session.countDocuments();
}
