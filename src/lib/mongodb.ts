import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastFailure: number;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null, lastFailure: 0 };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose | null> {
  // If running in production / Vercel without a configured MONGODB_URI,
  // do not attempt to connect to localhost:27017 (avoids 5s serverless timeout)
  if (!MONGODB_URI) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      return null;
    }
  }

  const uri = MONGODB_URI || "mongodb://localhost:27017/nmdc-analyzer";

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Avoid repetitive blocking if recent connection failed
  if (Date.now() - cached.lastFailure < 15000) {
    return null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log("[MongoDB] Connected successfully");
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e: unknown) {
    cached.promise = null;
    cached.lastFailure = Date.now();
    const errMsg = e instanceof Error ? e.message : String(e);
    console.warn("[MongoDB] Connection unavailable, operating in fallback mode:", errMsg);
    return null;
  }
}

export async function isMongoDBAvailable(): Promise<boolean> {
  try {
    const conn = await connectDB();
    return !!conn && mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}

export default connectDB;
