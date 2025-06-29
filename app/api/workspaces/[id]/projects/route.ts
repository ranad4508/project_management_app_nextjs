import { ProjectController } from "@/src/controllers/project.controller";
import Database from "@/src/config/database";

const projectController = new ProjectController();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  await Database.connect();
  return projectController.getWorkspaceProjects(req as any, { params });
}
