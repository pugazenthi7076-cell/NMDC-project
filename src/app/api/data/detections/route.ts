import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Detection } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const detections = await Detection.find().sort({ timestamp: -1 });
    return NextResponse.json(detections);
  } catch {
    return NextResponse.json({ error: "Failed to fetch detections" }, { status: 500 });
  }
}
