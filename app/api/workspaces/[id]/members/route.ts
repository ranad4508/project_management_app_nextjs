import { WorkspaceController } from "@/src/controllers/workspace.controller"
import Database from "@/src/config/database"

const workspaceController = new WorkspaceController()

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await Database.connect()
  return workspaceController.inviteMember(req as any, { params })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await Database.connect()
  return workspaceController.getWorkspaceMembers(req as any, { params })
}
