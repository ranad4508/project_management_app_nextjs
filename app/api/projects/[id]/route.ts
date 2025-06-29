import { ProjectController } from "@/src/controllers/project.controller";
import Database from "@/src/config/database";

const projectController = new ProjectController();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.getProjectById(req as any, { params });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.updateProject(req as any, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.deleteProject(req as any, { params });
}
