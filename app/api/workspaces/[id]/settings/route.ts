import type { NextRequest } from "next/server";
import { WorkspaceController } from "@/src/controllers/workspace.controller";
import Database from "@/src/config/database";

const workspaceController = new WorkspaceController();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await Database.connect();
  return workspaceController.getWorkspaceSettings(req as any, { params });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await Database.connect();
  return workspaceController.updateWorkspaceSettings(req as any, { params });
}
