import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ChatController } from "@/src/controllers/chat.controller";
import Database from "@/src/config/database";
import { authOptions } from "@/lib/auth";

const chatController = new ChatController();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    await Database.connect();

    // Get session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get session key from headers
    const sessionKey = req.headers.get("x-session-key");
    if (!sessionKey) {
      return NextResponse.json(
        { error: "Missing session key" },
        { status: 401 }
      );
    }

    // Await params to get workspaceId
    const { workspaceId } = await params;

    // Fetch workspace chat rooms
    const result = await chatController.getWorkspaceChatRooms(req, {
      params: { workspaceId },
      userId: session.user.id,
      sessionKey,
    } as any);

    return NextResponse.json({ rooms: result });
  } catch (error: any) {
    console.error("Error fetching workspace rooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
