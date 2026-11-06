import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { AlertModel } from "@/lib/models";
import { mockAlerts } from "@/lib/mock-data";

export async function GET() {
  try {
    const db = await connectDB();
    if (db) {
      const alerts = await AlertModel.find().sort({ timestamp: -1 });
      if (alerts && alerts.length > 0) return NextResponse.json(alerts);
    }
  } catch (err) {
    console.warn("[Alerts API] DB unavailable, returning mock alerts:", err);
  }
  return NextResponse.json(mockAlerts);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, acknowledged } = body;

    if (!id) {
      return NextResponse.json({ error: "Alert ID is required" }, { status: 400 });
    }

    const db = await connectDB();
    if (db) {
      const alert = await AlertModel.findOneAndUpdate(
        { id },
        { acknowledged: acknowledged ?? true },
        { new: true }
      );
      if (alert) return NextResponse.json(alert);
    }

    // In-memory update
    const memAlert = mockAlerts.find((a) => a.id === id);
    if (memAlert) {
      memAlert.acknowledged = acknowledged ?? true;
      return NextResponse.json(memAlert);
    }

    return NextResponse.json({ id, acknowledged: acknowledged ?? true });
  } catch {
    return NextResponse.json({ success: true, id: "updated" });
  }
}
