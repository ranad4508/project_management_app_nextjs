import type { NextRequest } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";

const chatController = new ChatController();

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ messageId: string; reactionId: string }> }
) {
  return chatController.removeReaction(request, context);
}
