import { type NextRequest, NextResponse } from "next/server"
import { ChatService } from "@/src/services/chat.service"
import { validateSchema } from "@/src/middleware/validation.middleware"
import { requireAuth } from "@/src/middleware/auth.middleware"
import { asyncHandler } from "@/src/errors/errorHandler"
import type { ApiResponse } from "@/src/types/api.types"
import { z } from "zod"

// Additional schemas for chat
const chatSchemas = {
  createChatRoom: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
    name: z.string().min(1, "Room name is required").max(100, "Name too long"),
    description: z.string().max(500, "Description too long").optional(),
    type: z.enum(["direct", "group", "workspace"]),
    participants: z.array(z.string()),
    isPrivate: z.boolean().optional(),
  }),

  sendMessage: z.object({
    roomId: z.string().min(1, "Room ID is required"),
    content: z.string().min(1, "Message content is required").max(2000, "Message too long"),
    messageType: z.enum(["text", "file", "image"]).optional(),
    replyTo: z.string().optional(),
    mentions: z.array(z.string()).optional(),
    attachments: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
          type: z.string(),
          size: z.number(),
        }),
      )
      .optional(),
  }),

  initializeEncryption: z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
}

export class ChatController {
  private chatService: ChatService

  constructor() {
    this.chatService = new ChatService()
  }

  createChatRoom = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)
    const body = await req.json()
    const validatedData = validateSchema(chatSchemas.createChatRoom, body)

    const chatRoom = await this.chatService.createChatRoom(user.id, validatedData)

    return NextResponse.json(
      {
        success: true,
        data: chatRoom,
        message: "Chat room created successfully",
      },
      { status: 201 },
    )
  })

  getWorkspaceChatRooms = asyncHandler(
    async (req: NextRequest, { params }: { params: { workspaceId: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { workspaceId } = params

      const chatRooms = await this.chatService.getWorkspaceChatRooms(workspaceId, user.id)

      return NextResponse.json({
        success: true,
        data: chatRooms,
      })
    },
  )

  getChatRoomById = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params

      const chatRoom = await this.chatService.getChatRoomById(id, user.id)

      return NextResponse.json({
        success: true,
        data: chatRoom,
      })
    },
  )

  updateChatRoom = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params
      const body = await req.json()

      const chatRoom = await this.chatService.updateChatRoom(id, user.id, body)

      return NextResponse.json({
        success: true,
        data: chatRoom,
        message: "Chat room updated successfully",
      })
    },
  )

  addParticipants = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params
      const { participantIds } = await req.json()

      if (!Array.isArray(participantIds) || participantIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Participant IDs are required",
          },
          { status: 400 },
        )
      }

      const chatRoom = await this.chatService.addParticipants(id, user.id, participantIds)

      return NextResponse.json({
        success: true,
        data: chatRoom,
        message: "Participants added successfully",
      })
    },
  )

  removeParticipant = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: { id: string; participantId: string } },
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id, participantId } = params

      const chatRoom = await this.chatService.removeParticipant(id, user.id, participantId)

      return NextResponse.json({
        success: true,
        data: chatRoom,
        message: "Participant removed successfully",
      })
    },
  )

  sendMessage = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)
    const body = await req.json()
    const validatedData = validateSchema(chatSchemas.sendMessage, body)

    // Get password from headers (in production, this should be handled more securely)
    const password = req.headers.get("x-encryption-password")
    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: "Encryption password is required",
        },
        { status: 400 },
      )
    }

    const message = await this.chatService.sendMessage(user.id, password, validatedData)

    return NextResponse.json(
      {
        success: true,
        data: message,
        message: "Message sent successfully",
      },
      { status: 201 },
    )
  })

  getChatRoomMessages = asyncHandler(
    async (req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { id } = params
      const { searchParams } = new URL(req.url)

      // Get password from headers
      const password = req.headers.get("x-encryption-password")
      if (!password) {
        return NextResponse.json(
          {
            success: false,
            error: "Encryption password is required",
          },
          { status: 400 },
        )
      }

      const pagination = {
        page: Number.parseInt(searchParams.get("page") || "1"),
        limit: Number.parseInt(searchParams.get("limit") || "50"),
        sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
      }

      const result = await this.chatService.getChatRoomMessages(id, user.id, password, pagination)

      return NextResponse.json({
        success: true,
        data: result,
      })
    },
  )

  markMessageAsRead = asyncHandler(
    async (req: NextRequest, { params }: { params: { messageId: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { messageId } = params

      const message = await this.chatService.markMessageAsRead(messageId, user.id)

      return NextResponse.json({
        success: true,
        data: message,
        message: "Message marked as read",
      })
    },
  )

  editMessage = asyncHandler(
    async (req: NextRequest, { params }: { params: { messageId: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { messageId } = params
      const { content } = await req.json()

      // Get password from headers
      const password = req.headers.get("x-encryption-password")
      if (!password) {
        return NextResponse.json(
          {
            success: false,
            error: "Encryption password is required",
          },
          { status: 400 },
        )
      }

      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Message content is required",
          },
          { status: 400 },
        )
      }

      const message = await this.chatService.editMessage(messageId, user.id, password, content.trim())

      return NextResponse.json({
        success: true,
        data: message,
        message: "Message updated successfully",
      })
    },
  )

  deleteMessage = asyncHandler(
    async (req: NextRequest, { params }: { params: { messageId: string } }): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req)
      const { messageId } = params

      const message = await this.chatService.deleteMessage(messageId, user.id)

      return NextResponse.json({
        success: true,
        data: message,
        message: "Message deleted successfully",
      })
    },
  )

  initializeUserEncryption = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)
    const body = await req.json()
    const validatedData = validateSchema(chatSchemas.initializeEncryption, body)

    const result = await this.chatService.initializeUserEncryption(user.id, validatedData.password)

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    })
  })

  getUserChatRooms = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const user = await requireAuth(req)

    const chatRooms = await this.chatService.getUserChatRooms(user.id)

    return NextResponse.json({
      success: true,
      data: chatRooms,
    })
  })
}
