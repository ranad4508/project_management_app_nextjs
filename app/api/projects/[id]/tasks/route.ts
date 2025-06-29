import { TaskController } from "@/src/controllers/task.controller";
import Database from "@/src/config/database";

const taskController = new TaskController();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return taskController.getProjectTasks(req as any, { params });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return taskController.createTask(req as any);
}
