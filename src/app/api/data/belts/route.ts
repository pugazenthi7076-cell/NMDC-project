import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Belt } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const belts = await Belt.find().sort({ id: 1 });
    return NextResponse.json(belts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch belts" }, { status: 500 });
  }
}
