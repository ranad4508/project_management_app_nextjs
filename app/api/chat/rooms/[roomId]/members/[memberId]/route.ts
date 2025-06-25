import type { NextRequest } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";

const chatController = new ChatController();

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ roomId: string; memberId: string }> }
) {
  return chatController.removeMemberFromRoom(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ roomId: string; memberId: string }> }
) {
  return chatController.changeMemberRole(request, context);
}
