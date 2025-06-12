import type { NextRequest } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";

const chatController = new ChatController();

export async function GET(request: NextRequest) {
  return chatController.getUserRooms(request);
}

export async function POST(request: NextRequest) {
  return chatController.createRoom(request);
}
