import type { NextRequest } from "next/server"
import { WorkspaceController } from "@/src/controllers/workspace.controller"
import Database from "@/src/config/database"

const workspaceController = new WorkspaceController()

export async function POST(req: NextRequest) {
  await Database.connect()
  return workspaceController.createWorkspace(req as any)
}

export async function GET(req: NextRequest) {
  await Database.connect()
  return workspaceController.getUserWorkspaces(req as any)
}
