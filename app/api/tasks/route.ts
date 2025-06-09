import { TaskController } from "@/src/controllers/task.controller"
import Database from "@/src/config/database"

const taskController = new TaskController()

export async function POST(req: Request) {
  await Database.connect()
  return taskController.createTask(req as any)
}

export async function GET(req: Request) {
  await Database.connect()
  return taskController.getUserTasks(req as any)
}
