import { type NextRequest, NextResponse } from "next/server";
import { ProjectService } from "@/src/services/project.service";
import {
  validateSchema,
  schemas,
} from "@/src/middleware/validation.middleware";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { asyncHandler } from "@/src/errors/errorHandler";
import type { ApiResponse } from "@/src/types/api.types";

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  createProject = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const body = await req.json();
      const validatedData = validateSchema(schemas.createProject, body);

      const project = await this.projectService.createProject(
        user.id,
        validatedData as any
      );

      return NextResponse.json(
        {
          success: true,
          data: project,
          message: "Project created successfully",
        },
        { status: 201 }
      );
    }
  );

  getWorkspaceProjects = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: { workspaceId: string } }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { workspaceId } = params;
      const { searchParams } = new URL(req.url);

      const pagination = {
        page: Number.parseInt(searchParams.get("page") || "1"),
        limit: Number.parseInt(searchParams.get("limit") || "10"),
        sortBy: searchParams.get("sortBy") || "updatedAt",
        sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
      };

      const filters = {
        search: searchParams.get("search") || undefined,
        status: searchParams.get("status") || undefined,
        priority: searchParams.get("priority") || undefined,
      };

      const result = await this.projectService.getWorkspaceProjects(
        workspaceId,
        user.id,
        pagination,
        filters
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    }
  );

  getProjectById = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = params;

      const project = await this.projectService.getProjectById(id, user.id);

      return NextResponse.json({
        success: true,
        data: project,
      });
    }
  );

  updateProject = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = params;
      const body = await req.json();

      const project = await this.projectService.updateProject(
        id,
        user.id,
        body
      );

      return NextResponse.json({
        success: true,
        data: project,
        message: "Project updated successfully",
      });
    }
  );

  deleteProject = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = params;

      const result = await this.projectService.deleteProject(id, user.id);

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }
  );

  getUserProjects = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { searchParams } = new URL(req.url);

      const pagination = {
        page: Number.parseInt(searchParams.get("page") || "1"),
        limit: Number.parseInt(searchParams.get("limit") || "10"),
        sortBy: searchParams.get("sortBy") || "updatedAt",
        sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
      };

      const result = await this.projectService.getUserProjects(
        user.id,
        pagination
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    }
  );

  archiveProject = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = params;

      const project = await this.projectService.archiveProject(id, user.id);

      return NextResponse.json({
        success: true,
        data: project,
        message: "Project archived successfully",
      });
    }
  );
}
