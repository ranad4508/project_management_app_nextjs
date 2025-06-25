import { type NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/src/services/chat.service";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { asyncHandler } from "@/src/errors/errorHandler";
import type { ApiResponse } from "@/src/types/api.types";

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  // Room management
  createRoom = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const body = await req.json();

      const room = await this.chatService.createRoom(user.id, body);

      return NextResponse.json(
        {
          success: true,
          data: room,
          message: "Room created successfully",
        },
        { status: 201 }
      );
    }
  );

  getUserRooms = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { searchParams } = new URL(req.url);
      const workspaceId = searchParams.get("workspaceId");

      const rooms = await this.chatService.getUserRooms(
        user.id,
        workspaceId || undefined
      );

      return NextResponse.json({
        success: true,
        data: { rooms },
      });
    }
  );

  getRoomById = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;

      const room = await this.chatService.getRoomById(roomId, user.id);

      return NextResponse.json({
        success: true,
        data: room,
      });
    }
  );

  updateRoom = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;
      const body = await req.json();

      const room = await this.chatService.updateRoom(roomId, user.id, body);

      return NextResponse.json({
        success: true,
        data: room,
        message: "Room updated successfully",
      });
    }
  );

  deleteRoom = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;

      await this.chatService.deleteRoom(roomId, user.id);

      return NextResponse.json({
        success: true,
        message: "Room deleted successfully",
      });
    }
  );

  deleteRoomMessages = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;

      const result = await this.chatService.deleteRoomMessages(roomId, user.id);

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} messages`,
        data: result,
      });
    }
  );

  // Message management
  getRoomMessages = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;
      const { searchParams } = new URL(req.url);

      const page = Number.parseInt(searchParams.get("page") || "1");
      const limit = Number.parseInt(searchParams.get("limit") || "50");

      const result = await this.chatService.getRoomMessages(
        roomId,
        user.id,
        page,
        limit
      );

      return NextResponse.json({
        success: true,
        data: {
          messages: result.messages,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
          },
        },
      });
    }
  );

  sendMessage = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      // Try socket authentication first (x-user-id header), then session auth
      let userId: string;
      const socketUserId = req.headers.get("x-user-id");

      if (socketUserId) {
        // Socket.IO authentication - just use the user ID directly
        userId = socketUserId;
        console.log("🔌 Socket.IO message from user:", userId);
      } else {
        // Regular session authentication
        const user = await requireAuth(req);
        userId = user.id;
        console.log("🌐 HTTP message from user:", userId);
      }

      const body = await req.json();
      const message = await this.chatService.sendMessage(userId, body);

      return NextResponse.json(
        {
          success: true,
          data: message,
          message: "Message sent successfully",
        },
        { status: 201 }
      );
    }
  );

  // Reactions
  addReaction = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ messageId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { messageId } = params;
      const { type } = await req.json();

      const message = await this.chatService.addReaction(
        messageId,
        user.id,
        type
      );

      return NextResponse.json({
        success: true,
        data: message,
        message: "Reaction added successfully",
      });
    }
  );

  removeReaction = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ messageId: string; reactionId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { messageId, reactionId } = params;

      const message = await this.chatService.removeReaction(
        messageId,
        user.id,
        reactionId
      );

      return NextResponse.json({
        success: true,
        data: message,
        message: "Reaction removed successfully",
      });
    }
  );

  // Room invitations
  inviteToRoom = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;
      const { userId: invitedUserId } = await req.json();

      // Use the new method that sends email
      await this.chatService.inviteToRoomWithEmail(
        roomId,
        user.id,
        invitedUserId
      );

      return NextResponse.json({
        success: true,
        message: "User invited successfully and email notification sent",
      });
    }
  );

  acceptRoomInvitation = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ invitationId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { invitationId } = params;

      await this.chatService.acceptRoomInvitation(invitationId, user.id);

      return NextResponse.json({
        success: true,
        message: "Invitation accepted successfully",
      });
    }
  );

  // Utility
  updateLastRead = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;

      await this.chatService.updateLastRead(roomId, user.id);

      return NextResponse.json({
        success: true,
        message: "Last read updated successfully",
      });
    }
  );

  // Member management
  removeMemberFromRoom = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string; memberId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId, memberId } = params;

      const result = await this.chatService.removeMemberFromRoom(
        roomId,
        user.id,
        memberId
      );

      return NextResponse.json({
        success: true,
        data: result,
        message: result.message,
      });
    }
  );

  changeMemberRole = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string; memberId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId, memberId } = params;
      const { role } = await req.json();

      const result = await this.chatService.changeMemberRole(
        roomId,
        user.id,
        memberId,
        role
      );

      return NextResponse.json({
        success: true,
        data: result,
        message: result.message,
      });
    }
  );

  inviteMemberByEmail = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;
      const { email } = await req.json();

      const result = await this.chatService.inviteMemberByEmail(
        roomId,
        user.id,
        email
      );

      return NextResponse.json({
        success: true,
        data: result,
        message: result.message,
      });
    }
  );

  getRoomMembers = asyncHandler(
    async (
      req: NextRequest,
      context: { params: Promise<{ roomId: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const params = await context.params;
      const { roomId } = params;

      const result = await this.chatService.getRoomMembers(roomId, user.id);

      return NextResponse.json({
        success: true,
        data: result,
      });
    }
  );
}
