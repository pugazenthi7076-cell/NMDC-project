import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nmdc-analyzer";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend NodeJS global with our cache
declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is unreachable
      connectTimeoutMS: 5000,
    };

    console.log(`[MongoDB] Connecting to ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log("[MongoDB] Connected successfully");
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("[MongoDB] Connection failed:", e);
    throw e;
  }

  return cached.conn;
}

// Check if MongoDB is available (for health checks)
export async function isMongoDBAvailable(): Promise<boolean> {
  try {
    await connectDB();
    return true;
  } catch {
    return false;
  }
}

export default connectDB;
