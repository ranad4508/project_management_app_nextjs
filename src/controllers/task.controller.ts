import { type NextRequest, NextResponse } from "next/server";
import { TaskService } from "@/src/services/task.service";
import {
  validateSchema,
  schemas,
} from "@/src/middleware/validation.middleware";
import {
  requireAuth,
  requireProjectAccess,
  requireTaskAccess,
} from "@/src/middleware/auth.middleware";
import { asyncHandler } from "@/src/errors/errorHandler";
import type { ApiResponse } from "@/src/types/api.types";

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  createTask = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const body = await req.json();
      const validatedData = validateSchema(schemas.createTask, body);

      const task = await this.taskService.createTask(user.id, {
        ...validatedData,
        dueDate: validatedData.dueDate
          ? new Date(validatedData.dueDate)
          : undefined,
      });

      return NextResponse.json(
        {
          success: true,
          data: task,
          message: "Task created successfully",
        },
        { status: 201 }
      );
    }
  );

  getProjectTasks = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id: projectId } = await params;
      const { user } = await requireProjectAccess(req, projectId);
      const { searchParams } = new URL(req.url);

      const pagination = {
        page: Number.parseInt(searchParams.get("page") || "1"),
        limit: Number.parseInt(searchParams.get("limit") || "20"),
        sortBy: searchParams.get("sortBy") || "createdAt",
        sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
      };

      const filters = {
        search: searchParams.get("search") || undefined,
        status: searchParams.get("status") || undefined,
        priority: searchParams.get("priority") || undefined,
        assignedTo: searchParams.get("assignedTo") || undefined,
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
        labels: searchParams.get("labels")
          ? searchParams.get("labels")!.split(",")
          : undefined,
      };

      const result = await this.taskService.getProjectTasks(
        projectId,
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

  getTaskById = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id } = await params;
      const { user } = await requireTaskAccess(req, id);

      const taskData = await this.taskService.getTaskById(id, user.id);

      return NextResponse.json({
        success: true,
        data: taskData,
      });
    }
  );

  updateTask = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id } = await params;
      const { user } = await requireTaskAccess(req, id);
      const body = await req.json();
      const validatedData = validateSchema(schemas.updateTask, body);

      const task = await this.taskService.updateTask(id, user.id, {
        ...validatedData,
        dueDate: validatedData.dueDate
          ? new Date(validatedData.dueDate)
          : undefined,
      });

      return NextResponse.json({
        success: true,
        data: task,
        message: "Task updated successfully",
      });
    }
  );

  deleteTask = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id } = await params;
      const { user } = await requireTaskAccess(req, id);

      const result = await this.taskService.deleteTask(id, user.id);

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }
  );

  getComments = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;

      const comments = await this.taskService.getComments(id, user.id);

      return NextResponse.json({
        success: true,
        data: { comments },
        message: "Comments retrieved successfully",
      });
    }
  );

  addComment = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;
      const { content } = await req.json();

      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Comment content is required",
          },
          { status: 400 }
        );
      }

      const comment = await this.taskService.addComment(
        id,
        user.id,
        content.trim()
      );

      return NextResponse.json({
        success: true,
        data: comment,
        message: "Comment added successfully",
      });
    }
  );

  updateComment = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string; commentId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id, commentId } = await params;
      const { content } = await req.json();

      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Comment content is required",
          },
          { status: 400 }
        );
      }

      const comment = await this.taskService.updateComment(
        id,
        commentId,
        user.id,
        content.trim()
      );

      return NextResponse.json({
        success: true,
        data: comment,
        message: "Comment updated successfully",
      });
    }
  );

  deleteComment = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string; commentId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id, commentId } = await params;

      await this.taskService.deleteComment(id, commentId, user.id);

      return NextResponse.json({
        success: true,
        message: "Comment deleted successfully",
      });
    }
  );

  getUserTasks = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { searchParams } = new URL(req.url);

      const pagination = {
        page: Number.parseInt(searchParams.get("page") || "1"),
        limit: Number.parseInt(searchParams.get("limit") || "20"),
        sortBy: searchParams.get("sortBy") || "dueDate",
        sortOrder: (searchParams.get("sortOrder") || "asc") as "asc" | "desc",
      };

      const filters = {
        status: searchParams.get("status") || undefined,
        priority: searchParams.get("priority") || undefined,
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
      };

      const result = await this.taskService.getUserTasks(
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

  getOverdueTasks = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);

      const tasks = await this.taskService.getOverdueTasks(user.id);

      return NextResponse.json({
        success: true,
        data: tasks,
      });
    }
  );

  addAttachment = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id } = await params;
      const { user } = await requireTaskAccess(req, id);

      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json(
          { success: false, message: "No file provided" },
          { status: 400 }
        );
      }

      const attachment = await this.taskService.addAttachment(
        id,
        user.id,
        file
      );

      return NextResponse.json({
        success: true,
        data: attachment,
        message: "Attachment added successfully",
      });
    }
  );

  getAttachments = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id } = await params;
      const { user } = await requireTaskAccess(req, id);

      const attachments = await this.taskService.getAttachments(id, user.id);

      return NextResponse.json({
        success: true,
        data: attachments,
      });
    }
  );

  getActivities = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id } = await params;
      const { user } = await requireTaskAccess(req, id);

      const activities = await this.taskService.getActivities(id, user.id);

      return NextResponse.json({
        success: true,
        data: activities,
      });
    }
  );

  deleteAttachment = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string; attachmentId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const { id, attachmentId } = await params;
      const { user } = await requireTaskAccess(req, id);

      const result = await this.taskService.deleteAttachment(
        id,
        attachmentId,
        user.id
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    }
  );
}
