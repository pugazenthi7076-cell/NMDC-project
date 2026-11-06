import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Belt } from "@/lib/models";
import { mockBelts } from "@/lib/mock-data";

export async function GET() {
  try {
    const db = await connectDB();
    if (db) {
      const belts = await Belt.find().sort({ id: 1 });
      if (belts && belts.length > 0) return NextResponse.json(belts);
    }
  } catch (err) {
    console.warn("[Belts API] DB unavailable, returning mock data:", err);
  }
  return NextResponse.json(mockBelts);
}
