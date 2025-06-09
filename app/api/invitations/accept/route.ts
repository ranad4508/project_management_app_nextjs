import { WorkspaceController } from "@/src/controllers/workspace.controller"
import Database from "@/src/config/database"

const workspaceController = new WorkspaceController()

export async function POST(req: Request) {
  await Database.connect()
  return workspaceController.acceptInvitation(req as any)
}
