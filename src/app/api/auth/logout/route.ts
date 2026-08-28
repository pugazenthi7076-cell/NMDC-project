import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/user-store";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("nmdc_session");

  if (sessionCookie) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
      deleteSession(decoded.sessionId);
    } catch {
      // ignore
    }
  }

  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  response.cookies.delete("nmdc_session");
  return response;
}
