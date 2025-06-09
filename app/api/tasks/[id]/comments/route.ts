import { TaskController } from "@/src/controllers/task.controller"
import Database from "@/src/config/database"

const taskController = new TaskController()

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await Database.connect()
  return taskController.addComment(req as any, { params })
}
