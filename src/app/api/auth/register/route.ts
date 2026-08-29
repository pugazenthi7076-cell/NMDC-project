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
        { error: "All fields are required. Please fill in every field." },
        { status: 400 }
      );
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Invalid Indian mobile number. Must start with 6-9 and be 10 digits." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address format." },
        { status: 400 }
      );
    }

    if (!["admin", "worker"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'worker'." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Check duplicates with error handling
    try {
      const existingMobile = await findUserByMobile(mobile);
      if (existingMobile) {
        return NextResponse.json(
          { error: "Mobile number already registered. Try logging in instead." },
          { status: 409 }
        );
      }

      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already registered. Try logging in instead." },
          { status: 409 }
        );
      }
    } catch (dbError) {
      console.error("[Register] Database check error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed. Please try again in a moment." },
        { status: 503 }
      );
    }

    // Create user
    let user;
    try {
      user = await createUser({
        name,
        email,
        mobile,
        role,
        department,
        designation,
        sectionHead,
        password,
      });
    } catch (createError) {
      console.error("[Register] User creation error:", createError);
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Return user profile without password
    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      department: user.department,
      designation: user.designation,
      sectionHead: user.sectionHead,
      createdAt: user.createdAt,
      isActive: user.isActive,
    };

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: userProfile,
    });
  } catch (error) {
    console.error("[Register] Unexpected error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
