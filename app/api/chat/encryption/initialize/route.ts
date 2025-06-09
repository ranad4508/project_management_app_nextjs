import { ChatController } from "@/src/controllers/chat.controller"
import Database from "@/src/config/database"

const chatController = new ChatController()

export async function POST(req: Request) {
  await Database.connect()
  return chatController.initializeUserEncryption(req as any)
}
