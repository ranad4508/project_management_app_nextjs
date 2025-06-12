import type { NextRequest } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";

const chatController = new ChatController();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  return chatController.getRoomById(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  return chatController.updateRoom(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  return chatController.deleteRoom(request, context);
}
