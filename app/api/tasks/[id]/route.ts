import { TaskController } from "@/src/controllers/task.controller";
import Database from "@/src/config/database";

const taskController = new TaskController();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return taskController.getTaskById(req as any, { params });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return taskController.updateTask(req as any, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return taskController.deleteTask(req as any, { params });
}
