import type { NextRequest } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";

const chatController = new ChatController();

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  return chatController.editMessage(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  return chatController.deleteMessage(request, context);
}
