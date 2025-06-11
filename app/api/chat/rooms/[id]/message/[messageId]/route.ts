// File: pages/api/chat/messages/[messageId].ts
import { ChatController } from "@/src/controllers/chat.controller";
import Database from "@/src/config/database";

const chatController = new ChatController();

export async function PUT(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  await Database.connect();
  return chatController.editMessage(req as any, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  await Database.connect();
  return chatController.deleteMessage(req as any, { params });
}
