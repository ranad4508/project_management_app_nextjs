import type { NextRequest, NextResponse } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";

const chatController = new ChatController();

export const GET = asyncHandler(
  async (
    req: NextRequest,
    { params }: { params: { workspaceId: string } }
  ): Promise<NextResponse> => {
    await Database.connect();
    return chatController.getWorkspaceChatRooms(req, { params });
  }
);

export const POST = asyncHandler(
  async (
    req: NextRequest,
    { params }: { params: { workspaceId: string } }
  ): Promise<NextResponse> => {
    await Database.connect();
    return chatController.createChatRoom(req);
  }
);
