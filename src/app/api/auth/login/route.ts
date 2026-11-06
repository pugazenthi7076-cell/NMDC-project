import { NextRequest, NextResponse } from "next/server";
import { findUserById, createSession, getActiveSessionCount, normalizeUserId } from "@/lib/user-store";

// POST - Login with User ID + Password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json({ error: "User ID and password are required" }, { status: 400 });
    }

    // Find user by normalized ID or mobile or email
    let user;
    try {
      user = await findUserById(userId);
    } catch (dbError) {
      console.error("[Login] Lookup error:", dbError);
    }

    if (!user) {
      return NextResponse.json(
        { error: `No account found with User ID "${userId}". Did you mean ADM-0001 or WKR-0001?` },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is deactivated. Contact administrator." },
        { status: 403 }
      );
    }

    // Verify password:
    // Allow either exact match OR default admin passwords (admin123 / admin@1) if unreset
    const isDefaultAdmin = normalizeUserId(user.id) === "ADM-0001";
    const isPasswordValid =
      user.password === password ||
      (isDefaultAdmin && (password === "admin123" || password === "admin@1") && (user.password === "admin@1" || user.password === "admin123"));

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid password. Please check your credentials or reset password." },
        { status: 401 }
      );
    }

    // Create session
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const session = await createSession(user.id, ip);

    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        name: user.name,
        role: user.role,
        department: user.department,
        designation: user.designation,
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
    return NextResponse.json({ activeSessions: 1, maxSessions: 50 });
  }
}
