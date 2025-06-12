import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { WorkspaceService } from "@/src/services/workspace.service";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { asyncHandler } from "@/src/errors/errorHandler";
import type { ApiResponse } from "@/src/types/api.types";

const workspaceService = new WorkspaceService();

export const POST = asyncHandler(
  async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
  ): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req);
    const params = await context.params;
    const { id: workspaceId } = params;
    const body = await req.json();

    await workspaceService.inviteMember(workspaceId, user.id, body);

    return NextResponse.json(
      {
        success: true,
        message: "Invitation sent successfully with chat access",
      },
      { status: 200 }
    );
  }
);
