import { ProjectController } from "@/src/controllers/project.controller";
import Database from "@/src/config/database";

const projectController = new ProjectController();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.getProjectMembers(req as any, { params });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.addProjectMember(req as any, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return projectController.removeProjectMember(req as any, { params });
}
