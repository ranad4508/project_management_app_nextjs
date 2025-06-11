import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { User } from "@/src/models/user";
import Database from "@/src/config/database";
import { EncryptionUtils } from "@/src/utils/crypto.utils";
import { EmailService } from "@/src/services/email.service";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Database.connect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA is already enabled" },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `WorkSphere (${user.email})`,
      issuer: "WorkSphere",
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store temporary secret (not enabled yet)
    user.mfaSecret = secret.base32;
    await user.save();

    // Send MFA code via email
    const emailService = new EmailService();
    const mfaCode = EncryptionUtils.generateMfaCode();

    // Store the code temporarily for verification (in production, use Redis or similar)
    user.tempMfaCode = mfaCode;
    user.tempMfaCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    await emailService.sendMfaCode(user.email, mfaCode);

    return NextResponse.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        message:
          "MFA setup initiated. Please check your email for the verification code.",
      },
    });
  } catch (error) {
    console.error("Enable MFA error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
