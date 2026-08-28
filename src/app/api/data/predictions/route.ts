import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Prediction } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const predictions = await Prediction.find().sort({ priority: 1 });
    return NextResponse.json(predictions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}
