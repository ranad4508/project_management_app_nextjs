import type { NextRequest } from "next/server";
import { WorkspaceController } from "@/src/controllers/workspace.controller";
import Database from "@/src/config/database";

const workspaceController = new WorkspaceController();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await Database.connect();
  return workspaceController.inviteMember(req as any, { params });
}
