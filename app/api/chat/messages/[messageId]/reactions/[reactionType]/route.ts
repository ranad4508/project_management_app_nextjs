import { ChatController } from "@/src/controllers/chat.controller";
import Database from "@/src/config/database";

const chatController = new ChatController();

export async function DELETE(
  req: Request,
  { params }: { params: { messageId: string; reactionType: string } }
) {
  await Database.connect();
  return chatController.removeReaction(req as any, { params });
}
