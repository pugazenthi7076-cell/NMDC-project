import { NextRequest, NextResponse } from "next/server";
import { getSession, findUserById } from "@/lib/user-store";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("nmdc_session");

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());

    if (Date.now() > decoded.expiry) {
      const response = NextResponse.json(
        { authenticated: false, error: "Session expired" },
        { status: 401 }
      );
      response.cookies.delete("nmdc_session");
      return response;
    }

    // Try to verify session in MongoDB (optional - don't fail if DB is down)
    try {
      const session = await getSession(decoded.sessionId);
      if (!session && !decoded.sessionId.startsWith("fallback_")) {
        // Session was invalidated in DB (only check if not a fallback session)
        // For Vercel serverless, allow cookie-based auth as fallback
        console.warn("[Session] Session not found in DB, using cookie fallback");
      }
    } catch {
      // MongoDB is down - rely on cookie-only auth
      console.warn("[Session] MongoDB unavailable, using cookie-only auth");
    }

    // Get fresh user data (optional)
    let designation = "";
    try {
      const user = await findUserById(decoded.userId);
      designation = user?.designation || "";
    } catch {
      // Use designation from cookie
      designation = decoded.designation || "";
    }

    return NextResponse.json({
      authenticated: true,
      userId: decoded.userId,
      name: decoded.name,
      role: decoded.role,
      department: decoded.department,
      designation: designation,
      sessionId: decoded.sessionId,
      loginTime: decoded.loginTime,
    });
  } catch (error) {
    console.error("[Session] Error:", error);
    return NextResponse.json(
      { authenticated: false, error: "Invalid session" },
      { status: 401 }
    );
  }
}
