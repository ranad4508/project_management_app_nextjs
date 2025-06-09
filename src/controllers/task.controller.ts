import { type NextRequest, NextResponse } from "next/server"
import { TaskService } from "@/src/services/task.service"
import { validateSchema, schemas } from "@/src/middleware/validation.middleware"
import { requireAuth } from "@/src/middleware/auth.middleware"
import { asyncHandler } from "@/src/errors/errorHandler"
import type { ApiResponse } from "@/src/types/api.types"

export class TaskController {
  private taskService: TaskService

  constructor() {
    this.taskService = new TaskService()
  }

  createTask = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)
    const body = await req.json()
    const validatedData = validateSchema(schemas.createTask, body)

    const task = await this.taskService.createTask(user.id, validatedData)

    return NextResponse.json(
      {
        success: true,
        data: task,
        message: "Task created successfully",
      },
      { status: 201 },
    )
  })

  getProjectTasks = asyncHandler(
    async (req: NextRequest, { params }: { params: { projectId: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { projectId } = params
      const { searchParams } = new URL(req.url)

      const pagination = {
        page: Number.parseInt(searchParams.get("page") || "1"),
        limit: Number.parseInt(searchParams.get("limit") || "20"),
        sortBy: searchParams.get("sortBy") || "createdAt",
        sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
      }

      const filters = {
        search: searchParams.get("search") || undefined,
        status: searchParams.get("status") || undefined,
        priority: searchParams.get("priority") || undefined,
        assignedTo: searchParams.get("assignedTo") || undefined,
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
      }

      const result = await this.taskService.getProjectTasks(projectId, user.id, pagination, filters)

      return NextResponse.json({
        success: true,
        data: result,
      })
    },
  )

  getTaskById = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params

      const task = await this.taskService.getTaskById(id, user.id)

      return NextResponse.json({
        success: true,
        data: task,
      })
    },
  )

  updateTask = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params
      const body = await req.json()

      const task = await this.taskService.updateTask(id, user.id, body)

      return NextResponse.json({
        success: true,
        data: task,
        message: "Task updated successfully",
      })
    },
  )

  deleteTask = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params

      const result = await this.taskService.deleteTask(id, user.id)

      return NextResponse.json({
        success: true,
        message: result.message,
      })
    },
  )

  addComment = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params
      const { content } = await req.json()

      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Comment content is required",
          },
          { status: 400 },
        )
      }

      const comment = await this.taskService.addComment(id, user.id, content.trim())

      return NextResponse.json({
        success: true,
        data: comment,
        message: "Comment added successfully",
      })
    },
  )

  getUserTasks = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)

    const pagination = {
      page: Number.parseInt(searchParams.get("page") || "1"),
      limit: Number.parseInt(searchParams.get("limit") || "20"),
      sortBy: searchParams.get("sortBy") || "dueDate",
      sortOrder: (searchParams.get("sortOrder") || "asc") as "asc" | "desc",
    }

    const filters = {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    }

    const result = await this.taskService.getUserTasks(user.id, pagination, filters)

    return NextResponse.json({
      success: true,
      data: result,
    })
  })

  getOverdueTasks = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)

    const tasks = await this.taskService.getOverdueTasks(user.id)

    return NextResponse.json({
      success: true,
      data: tasks,
    })
  })
}
