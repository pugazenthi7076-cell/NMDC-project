import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Prediction } from "@/lib/models";
import { mockPredictions } from "@/lib/mock-data";

export async function GET() {
  try {
    const db = await connectDB();
    if (db) {
      const predictions = await Prediction.find().sort({ priority: 1 });
      if (predictions && predictions.length > 0) return NextResponse.json(predictions);
    }
  } catch (err) {
    console.warn("[Predictions API] DB unavailable, returning mock predictions:", err);
  }
  return NextResponse.json(mockPredictions);
}
