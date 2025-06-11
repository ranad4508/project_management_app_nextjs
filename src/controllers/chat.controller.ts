import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/src/services/chat.service";
import { ValidationError } from "@/src/errors/validation.error";
import { EncryptionUtils } from "@/src/utils/crypto.utils"; // Import CryptoUtils for secure session key validation
import type {
  CreateChatRoomData,
  UpdateChatRoomData,
  SendMessageData,
  ChatRoomResponse,
  ChatRoomsResponse,
  MessagesResponse,
  DecryptedMessage,
  ReactionType,
} from "@/src/types/chat.types";
import type { ApiResponse, PaginationParams } from "@/src/types/api.types";
import { getSession } from "next-auth/react";

export class ChatController {
  public chatService = new ChatService();

  private async getUserAndSession(
    req: NextRequest
  ): Promise<{ userId: string; session: any }> {
    const session = await getSession({ req: req as any });
    if (!session || !session.user?.id) {
      throw new ValidationError("Unauthorized", 401);
    }
    return { userId: session.user.id as string, session };
  }

  private async getPassword(req: NextRequest): Promise<string> {
    const sessionKey = req.headers.get("x-session-key");
    if (!sessionKey) {
      throw new ValidationError("Session key required", 400);
    }

    // Validate session key using PBKDF2 for secure derivation
    const hashedSessionKey = await EncryptionUtils.hashContent(sessionKey);
    // In production, compare hashedSessionKey against stored value in session or DB
    // For now, return sessionKey as password (replace with actual validation)
    return sessionKey;
  }

  async initializeUserEncryption(req: NextRequest): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const { password } = await req.json();

      if (!password || password.length < 8) {
        throw new ValidationError(
          "Password must be at least 8 characters",
          400
        );
      }

      const data =
        await this.chatService.encryptionService.initializeUserEncryption(
          userId,
          password
        );

