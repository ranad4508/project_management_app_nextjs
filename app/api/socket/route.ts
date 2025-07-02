import { NextRequest, NextResponse } from "next/server";
import { getSocketIO } from "@/lib/socket-server";

export async function GET(req: NextRequest) {
  try {
    // Initialize Socket.IO server
    const { io } = getSocketIO();

    if (!io) {
      return NextResponse.json(
        { success: false, message: "Socket.IO server not initialized" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Socket.IO server is running",
      path: "/api/socket",
    });
  } catch (error) {
    console.error("Socket.IO initialization error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to initialize Socket.IO server" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { io } = getSocketIO();

    if (!io) {
      return NextResponse.json(
        { success: false, message: "Socket.IO server not initialized" },
        { status: 500 }
      );
    }

    // Handle different socket events
    const { event, userId, data } = body;

    switch (event) {
      case "notification":
        if (userId && data) {
          (io as any).emitNotification(userId, data);
          return NextResponse.json({
            success: true,
            message: "Notification sent successfully",
          });
        }
        break;

      case "activity":
        if (userId && data) {
          (io as any).emitActivity(userId, data);
          return NextResponse.json({
            success: true,
            message: "Activity sent successfully",
          });
        }
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Unknown event type" },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { success: false, message: "Missing required parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Socket.IO API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
