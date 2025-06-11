// Create a separate MFA verification endpoint
// app/api/auth/verify-mfa/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/src/services/auth.service";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const { email, password, mfaCode } = await request.json();

    const result = await authService.login({
      email,
      password,
      mfaCode,
    });

    if (result.requiresMfa) {
      return NextResponse.json({ requiresMfa: true }, { status: 200 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
