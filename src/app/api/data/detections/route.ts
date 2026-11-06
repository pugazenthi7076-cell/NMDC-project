import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Detection } from "@/lib/models";
import { mockDetections } from "@/lib/mock-data";

export async function GET() {
  try {
    const db = await connectDB();
    if (db) {
      const detections = await Detection.find().sort({ timestamp: -1 });
      if (detections && detections.length > 0) return NextResponse.json(detections);
    }
  } catch (err) {
    console.warn("[Detections API] DB unavailable, returning mock detections:", err);
  }
  return NextResponse.json(mockDetections);
}
