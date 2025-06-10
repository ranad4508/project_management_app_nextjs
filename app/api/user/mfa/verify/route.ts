import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { User } from "@/src/models/user";
import Database from "@/src/config/database";
import speakeasy from "speakeasy";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    await Database.connect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.mfaSecret) {
      return NextResponse.json(
        { error: "MFA setup not initiated" },
        { status: 400 }
      );
    }

    // Verify the code (check both TOTP and email code)
    let isValid = false;

    // Check TOTP code
    if (code.length === 6 && /^\d+$/.test(code)) {
      isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: "base32",
        token: code,
        window: 2,
      });
    }

    // If TOTP fails, check email code
    if (!isValid && user.tempMfaCode && user.tempMfaCodeExpiry) {
      if (new Date() < user.tempMfaCodeExpiry && user.tempMfaCode === code) {
        isValid = true;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Enable MFA
    user.mfaEnabled = true;
    user.tempMfaCode = undefined;
    user.tempMfaCodeExpiry = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "MFA enabled successfully",
    });
  } catch (error) {
    console.error("Verify MFA error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
