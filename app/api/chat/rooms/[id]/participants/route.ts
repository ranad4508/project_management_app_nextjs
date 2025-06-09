import { ChatController } from "@/src/controllers/chat.controller"
import Database from "@/src/config/database"

const chatController = new ChatController()

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await Database.connect()
  return chatController.addParticipants(req as any, { params })
}
