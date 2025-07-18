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
      { params }: { params: Promise<{ workspaceId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { workspaceId } = await params;
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
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;

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
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;
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
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;

      const result = await this.projectService.deleteProject(id, user.id);

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }
  );

  getProjectActivities = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id } = await params;
      const user = await requireAuth(req);

      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const activities = await this.projectService.getProjectActivities(
        id,
        user.id,
        limit
      );

      return NextResponse.json({
        success: true,
        data: activities,
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
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;

      try {
        const project = await this.projectService.archiveProject(id, user.id);

        const message =
          project.status === "archived"
            ? "Project archived successfully"
            : "Project unarchived successfully";

        return NextResponse.json({
          success: true,
          data: project,
          message,
        });
      } catch (error: any) {
        if (error.statusCode === 403) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Insufficient permissions to archive/unarchive this project. Only admins and owners can perform this action.",
              error: "Insufficient permissions",
            },
            { status: 403 }
          );
        }
        throw error; // Re-throw other errors to be handled by asyncHandler
      }
    }
  );

  getProjectSettings = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;

      const settings = await this.projectService.getProjectSettings(
        id,
        user.id
      );

      return NextResponse.json({
        success: true,
        data: settings,
      });
    }
  );

  updateProjectSettings = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;
      const body = await req.json();

      const settings = await this.projectService.updateProjectSettings(
        id,
        user.id,
        body
      );

      return NextResponse.json({
        success: true,
        data: settings,
        message: "Project settings updated successfully",
      });
    }
  );

  getProjectMembers = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;

      const members = await this.projectService.getProjectMembers(id, user.id);

      return NextResponse.json({
        success: true,
        data: members,
      });
    }
  );

  addProjectMember = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;
      const body = await req.json();

      const result = await this.projectService.addProjectMember(
        id,
        user.id,
        body
      );

      return NextResponse.json({
        success: true,
        data: result,
        message: "Member added successfully",
      });
    }
  );

  removeProjectMember = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;
      const { searchParams } = new URL(req.url);
      const memberId = searchParams.get("memberId");

      if (!memberId) {
        return NextResponse.json(
          {
            success: false,
            message: "Member ID is required",
          },
          { status: 400 }
        );
      }

      const result = await this.projectService.removeProjectMember(
        id,
        user.id,
        memberId
      );

      return NextResponse.json({
        success: true,
        data: result,
        message: "Member removed successfully",
      });
    }
  );
}
