import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByMobile, findUserByEmail } from "@/lib/user-store";

// POST - Register new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, mobile, role, department, designation, sectionHead, password } = body;

    // Validation
    if (!name || !email || !mobile || !role || !department || !designation || !sectionHead || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json({ error: "Invalid Indian mobile number" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!["admin", "worker"].includes(role)) {
      return NextResponse.json({ error: "Role must be 'admin' or 'worker'" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check duplicates
    if (findUserByMobile(mobile)) {
      return NextResponse.json({ error: "Mobile number already registered" }, { status: 409 });
    }

    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create user
    const user = createUser({
      name,
      email,
      mobile,
      role,
      department,
      designation,
      sectionHead,
      password,
    });

    const { password: _, ...userProfile } = user;

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: userProfile,
    });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
