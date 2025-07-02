import type { NextRequest, NextResponse } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";

const chatController = new ChatController();

export const GET = asyncHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    await Database.connect();

    // Add workspaceId to the request URL as a query parameter
    const resolvedParams = await params;
    const url = new URL(req.url);
    url.searchParams.set("workspaceId", resolvedParams.id);

    // Create a new request object with the modified URL
    const modifiedReq = {
      ...req,
      url: url.toString(),
    } as NextRequest;

    return chatController.getUserRooms(modifiedReq);
  }
);

export const POST = asyncHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
  ): Promise<NextResponse> => {
    await Database.connect();
    return chatController.createChatRoom(req);
  }
);
