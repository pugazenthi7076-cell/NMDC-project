import { NextRequest, NextResponse } from "next/server";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:5001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint = "full", ...payload } = body;

    const endpointMap: Record<string, string> = {
      full: "/predict/full",
      failure: "/predict/failure",
      health: "/predict/health",
      yolo: "/detect/yolo",
      opencv: "/analyze/image",
      vibration: "/analyze/vibration",
      temperature: "/analyze/temperature",
      "motor-current": "/analyze/motor-current",
      acoustic: "/analyze/acoustic",
      fusion: "/fusion/analyze",
      correlate: "/fusion/correlate",
      alerts: "/alerts/check",
      "full-analysis": "/analyze/full",
      // MQTT
      "mqtt-connect": "/mqtt/connect",
      "mqtt-publish": "/mqtt/publish",
      "mqtt-simulate": "/mqtt/simulate",
      // MinIO
      "minio-connect": "/minio/connect",
      "minio-upload-image": "/minio/upload/image",
      "minio-upload-detection": "/minio/upload/detection",
      "minio-upload-report": "/minio/upload/report",
    };

    const mlPath = endpointMap[endpoint] || `/predict/${endpoint}`;

    const mlResponse = await fetch(`${ML_API_URL}${mlPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    const mlResponse = await fetch(`${ML_API_URL}/models`);
    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch {
    try {
      const mlResponse = await fetch(`${ML_API_URL}/health`);
      const data = await mlResponse.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ status: "offline", models_loaded: 0 }, { status: 503 });
    }
  }
}
