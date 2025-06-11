// File: pages/api/chat/messages/[messageId]/read.ts
import { ChatController } from "@/src/controllers/chat.controller";
import Database from "@/src/config/database";

const chatController = new ChatController();

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  await Database.connect();
  return chatController.markMessageAsRead(req as any, { params });
}
