import { ChatRoom } from "@/src/models/chat-room";
import { ChatMessage } from "@/src/models/chat-message";
import { RoomInvitation } from "@/src/models/room-invitation";
import { Workspace } from "@/src/models/workspace";
import { EncryptionService } from "./encryption.service";
import { FileUploadService } from "./file-upload.service";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
} from "@/src/errors/AppError";
import { RoomType } from "@/src/types/chat.types";
import { MemberRole } from "@/src/enums/user.enum";
import type {
  CreateRoomData,
  UpdateRoomData,
  SendMessageData,
  ChatRoom as ChatRoomType,
  ChatMessage as ChatMessageType,
} from "@/src/types/chat.types";
import { User } from "@/src/models/user";
import { EmailService } from "./email.service";

export class ChatService {
  private fileUploadService: FileUploadService;

  constructor() {
    this.fileUploadService = new FileUploadService();
  }

  /**
   * Create a new chat room
   */
  async createRoom(
    userId: string,
    data: CreateRoomData
  ): Promise<ChatRoomType> {
    const {
      name,
      description,
      type,
      workspaceId,
      isEncrypted = true,
      inviteUsers = [],
    } = data;

    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace");
    }

    // Check if general room already exists for workspace
    if (type === RoomType.GENERAL) {
      const existingGeneral = await ChatRoom.findOne({
        workspace: workspaceId,
        type: RoomType.GENERAL,
      });

      if (existingGeneral) {
        throw new ConflictError(
          "General room already exists for this workspace"
        );
      }
    }

    // Create room
    const room = new ChatRoom({
      name,
      description,
      type,
      workspace: workspaceId,
      createdBy: userId,
      isEncrypted,
      encryptionKeyId: isEncrypted
        ? EncryptionService.generateKeyId()
        : undefined,
      members: [
        {
          user: userId,
          role: MemberRole.ADMIN,
          joinedAt: new Date(),
        },
      ],
    });

    // Add all workspace members to general room
    if (type === RoomType.GENERAL) {
      const workspaceMembers = workspace.members.map((member: any) => ({
        user: member.user,
        role: member.role,
        joinedAt: new Date(),
      }));

      room.members = workspaceMembers;
    } else if (inviteUsers.length > 0) {
      // Add invited users to private room
      const invitedMembers = inviteUsers.map((inviteUserId) => ({
        user: inviteUserId,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      }));

      room.members.push(...invitedMembers);
    }

