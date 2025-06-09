import { ProjectController } from "@/src/controllers/project.controller"
import Database from "@/src/config/database"

const projectController = new ProjectController()

export async function POST(req: Request) {
  await Database.connect()
  return projectController.createProject(req as any)
}

export async function GET(req: Request) {
  await Database.connect()
  return projectController.getUserProjects(req as any)
}
