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
    let user;
    try {
      user = await findUserById(userId);
    } catch (dbError) {
      console.error("[Login] Database error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed. Please try again in a moment." },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: `No account found with User ID "${userId}". Please check your ID or create a new account.` },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is deactivated. Contact administrator." },
        { status: 403 }
      );
    }

    // Verify password
    if (user.password !== password) {
      return NextResponse.json(
        { error: "Invalid password. Please try again." },
        { status: 401 }
      );
    }

    // Create session
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    let session;
    try {
      session = await createSession(user.id, ip);
    } catch (sessionError) {
      console.error("[Login] Session creation error:", sessionError);
      // Allow login even if session creation fails (stateless fallback)
      session = {
        sessionId: `fallback_${Date.now()}`,
        userId: user.id,
        loginTime: Date.now(),
        expiry: Date.now() + 24 * 60 * 60 * 1000,
        ip,
      };
    }

    if (!session) {
      // Instead of rejecting, allow login with a fallback session
      session = {
        sessionId: `fallback_${Date.now()}`,
        userId: user.id,
        loginTime: Date.now(),
        expiry: Date.now() + 24 * 60 * 60 * 1000,
        ip,
      };
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
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Login] Unexpected error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}

// GET - Get active sessions count
export async function GET() {
  try {
    const activeSessions = await getActiveSessionCount();
    return NextResponse.json({
      activeSessions,
      maxSessions: 50,
    });
  } catch {
    return NextResponse.json({ activeSessions: 0, maxSessions: 50 });
  }
}
