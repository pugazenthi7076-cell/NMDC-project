// MongoDB-backed user store and session management with resilient In-Memory Fallback for Vercel
import connectDB from "./mongodb";
import { User, Session, IUserDocument } from "./models";
import { UserProfile, SessionData } from "./types";

export interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: "admin" | "worker";
  department: string;
  designation: string;
  sectionHead: string;
  password: string;
  createdAt: string;
  isActive: boolean;
}

declare global {
  var memoryUserStore: Map<string, InMemoryUser> | undefined;
  var memorySessionStore: Map<string, SessionData> | undefined;
}

// Normalize user IDs: e.g. ADMIN-001, admin-001, ADMIN -> ADM-0001
export function normalizeUserId(rawId: string): string {
  if (!rawId) return "";
  const trimmed = rawId.trim().toUpperCase();

  if (/^ADMIN[-_]?0*1$/i.test(trimmed) || /^ADM[-_]?0*1$/i.test(trimmed) || trimmed === "ADMIN") {
    return "ADM-0001";
  }
  if (/^WORKER[-_]?0*1$/i.test(trimmed) || /^WKR[-_]?0*1$/i.test(trimmed) || trimmed === "WORKER") {
    return "WKR-0001";
  }
  if (/^WORKER[-_]?0*2$/i.test(trimmed) || /^WKR[-_]?0*2$/i.test(trimmed)) {
    return "WKR-0002";
  }

  const match = trimmed.match(/^([A-Z]+)[-_]?(\d+)$/);
  if (match) {
    const prefix = match[1] === "ADMIN" ? "ADM" : match[1] === "WORKER" ? "WKR" : match[1];
    const num = match[2].padStart(4, "0");
    return `${prefix}-${num}`;
  }

  return trimmed;
}

function getMemoryStore(): Map<string, InMemoryUser> {
  if (!global.memoryUserStore) {
    const store = new Map<string, InMemoryUser>();
    store.set("ADM-0001", {
      id: "ADM-0001",
      name: "Super Admin",
      email: "admin@nmdc.in",
      mobile: "9000000001",
      role: "admin",
      department: "System Administration",
      designation: "System Administrator",
      sectionHead: "Director",
      password: "admin@1", // Also accepts admin123
      createdAt: new Date().toISOString(),
      isActive: true,
    });
    store.set("WKR-0001", {
      id: "WKR-0001",
      name: "Rajesh Kumar",
      email: "rajesh@nmdc.in",
      mobile: "9000000002",
      role: "worker",
      department: "Conveyor Maintenance",
      designation: "Lead Inspection Technician",
      sectionHead: "Super Admin",
      password: "worker123",
      createdAt: new Date().toISOString(),
      isActive: true,
    });
    store.set("WKR-0002", {
      id: "WKR-0002",
      name: "Suresh Patel",
      email: "suresh@nmdc.in",
      mobile: "9000000003",
      role: "worker",
      department: "Ore Crushing Plant",
      designation: "Belt Operator",
      sectionHead: "Super Admin",
      password: "worker123",
      createdAt: new Date().toISOString(),
      isActive: true,
    });
    global.memoryUserStore = store;
  }
  return global.memoryUserStore;
}

function getMemorySessionStore(): Map<string, SessionData> {
  if (!global.memorySessionStore) {
    global.memorySessionStore = new Map<string, SessionData>();
  }
  return global.memorySessionStore;
}

let seeded = false;
async function ensureDefaultAdmin(): Promise<void> {
  if (seeded) return;
  try {
    const db = await connectDB();
    if (db) {
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
        console.log("[UserStore] Seeded default admin in MongoDB: ADM-0001");
      }
      seeded = true;
    }
  } catch (e) {
    console.warn("[UserStore] Could not seed default admin in MongoDB:", e);
  }
}

export async function generateUserId(role: "admin" | "worker"): Promise<string> {
  try {
    const db = await connectDB();
    if (db) {
      const count = await User.countDocuments({ role });
      const prefix = role === "admin" ? "ADM" : "WKR";
      return `${prefix}-${String(count + 1).padStart(4, "0")}`;
    }
  } catch (e) {
    console.warn("[UserStore] DB countDocuments failed, using memory store count:", e);
  }

  const memoryStore = getMemoryStore();
  const count = Array.from(memoryStore.values()).filter((u) => u.role === role).length;
  const prefix = role === "admin" ? "ADM" : "WKR";
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
}): Promise<IUserDocument | InMemoryUser> {
  const id = await generateUserId(data.role);

  try {
    const db = await connectDB();
    if (db) {
      await ensureDefaultAdmin();
      const existing = await User.findOne({ id });
      const finalId = existing ? `${data.role === "admin" ? "ADM" : "WKR"}-${Date.now().toString().slice(-4)}` : id;
      const user = await User.create({
        ...data,
        id: finalId,
        createdAt: new Date().toISOString(),
        isActive: true,
      });

      // Also cache in memory
      getMemoryStore().set(finalId, {
        ...data,
        id: finalId,
        createdAt: user.createdAt,
        isActive: true,
      });

      return user;
    }
  } catch (e) {
    console.warn("[UserStore] DB createUser failed, creating in memory store:", e);
  }

  // Fallback creation
  const memoryUser: InMemoryUser = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  getMemoryStore().set(id, memoryUser);
  return memoryUser;
}

