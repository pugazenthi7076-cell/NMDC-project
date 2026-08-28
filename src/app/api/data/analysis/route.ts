import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { AnalysisRecord } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const filter: Record<string, string> = {};
    if (category && category !== "all") {
      filter.category = category;
    }

    const records = await AnalysisRecord.find(filter).sort({ timestamp: -1 });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Failed to fetch analysis records" }, { status: 500 });
  }
}
