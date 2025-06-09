import { ChatController } from "@/src/controllers/chat.controller"
import Database from "@/src/config/database"

const chatController = new ChatController()

export async function DELETE(req: Request, { params }: { params: { id: string; participantId: string } }) {
  await Database.connect()
  return chatController.removeParticipant(req as any, { params })
}
