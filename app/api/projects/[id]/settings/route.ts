import { ProjectController } from "@/src/controllers/project.controller";
import Database from "@/src/config/database";

const projectController = new ProjectController();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.getProjectSettings(req as any, { params });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.updateProjectSettings(req as any, { params });
}
