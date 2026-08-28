import { NextRequest, NextResponse } from "next/server";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:5001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint = "full" } = body;

    const mlResponse = await fetch(`${ML_API_URL}/predict/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!mlResponse.ok) {
      const error = await mlResponse.text();
      return NextResponse.json({ error: "ML API error", details: error }, { status: 502 });
    }

    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "ML API unavailable. Make sure the Python ML server is running on port 5001." },
      { status: 503 }
    );
  }
}

export async function GET() {
  try {
    const mlResponse = await fetch(`${ML_API_URL}/health`);
    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "offline", models_loaded: 0 }, { status: 503 });
  }
}
