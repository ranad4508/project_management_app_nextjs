import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ChatController } from "@/src/controllers/chat.controller";
import Database from "@/src/config/database";
import { authOptions } from "@/lib/auth"; // Adjust path if needed

const chatController = new ChatController();

export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await Database.connect();

    // Get session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { password } = await req.json();
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Invalid or missing password" },
        { status: 400 }
      );
    }

    // Initialize encryption
    const result = await chatController.initializeUserEncryption({
      body: { password, userId: session.user.id },
      method: "POST",
      headers: req.headers,
    } as any);

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Encryption initialized successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error initializing encryption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    // Optional: Disconnect database if needed
    // await Database.disconnect();
  }
}
