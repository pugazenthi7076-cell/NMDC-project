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

    // Verify session still exists
    const session = getSession(decoded.sessionId);
    if (!session) {
      const response = NextResponse.json(
        { authenticated: false, error: "Session invalidated" },
        { status: 401 }
      );
      response.cookies.delete("nmdc_session");
      return response;
    }

    // Get fresh user data
    const user = findUserById(decoded.userId);

    return NextResponse.json({
      authenticated: true,
      userId: decoded.userId,
      name: decoded.name,
      role: decoded.role,
      department: decoded.department,
      designation: user?.designation || "",
      sessionId: decoded.sessionId,
      loginTime: decoded.loginTime,
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, error: "Invalid session" },
      { status: 401 }
    );
  }
}
