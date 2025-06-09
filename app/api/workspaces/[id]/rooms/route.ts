import { ChatController } from "@/src/controllers/chat.controller"
import Database from "@/src/config/database"

const chatController = new ChatController()

export async function GET(req: Request, { params }: { params: { workspaceId: string } }) {
  await Database.connect()
  return chatController.getWorkspaceChatRooms(req as any, { params })
}
