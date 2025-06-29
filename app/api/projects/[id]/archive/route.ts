import { ProjectController } from "@/src/controllers/project.controller";
import Database from "@/src/config/database";

const projectController = new ProjectController();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.archiveProject(req as any, { params });
}