      return NextResponse.json({ success: true, data } as ApiResponse);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to initialize encryption",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async getUserChatRooms(req: NextRequest): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const rooms = await this.chatService.getUserChatRooms(userId);
      return NextResponse.json({
        success: true,
        data: rooms,
      } as ApiResponse<ChatRoomResponse[]>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to fetch chat rooms",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async getWorkspaceChatRooms(
    req: NextRequest,
    { params }: { params: { workspaceId: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const rooms = await this.chatService.getWorkspaceChatRooms(
        params.workspaceId,
        userId
      );
      return NextResponse.json({
        rooms,
      } as ChatRoomsResponse);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to fetch workspace chat rooms",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async getChatRoomById(
    req: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const room = await this.chatService.getChatRoomById(params.id, userId);
      return NextResponse.json({
        success: true,
        data: room,
      } as ApiResponse<ChatRoomResponse>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to fetch chat room",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async createChatRoom(req: NextRequest): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const password = await this.getPassword(req);
      const data: CreateChatRoomData = await req.json();

      // Validate required fields
      if (!data.name || !data.type) {
        throw new ValidationError("Name and type are required", 400);
      }

      const room = await this.chatService.createChatRoom(
        userId,
        data,
        password
      );
      return NextResponse.json(
        { success: true, data: room } as ApiResponse<ChatRoomResponse>,
        { status: 201 }
      );
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to create chat room",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async updateChatRoom(
    req: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const data: UpdateChatRoomData = await req.json();

      const room = await this.chatService.updateChatRoom(
        params.id,
        userId,
        data
      );
      return NextResponse.json({
        success: true,
        data: room,
      } as ApiResponse<ChatRoomResponse>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to update chat room",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async addParticipants(
    req: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const password = await this.getPassword(req);
      const { participantIds } = await req.json();

      if (!Array.isArray(participantIds) || participantIds.length === 0) {
        throw new ValidationError("Invalid participant IDs", 400);
      }

      const room = await this.chatService.addParticipantsToRoom(
        params.id,
        userId,
        participantIds,
        password
      );
      return NextResponse.json({
        success: true,
        data: room,
      } as ApiResponse<ChatRoomResponse>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to add participants",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async removeParticipant(
    req: NextRequest,
    { params }: { params: { id: string; participantId: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const room = await this.chatService.removeParticipantFromRoom(
        params.id,
        userId,
        params.participantId
      );
      return NextResponse.json({
        success: true,
        data: room,
      } as ApiResponse<ChatRoomResponse>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to remove participant",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async sendMessage(req: NextRequest): Promise<NextResponse> {
    try {
      const { userId, session } = await this.getUserAndSession(req);
      const password = await this.getPassword(req);
      const body = await req.json();
      const data: SendMessageData = {
        roomId: body.roomId,
        content: body.content,
        messageType: body.messageType || "text",
        replyTo: body.replyTo,
        mentions: body.mentions,
        attachments: body.attachments || [],
      };

      if (!data.roomId || (!data.content && !data.attachments?.length)) {
        throw new ValidationError(
          "Room ID and content or attachments required",
          400
        );
      }

      const message = await this.chatService.sendMessage(
        userId,
        data,
        password
      );
      message.sender.name = session.user.name as string;
      message.sender.avatar = session.user.image as string;

      return NextResponse.json(
        { success: true, data: message } as ApiResponse<DecryptedMessage>,
        { status: 201 }
      );
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to send message",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async getChatRoomMessages(
    req: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const password = await this.getPassword(req);
      const { searchParams } = new URL(req.url);
      const pagination: PaginationParams = {
        page: parseInt(searchParams.get("page") || "1"),
        limit: parseInt(searchParams.get("limit") || "50"),
        sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
      };

      const messages = await this.chatService.getChatRoomMessages(
        params.id,
        userId,
        password,
        pagination
      );
      return NextResponse.json({
        success: true,
        data: messages,
      } as ApiResponse<MessagesResponse>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to fetch messages",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async markMessageAsRead(
    req: NextRequest,
    { params }: { params: { messageId: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const result = await this.chatService.markMessageAsRead(
        params.messageId,
        userId
      );
      return NextResponse.json({ success: true, data: result } as ApiResponse);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to mark message as read",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async editMessage(
    req: NextRequest,
    { params }: { params: { messageId: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const password = await this.getPassword(req);
      const { content } = await req.json();

      if (!content) {
        throw new ValidationError("Content is required", 400);
      }

      const message = await this.chatService.editMessage(
        params.messageId,
        userId,
        content,
        password
      );
      return NextResponse.json({
        success: true,
        data: message,
      } as ApiResponse<DecryptedMessage>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to edit message",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async deleteMessage(
    req: NextRequest,
    { params }: { params: { messageId: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const result = await this.chatService.deleteMessage(
        params.messageId,
        userId
      );
      return NextResponse.json({ success: true, data: result } as ApiResponse);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to delete message",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async addReaction(
    req: NextRequest,
    { params }: { params: { messageId: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const { type, emoji } = await req.json();

      if (!type) {
        throw new ValidationError("Reaction type required", 400);
      }

      const message = await this.chatService.addReaction(
        params.messageId,
        userId,
        type as ReactionType,
        emoji
      );
      return NextResponse.json({
        success: true,
        data: message,
      } as ApiResponse<DecryptedMessage>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to add reaction",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async removeReaction(
    req: NextRequest,
    { params }: { params: { messageId: string; reactionType: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const message = await this.chatService.removeReaction(
        params.messageId,
        userId,
        params.reactionType
      );
      return NextResponse.json({
        success: true,
        data: message,
      } as ApiResponse<DecryptedMessage>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to remove reaction",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }

  async ensureWorkspaceGeneralRoom(
    req: NextRequest,
    { params }: { params: { workspaceId: string } }
  ): Promise<NextResponse> {
    try {
      const { userId } = await this.getUserAndSession(req);
      const password = await this.getPassword(req);

      const room = await this.chatService.ensureWorkspaceGeneralRoom(
        params.workspaceId,
        userId,
        password
      );
      return NextResponse.json({
        success: true,
        data: room,
      } as ApiResponse<ChatRoomResponse>);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to ensure general room",
        } as ApiResponse,
        { status: error.statusCode || 500 }
      );
    }
  }
}
