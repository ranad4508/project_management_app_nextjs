// File: pages/api/chat/workspaces/[workspaceId]/general.ts
import { ChatController } from "@/src/controllers/chat.controller";
import Database from "@/src/config/database";

const chatController = new ChatController();

export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  await Database.connect();
  return chatController.ensureWorkspaceGeneralRoom(req as any, { params });
}
