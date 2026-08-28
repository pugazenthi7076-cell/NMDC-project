import { NextRequest, NextResponse } from "next/server";
import { findUserById, createSession, getActiveSessionCount } from "@/lib/user-store";

// POST - Login with User ID + Password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json({ error: "User ID and password are required" }, { status: 400 });
    }

    // Find user by ID
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "No account found with this User ID" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is deactivated. Contact administrator." }, { status: 403 });
    }

    // Verify password
    if (user.password !== password) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Create session
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const session = await createSession(user.id, ip);

    if (!session) {
      return NextResponse.json({ error: "Maximum concurrent sessions reached" }, { status: 429 });
    }

    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        name: user.name,
        role: user.role,
        department: user.department,
        sessionId: session.sessionId,
        loginTime: session.loginTime,
        expiry: session.expiry,
      })
    ).toString("base64");

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        department: user.department,
        designation: user.designation,
      },
    });

    response.cookies.set("nmdc_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

// GET - Get active sessions count
export async function GET() {
  const activeSessions = await getActiveSessionCount();
  return NextResponse.json({
    activeSessions,
    maxSessions: 15,
  });
}
