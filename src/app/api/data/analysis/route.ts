import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { AnalysisRecord } from "@/lib/models";
import { mockAnalysisData } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const filter: Record<string, string> = {};
    if (category && category !== "all") {
      filter.category = category;
    }

    const db = await connectDB();
    if (db) {
      const records = await AnalysisRecord.find(filter).sort({ timestamp: -1 });
      if (records && records.length > 0) return NextResponse.json(records);
    }

    // Fallback to mock analysis data
    const records = category && category !== "all"
      ? mockAnalysisData.filter((r) => r.category === category)
      : mockAnalysisData;
    return NextResponse.json(records);
  } catch (err) {
    console.warn("[Analysis API] DB unavailable, returning mock analysis data:", err);
    return NextResponse.json(mockAnalysisData);
  }
}
