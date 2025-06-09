import { ChatController } from "@/src/controllers/chat.controller"
import Database from "@/src/config/database"

const chatController = new ChatController()

export async function POST(req: Request) {
  await Database.connect()
  return chatController.createChatRoom(req as any)
}

export async function GET(req: Request) {
  await Database.connect()
  return chatController.getUserChatRooms(req as any)
}
