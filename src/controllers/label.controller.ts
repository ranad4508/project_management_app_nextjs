import { NextRequest, NextResponse } from "next/server";
import { LabelService } from "@/src/services/label.service";
import { ApiResponse } from "@/src/types/api.types";
import {
  requireAuth,
  requireWorkspaceAccess,
  requireProjectAccess,
} from "@/src/middleware/auth.middleware";
import {
  validateSchema,
  schemas,
} from "@/src/middleware/validation.middleware";
import { asyncHandler } from "@/src/errors/errorHandler";

export class LabelController {
  private labelService: LabelService;

  constructor() {
    this.labelService = new LabelService();
  }

  createLabel = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id: workspaceId } = await params;
      const user = await requireAuth(req);
      const body = await req.json();
      const validatedData = validateSchema(schemas.createLabel, body);

      // Handle both projectId and project field names
      const projectId = validatedData.projectId || validatedData.project;

      // Verify workspace access
      await requireWorkspaceAccess(req, workspaceId);

      // If project-specific label, verify project access
      if (projectId) {
        await requireProjectAccess(req, projectId);
      }

      const label = await this.labelService.createLabel(user.id, {
        ...validatedData,
        workspaceId,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Label created successfully",
          data: label,
        },
        { status: 201 }
      );
    }
  );

  getLabels = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id: workspaceId } = await params;
      const { user } = await requireWorkspaceAccess(req, workspaceId);

      const { searchParams } = new URL(req.url);
      const projectId = searchParams.get("projectId");
      const page = searchParams.get("page");
      const limit = searchParams.get("limit");
      const sortBy = searchParams.get("sortBy");
      const sortOrder = searchParams.get("sortOrder");

      // If project-specific labels requested, verify project access
      if (projectId) {
        await requireProjectAccess(req, projectId);
      }

      const result = await this.labelService.getLabels(
        user.id,
        workspaceId,
        projectId || undefined,
        {
          page: page ? parseInt(page) : undefined,
          limit: limit ? parseInt(limit) : undefined,
          sortBy: sortBy || undefined,
          sortOrder: (sortOrder as "asc" | "desc") || undefined,
        }
      );

      return NextResponse.json({
        success: true,
        message: "Labels retrieved successfully",
        data: result,
      });
    }
  );

  updateLabel = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ labelId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { labelId } = await params;
      const body = await req.json();
      const validatedData = validateSchema(schemas.updateLabel, body);

      const label = await this.labelService.updateLabel(
        user.id,
        labelId,
        validatedData
      );

      return NextResponse.json({
        success: true,
        message: "Label updated successfully",
        data: label,
      });
    }
  );

  deleteLabel = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ labelId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { labelId } = await params;

      const result = await this.labelService.deleteLabel(user.id, labelId);

      return NextResponse.json({
        success: true,
        message: result.message,
        data: result,
      });
    }
  );
}