    await room.save();
    await room.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
      { path: "workspace", select: "name" },
    ]);

    return room.toObject();
  }

  /**
   * Get user's chat rooms
   */
  async getUserRooms(
    userId: string,
    workspaceId?: string
  ): Promise<ChatRoomType[]> {
    const query: any = {
      "members.user": userId,
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    const rooms = await ChatRoom.find(query)
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate("lastMessage")
      .populate("workspace", "name")
      .sort({ lastActivity: -1 });

    return rooms.map((room) => room.toObject());
  }

  /**
   * Get room by ID
   */
  async getRoomById(roomId: string, userId: string): Promise<ChatRoomType> {
    const room = await ChatRoom.findById(roomId)
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate("workspace", "name");

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!room.isMember(userId)) {
      throw new AuthorizationError("Access denied to this room");
    }

    return room.toObject();
  }

  /**
   * Update room
   */
  async updateRoom(
    roomId: string,
    userId: string,
    data: UpdateRoomData
  ): Promise<ChatRoomType> {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!room.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required");
    }

    Object.assign(room, data);
    await room.save();
    await room.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
    ]);

    return room.toObject();
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (room.createdBy.toString() !== userId) {
      throw new AuthorizationError("Only room creator can delete the room");
    }

    if (room.type === RoomType.GENERAL) {
      throw new ValidationError("Cannot delete general room");
    }

    // Delete all messages in the room
    await ChatMessage.deleteMany({ room: roomId });

    // Delete room invitations
    await RoomInvitation.deleteMany({ room: roomId });

    // Delete the room
    await ChatRoom.findByIdAndDelete(roomId);
  }

  /**
   * Send message
   */
  async sendMessage(
    userId: string,
    data: SendMessageData
  ): Promise<ChatMessageType> {
    const {
      roomId,
      content,
      type,
      attachments,
      replyTo,
      isEncrypted = true,
    } = data;

    // Verify room access
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!room.isMember(userId)) {
      throw new AuthorizationError("Access denied to this room");
    }

    // Handle file attachments
    let processedAttachments: any[] = [];
    if (attachments && attachments.length > 0) {
      processedAttachments = await Promise.all(
        attachments.map(async (file) => {
          const uploadResult = await this.fileUploadService.uploadFile(
            file,
            userId
          );

          // Encrypt file if room is encrypted
          if (room.isEncrypted && isEncrypted) {
            // This would require the shared secret - implement based on your key management
            // const encryptedFile = EncryptionService.encryptFile(fileBuffer, sharedSecret, room.encryptionKeyId!);
          }

          return {
            filename: uploadResult.filename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            url: uploadResult.url,
          };
        })
      );
    }

    // Create message
    const message = new ChatMessage({
      room: roomId,
      sender: userId,
      type,
      content,
      attachments: processedAttachments,
      replyTo,
    });

    // Encrypt content if room is encrypted
    if (room.isEncrypted && isEncrypted && room.encryptionKeyId) {
      // This would require implementing key management for the room
      // const encryptedContent = EncryptionService.encryptMessage(content, sharedSecret, room.encryptionKeyId);
      // message.encryptedContent = encryptedContent;
    }

    await message.save();
    await message.populate([
      { path: "sender", select: "name email avatar" },
      { path: "replyTo", populate: { path: "sender", select: "name email" } },
    ]);

    // Update room's last activity
    room.lastActivity = new Date();
    room.lastMessage = message._id;
    await room.save();

    return message.toObject();
  }

  /**
   * Get room messages
   */
  async getRoomMessages(
    roomId: string,
    userId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: ChatMessageType[]; total: number }> {
    // Verify room access
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!room.isMember(userId)) {
      throw new AuthorizationError("Access denied to this room");
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      ChatMessage.find({
        room: roomId,
        deletedAt: { $exists: false },
      })
        .populate("sender", "name email avatar")
        .populate("reactions.user", "name email avatar")
        .populate({
          path: "replyTo",
          populate: { path: "sender", select: "name email" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ChatMessage.countDocuments({
        room: roomId,
        deletedAt: { $exists: false },
      }),
    ]);

    return {
      messages: messages.reverse().map((msg) => msg.toObject()),
      total,
    };
  }

  /**
   * Add reaction to message
   */
  async addReaction(
    messageId: string,
    userId: string,
    reactionType: string
  ): Promise<ChatMessageType> {
    const message = await ChatMessage.findById(messageId);
    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Check if user already reacted with this type
    const existingReaction = message.reactions.find(
      (reaction: any) =>
        reaction.user.toString() === userId && reaction.type === reactionType
    );

    if (existingReaction) {
      throw new ConflictError("You already reacted with this emoji");
    }

    message.reactions.push({
      user: userId as any,
      type: reactionType as any,
      createdAt: new Date(),
    });

    await message.save();
    await message.populate([
      { path: "sender", select: "name email avatar" },
      { path: "reactions.user", select: "name email avatar" },
    ]);

    return message.toObject();
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    reactionId: string
  ): Promise<ChatMessageType> {
    const message = await ChatMessage.findById(messageId);
    if (!message) {
      throw new NotFoundError("Message not found");
    }

    message.reactions = message.reactions.filter(
      (reaction: any) => reaction._id.toString() !== reactionId
    );

    await message.save();
    await message.populate([
      { path: "sender", select: "name email avatar" },
      { path: "reactions.user", select: "name email avatar" },
    ]);

    return message.toObject();
  }

  /**
   * Invite user to room
   */
  async inviteToRoom(
    roomId: string,
    inviterId: string,
    invitedUserId: string
  ): Promise<void> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!room.isAdmin(inviterId)) {
      throw new AuthorizationError("Admin access required to invite users");
    }

    if (room.isMember(invitedUserId)) {
      throw new ConflictError("User is already a member of this room");
    }

    // Create invitation
    const invitation = new RoomInvitation({
      room: roomId,
      invitedBy: inviterId,
      invitedUser: invitedUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await invitation.save();
  }

  /**
   * Invite user to room with email notification
   */
  async inviteToRoomWithEmail(
    roomId: string,
    inviterId: string,
    invitedUserId: string
  ): Promise<void> {
    // First, create the room invitation in the database
    await this.inviteToRoom(roomId, inviterId, invitedUserId);

    try {
      // Get room details
      const room = await ChatRoom.findById(roomId)
        .populate("workspace", "name")
        .populate({
          path: "createdBy",
          select: "name email",
        });

      if (!room) {
        throw new NotFoundError("Room not found");
      }

      // Get inviter details
      const inviter = await User.findById(inviterId).select("name email");

      // Get invited user details
      const invitedUser = await User.findById(invitedUserId).select(
        "name email"
      );

      if (!invitedUser || !invitedUser.email) {
        throw new NotFoundError("Invited user not found");
      }

      // Send email invitation
      const emailService = new EmailService();
      await emailService.sendRoomInvitationEmail(
        invitedUser.email,
        inviter?.name || "A team member",
        invitedUser.name,
        room.name,
        room.workspace.name,
        roomId
      );

      console.log(
        `Email invitation sent to ${invitedUser.email} for room ${room.name}`
      );
    } catch (error) {
      console.error("Failed to send room invitation email:", error);
      // Don't fail the invitation process if email sending fails
    }
  }

  /**
   * Accept room invitation
   */
  async acceptRoomInvitation(
    invitationId: string,
    userId: string
  ): Promise<void> {
    const invitation = await RoomInvitation.findById(invitationId);
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.invitedUser.toString() !== userId) {
      throw new AuthorizationError("This invitation is not for you");
    }

    if (invitation.status !== "pending") {
      throw new ValidationError("Invitation is no longer pending");
    }

    if (invitation.expiresAt < new Date()) {
      throw new ValidationError("Invitation has expired");
    }

    // Add user to room
    const room = await ChatRoom.findById(invitation.room);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    room.members.push({
      user: userId as any,
      role: MemberRole.MEMBER,
      joinedAt: new Date(),
    });

    await room.save();

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();
  }

  /**
   * Update user's last read timestamp for a room
   */
  async updateLastRead(roomId: string, userId: string): Promise<void> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const memberIndex = room.members.findIndex(
      (member: any) => member.user.toString() === userId
    );

    if (memberIndex === -1) {
      throw new AuthorizationError("Access denied to this room");
    }

    room.members[memberIndex].lastReadAt = new Date();
    await room.save();
  }
}
