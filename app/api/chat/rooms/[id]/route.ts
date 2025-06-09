import { ChatController } from "@/src/controllers/chat.controller"
import Database from "@/src/config/database"

const chatController = new ChatController()

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await Database.connect()
  return chatController.getChatRoomById(req as any, { params })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await Database.connect()
  return chatController.updateChatRoom(req as any, { params })
}
