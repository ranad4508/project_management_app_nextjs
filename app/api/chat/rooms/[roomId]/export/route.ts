import type { NextRequest } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";

const chatController = new ChatController();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  return chatController.exportRoomData(request, context);
}
