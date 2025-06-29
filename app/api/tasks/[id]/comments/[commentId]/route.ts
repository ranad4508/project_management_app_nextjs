import { TaskController } from "@/src/controllers/task.controller"
import Database from "@/src/config/database"

const taskController = new TaskController()

export async function PUT(
  req: Request, 
  { params }: { params: { id: string; commentId: string } }
) {
  await Database.connect()
  return taskController.updateComment(req as any, { params })
}

export async function DELETE(
  req: Request, 
  { params }: { params: { id: string; commentId: string } }
) {
  await Database.connect()
  return taskController.deleteComment(req as any, { params })
}