export async function findUserById(rawId: string): Promise<IUserDocument | InMemoryUser | null> {
  if (!rawId) return null;
  const normId = normalizeUserId(rawId);

  try {
    const db = await connectDB();
    if (db) {
      await ensureDefaultAdmin();
      const user = await User.findOne({
        $or: [
          { id: normId },
          { id: rawId },
          { id: new RegExp(`^${normId}$`, "i") },
          { mobile: rawId },
          { email: rawId.toLowerCase() },
        ],
      });
      if (user) return user;
    }
  } catch (e) {
    console.warn("[UserStore] DB findUserById failed, checking memory fallback:", e);
  }

  // Memory store fallback
  const memoryStore = getMemoryStore();
  if (memoryStore.has(normId)) return memoryStore.get(normId)!;
  if (memoryStore.has(rawId)) return memoryStore.get(rawId)!;

  for (const [id, user] of memoryStore.entries()) {
    if (
      normalizeUserId(id) === normId ||
      user.mobile === rawId ||
      user.email.toLowerCase() === rawId.toLowerCase()
    ) {
      return user;
    }
  }

  return null;
}

export async function findUserByMobile(mobile: string): Promise<IUserDocument | InMemoryUser | null> {
  try {
    const db = await connectDB();
    if (db) {
      const u = await User.findOne({ mobile });
      if (u) return u;
    }
  } catch (e) {
    console.warn("[UserStore] DB findUserByMobile failed:", e);
  }

  const memoryStore = getMemoryStore();
  for (const user of memoryStore.values()) {
    if (user.mobile === mobile) return user;
  }
  return null;
}

export async function findUserByEmail(email: string): Promise<IUserDocument | InMemoryUser | null> {
  try {
    const db = await connectDB();
    if (db) {
      const u = await User.findOne({ email: email.toLowerCase() });
      if (u) return u;
    }
  } catch (e) {
    console.warn("[UserStore] DB findUserByEmail failed:", e);
  }

  const memoryStore = getMemoryStore();
  for (const user of memoryStore.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) return user;
  }
  return null;
}

export async function updateUserPassword(rawUserId: string, newPassword: string): Promise<boolean> {
  const normId = normalizeUserId(rawUserId);
  let updatedInDb = false;

  try {
    const db = await connectDB();
    if (db) {
      const res = await User.updateOne(
        { $or: [{ id: normId }, { id: rawUserId }, { id: new RegExp(`^${normId}$`, "i") }] },
        { password: newPassword }
      );
      if (res.modifiedCount > 0 || res.matchedCount > 0) {
        updatedInDb = true;
      }
    }
  } catch (e) {
    console.warn("[UserStore] DB updateUserPassword failed, updating memory store:", e);
  }

  const memoryStore = getMemoryStore();
  let user = memoryStore.get(normId) || memoryStore.get(rawUserId);
  if (!user) {
    for (const u of memoryStore.values()) {
      if (normalizeUserId(u.id) === normId) {
        user = u;
        break;
      }
    }
  }

  if (user) {
    user.password = newPassword;
    memoryStore.set(user.id, user);
    return true;
  }

  return updatedInDb;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const db = await connectDB();
    if (db) {
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
  } catch (e) {
    console.warn("[UserStore] DB getAllUsers failed, using memory store:", e);
  }

  const memoryStore = getMemoryStore();
  return Array.from(memoryStore.values()).map((u) => ({
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
  const all = await getAllUsers();
  return all.filter((u) => u.role === role);
}

// ===== SESSION STORE =====
export async function createSession(userId: string, ip: string): Promise<SessionData> {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionData: SessionData = {
    sessionId,
    userId,
    loginTime: Date.now(),
    expiry: Date.now() + 24 * 60 * 60 * 1000,
    ip,
  };

  try {
    const db = await connectDB();
    if (db) {
      await Session.create(sessionData);
    }
  } catch (e) {
    console.warn("[UserStore] DB createSession failed, continuing with memory session:", e);
  }

  getMemorySessionStore().set(sessionId, sessionData);
  return sessionData;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const memoryStore = getMemorySessionStore();
  const mem = memoryStore.get(sessionId);
  if (mem && Date.now() <= mem.expiry) {
    return mem;
  }

  try {
    const db = await connectDB();
    if (db) {
      const s = await Session.findOne({ sessionId });
      if (s && Date.now() <= s.expiry) {
        return {
          sessionId: s.sessionId,
          userId: s.userId,
          loginTime: s.loginTime,
          expiry: s.expiry,
          ip: s.ip,
        };
      }
    }
  } catch (e) {
    console.warn("[UserStore] DB getSession failed:", e);
  }

  return null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  getMemorySessionStore().delete(sessionId);
  try {
    const db = await connectDB();
    if (db) {
      await Session.deleteOne({ sessionId });
    }
  } catch (e) {
    console.warn("[UserStore] DB deleteSession failed:", e);
  }
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const memoryStore = getMemorySessionStore();
  for (const [id, s] of memoryStore.entries()) {
    if (s.userId === userId) {
      memoryStore.delete(id);
    }
  }

  try {
    const db = await connectDB();
    if (db) {
      await Session.deleteMany({ userId });
    }
  } catch (e) {
    console.warn("[UserStore] DB deleteUserSessions failed:", e);
  }
}

export async function getActiveSessionCount(): Promise<number> {
  const memoryStore = getMemorySessionStore();
  // Cleanup expired
  const now = Date.now();
  for (const [id, s] of memoryStore.entries()) {
    if (s.expiry < now) memoryStore.delete(id);
  }

  try {
    const db = await connectDB();
    if (db) {
      return Session.countDocuments({ expiry: { $gte: now } });
    }
  } catch (e) {
    console.warn("[UserStore] DB getActiveSessionCount failed:", e);
  }

  return memoryStore.size;
}

export async function getUserSessionCount(userId: string): Promise<number> {
  const memoryStore = getMemorySessionStore();
  let count = 0;
  const now = Date.now();
  for (const s of memoryStore.values()) {
    if (s.userId === userId && s.expiry >= now) count++;
  }
  return count;
}
