import type { NextRequest } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";

const chatController = new ChatController();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  return chatController.addReaction(request, context);
}
