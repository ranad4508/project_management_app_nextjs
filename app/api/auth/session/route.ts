import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Always return a proper JSON response
    return NextResponse.json(session || null, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Session API error:", error);

    // Return proper JSON error response
    return NextResponse.json(
      { error: "Failed to get session" },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
