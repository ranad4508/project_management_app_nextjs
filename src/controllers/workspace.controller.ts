import { type NextRequest, NextResponse } from "next/server"
import { WorkspaceService } from "@/src/services/workspace.service"
import { validateSchema, schemas } from "@/src/middleware/validation.middleware"
import { requireAuth } from "@/src/middleware/auth.middleware"
import { asyncHandler } from "@/src/errors/errorHandler"
import type { ApiResponse } from "@/src/types/api.types"

export class WorkspaceController {
  private workspaceService: WorkspaceService

  constructor() {
    this.workspaceService = new WorkspaceService()
  }

  createWorkspace = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)
    const body = await req.json()
    const validatedData = validateSchema(schemas.createWorkspace, body)

    const workspace = await this.workspaceService.createWorkspace(user.id, validatedData)

    return NextResponse.json(
      {
        success: true,
        data: workspace,
        message: "Workspace created successfully",
      },
      { status: 201 },
    )
  })

  getUserWorkspaces = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)

    const pagination = {
      page: Number.parseInt(searchParams.get("page") || "1"),
      limit: Number.parseInt(searchParams.get("limit") || "10"),
      sortBy: searchParams.get("sortBy") || "updatedAt",
      sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
    }

    const result = await this.workspaceService.getUserWorkspaces(user.id, pagination)

    return NextResponse.json({
      success: true,
      data: result,
    })
  })

  getWorkspaceById = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params

      const workspace = await this.workspaceService.getWorkspaceById(id, user.id)

      return NextResponse.json({
        success: true,
        data: workspace,
      })
    },
  )

  updateWorkspace = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params
      const body = await req.json()
      const validatedData = validateSchema(schemas.updateWorkspace, body)

      const workspace = await this.workspaceService.updateWorkspace(id, user.id, validatedData)

      return NextResponse.json({
        success: true,
        data: workspace,
        message: "Workspace updated successfully",
      })
    },
  )

  deleteWorkspace = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params

      const result = await this.workspaceService.deleteWorkspace(id, user.id)

      return NextResponse.json({
        success: true,
        message: result.message,
      })
    },
  )

  inviteMember = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params
      const body = await req.json()
      const validatedData = validateSchema(schemas.inviteMember, body)

      const result = await this.workspaceService.inviteMember(id, user.id, validatedData)

      return NextResponse.json({
        success: true,
        message: result.message,
      })
    },
  )

  getWorkspaceMembers = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params

      const result = await this.workspaceService.getWorkspaceMembers(id, user.id)

      return NextResponse.json({
        success: true,
        data: result,
      })
    },
  )

  updateMemberRole = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: { id: string; userId: string } },
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id, userId } = params
      const { role } = await req.json()

      const result = await this.workspaceService.updateMemberRole(id, user.id, userId, role)

      return NextResponse.json({
        success: true,
        message: result.message,
      })
    },
  )

  removeMember = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: { id: string; userId: string } },
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id, userId } = params

      const result = await this.workspaceService.removeMember(id, user.id, userId)

      return NextResponse.json({
        success: true,
        message: result.message,
      })
    },
  )

  acceptInvitation = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const { token } = await req.json()

    // Try to get user from session (optional for this endpoint)
    let userId: string | undefined
    try {
      const user = await requireAuth(req)
      userId = user.id
    } catch {
      // User not logged in, that's okay for invitation acceptance
    }

    const result = await this.workspaceService.acceptInvitation(token, userId)

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message || "Invitation details retrieved",
    })
  })
}
