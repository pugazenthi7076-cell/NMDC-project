import { NextRequest, NextResponse } from "next/server";
import { findUserById, updateUserPassword } from "@/lib/user-store";

// POST - Reset password directly
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "User ID and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found with this ID" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is deactivated. Contact administrator." }, { status: 403 });
    }

    const updated = await updateUserPassword(userId, newPassword);
    if (!updated) {
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch {
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
