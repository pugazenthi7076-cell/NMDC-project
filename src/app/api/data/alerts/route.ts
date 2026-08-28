import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { AlertModel } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const alerts = await AlertModel.find().sort({ timestamp: -1 });
    return NextResponse.json(alerts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, acknowledged } = body;

    if (!id) {
      return NextResponse.json({ error: "Alert ID is required" }, { status: 400 });
    }

    const alert = await AlertModel.findOneAndUpdate(
      { id },
      { acknowledged: acknowledged ?? true },
      { new: true }
    );

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json(alert);
  } catch {
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
