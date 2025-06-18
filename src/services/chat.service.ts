import { ChatRoom } from "@/src/models/chat-room";
import { ChatMessage } from "@/src/models/chat-message";
import { RoomInvitation } from "@/src/models/room-invitation";
import { Workspace } from "@/src/models/workspace";
import { EncryptionService } from "./encryption.service";
import { FileUploadService } from "./file-upload.service";
import crypto from "crypto";
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
   * Create a new chat room with encryption setup
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

    // Generate encryption key for the room
    const encryptionKeyId = isEncrypted
      ? EncryptionService.generateKeyId()
      : undefined;

    // Create room
    const room = new ChatRoom({
      name,
      description,
      type,
      workspace: workspaceId,
      createdBy: userId,
      isEncrypted,
      encryptionKeyId,
      members: [
        {
          user: userId,
          role: MemberRole.ADMIN,
          joinedAt: new Date(),
          // Generate and store user's public key for this room
          publicKey: isEncrypted
            ? EncryptionService.generateDHKeyPair().publicKey
            : undefined,
        },
      ],
    });

    // Add all workspace members to general room
    if (type === RoomType.GENERAL) {
      const workspaceMembers = workspace.members.map((member: any) => ({
        user: member.user,
        role: member.role,
        joinedAt: new Date(),
        // Generate public key for each member if encrypted
        publicKey: isEncrypted
          ? EncryptionService.generateDHKeyPair().publicKey
          : undefined,
      }));

      room.members = workspaceMembers;
    } else if (inviteUsers.length > 0) {
      // Add invited users to private room
      const invitedMembers = inviteUsers.map((inviteUserId) => ({
        user: inviteUserId,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
        publicKey: isEncrypted
          ? EncryptionService.generateDHKeyPair().publicKey
          : undefined,
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
   * Delete all messages in a room (conversation)
   */
  async deleteRoomMessages(
    roomId: string,
    userId: string
  ): Promise<{ deletedCount: number; roomId: string; roomName: string }> {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is a member of the room
    const member = room.members.find(
      (m: any) => m.user && m.user.toString() === userId
    );

    if (!member) {
      throw new AuthorizationError("You are not a member of this room");
    }

    // Check if user has permission to delete messages
    // Only admins, owners, or room creator can delete all messages
    const isOwner = room.createdBy && room.createdBy.toString() === userId;
    const isAdmin = member.role === MemberRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new AuthorizationError(
        "You don't have permission to delete all messages in this room"
      );
    }

    // Count messages before deletion
    const messageCount = await ChatMessage.countDocuments({ room: roomId });

    // Delete all messages in the room
    const result = await ChatMessage.deleteMany({ room: roomId });

    console.log(
      `🗑️ User ${userId} deleted ${messageCount} messages from room ${room.name}`
    );

    return {
      deletedCount: result.deletedCount,
      roomId,
      roomName: room.name,
    };
  }

  /**
   * Send message with encryption
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
          // Handle different file types (Buffer from Socket.IO or File from form)
          let uploadResult;

          if (file instanceof Buffer) {
            // Legacy Buffer handling - should not happen with new format
            uploadResult = await this.fileUploadService.uploadFile(
              file,
              userId,
              `file_${Date.now()}.bin`, // Default name
              "application/octet-stream" // Default type
            );
          } else if (
            file &&
            typeof file === "object" &&
            (file as any).data &&
            (file as any).name
          ) {
            // New format from Socket.IO with metadata preserved
            const fileWithMeta = file as any;
            console.log("📎 Processing file with metadata:", {
              name: fileWithMeta.name,
              type: fileWithMeta.type,
              size: fileWithMeta.size,
            });
            const buffer = Buffer.from(fileWithMeta.data);
            uploadResult = await this.fileUploadService.uploadFile(
              buffer,
              userId,
              fileWithMeta.name, // Original filename
              fileWithMeta.type // Original MIME type
            );
          } else if (
            file &&
            typeof file === "object" &&
            typeof file.arrayBuffer === "function"
          ) {
            // File object with metadata (direct API upload)
            uploadResult = await this.fileUploadService.uploadFile(
              file,
              userId,
              file.name,
              file.type
            );
          } else {
            // Fallback for unknown format
            console.warn("⚠️ Unknown file format:", file);
            uploadResult = await this.fileUploadService.uploadFile(
              file,
              userId,
              `file_${Date.now()}.bin`,
              "application/octet-stream"
            );
          }

          // Encrypt file if room is encrypted
          let encryptedUrl = undefined;
          if (room.isEncrypted && isEncrypted && room.encryptionKeyId) {
            // In a real implementation, you'd encrypt the file content
            // For now, we'll just mark it as encrypted
            encryptedUrl = uploadResult.url + ".encrypted";
          }

          return {
            filename: uploadResult.filename,
            originalName: uploadResult.originalName,
            mimeType: uploadResult.mimeType,
            size: uploadResult.size,
            url: uploadResult.url,
            encryptedUrl,
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
      try {
        console.log(
          `🔐 [CHAT-SERVICE] Starting encryption for message in room: ${room.name} (${roomId})`
        );

        // Use a consistent shared secret based on room and encryption key
        // This ensures the same secret is used for encryption and decryption
        const consistentSharedSecret = crypto
          .createHash("sha256")
          .update(`${room.encryptionKeyId}-${roomId}-consistent-key`)
          .digest("hex");

        console.log(
          `🔑 [CHAT-SERVICE] Using consistent shared secret for room ${room.name}`
        );

        const encryptedContent = EncryptionService.encryptMessage(
          content,
          consistentSharedSecret,
          room.encryptionKeyId,
          userId,
          roomId,
          message._id.toString()
        );
        message.encryptedContent = encryptedContent;

        console.log(
          `✅ [CHAT-SERVICE] Message encrypted successfully for room ${room.name}`
        );
      } catch (error) {
        console.error(
          `❌ [CHAT-SERVICE] Failed to encrypt message for room ${room.name}:`,
          error
        );
        // Continue without encryption rather than failing
      }
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
   * Get room messages with decryption
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

    // Decrypt messages if room is encrypted
    const decryptedMessages = messages.map((msg) => {
      const messageObj = msg.toObject();

      if (
        room.isEncrypted &&
        messageObj.encryptedContent &&
        room.encryptionKeyId
      ) {
        try {
          // Try new consistent shared secret first
          const consistentSharedSecret = crypto
            .createHash("sha256")
            .update(`${room.encryptionKeyId}-${roomId}-consistent-key`)
            .digest("hex");

          console.log(
            `🔑 [CHAT-SERVICE] Using consistent shared secret for decryption in room ${room.name}`
          );

          try {
            const decryptedContent = EncryptionService.decryptMessage(
              messageObj.encryptedContent,
              consistentSharedSecret,
              userId,
              roomId,
              messageObj._id
            );
            messageObj.content = decryptedContent;

            console.log(
              `🔓 Message decrypted - Room: ${room.name} (${roomId}), Message ID: ${messageObj._id}, From: ${messageObj.sender.name}`
            );
          } catch (newKeyError) {
            // If new key fails, try the old temporary shared secret for backward compatibility
            console.log(
              `🔄 [CHAT-SERVICE] New key failed, trying old temporary key for message ${messageObj._id}`
            );

            const oldTempSharedSecret =
              "demo-shared-secret-" + room.encryptionKeyId;

            try {
              const decryptedContent = EncryptionService.decryptMessage(
                messageObj.encryptedContent,
                oldTempSharedSecret,
                userId,
                roomId,
                messageObj._id
              );
              messageObj.content = decryptedContent;

              console.log(
                `🔓 Message decrypted with old key - Room: ${room.name} (${roomId}), Message ID: ${messageObj._id}, From: ${messageObj.sender.name}`
              );
            } catch (oldKeyError) {
              console.error(
                "❌ Failed to decrypt message with both new and old keys:",
                oldKeyError
              );
              messageObj.content = "[Encrypted message - decryption failed]";
            }
          }
        } catch (error) {
          console.error("❌ Failed to decrypt message:", error);
          messageObj.content = "[Encrypted message - decryption failed]";
        }
      }

      return messageObj;
    });

    return {
      messages: decryptedMessages.reverse(),
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

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex");

    // Create invitation
    const invitation = new RoomInvitation({
      room: roomId,
      invitedBy: inviterId,
      invitedUser: invitedUserId,
      token: invitationToken,
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
    console.log("🎯 Processing room invitation with email:", {
      roomId,
      inviterId,
      invitedUserId,
    });

    // First, create the room invitation in the database
    await this.inviteToRoom(roomId, inviterId, invitedUserId);

    try {
      // Get the invitation token that was just created
      const invitation = await RoomInvitation.findOne({
        room: roomId,
        invitedUser: invitedUserId,
        status: "pending",
      }).sort({ createdAt: -1 });

      if (!invitation) {
        throw new NotFoundError("Invitation not found");
      }

      console.log("🔍 Found invitation:", {
        id: invitation._id,
        token: invitation.token,
        hasToken: !!invitation.token,
      });

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

      // Send email invitation with token
      const emailService = new EmailService();
      await emailService.sendRoomInvitationEmail(
        invitedUser.email,
        inviter?.name || "A team member",
        invitedUser.name,
        room.name,
        room.workspace.name,
        roomId,
        invitation.token,
        room.workspace._id || room.workspace
      );

      console.log(
        `📧 Email invitation sent to ${invitedUser.email} for encrypted room ${room.name}`
      );
    } catch (error) {
      console.error("Failed to send room invitation email:", error);
      // Don't fail the invitation process if email sending fails
    }
  }

  /**
   * Accept room invitation by ID
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

    // Add user to room with encryption key
    const room = await ChatRoom.findById(invitation.room);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Generate public key for the new member if room is encrypted
    const publicKey = room.isEncrypted
      ? EncryptionService.generateDHKeyPair().publicKey
      : undefined;

    room.members.push({
      user: userId as any,
      role: MemberRole.MEMBER,
      joinedAt: new Date(),
      publicKey,
    });

    await room.save();

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    console.log(`🔐 User ${userId} joined encrypted room ${room.name}`);
  }

  /**
   * Accept room invitation by token
   */
  async acceptRoomInvitationByToken(
    token: string,
    userId: string
  ): Promise<{ roomId: string; roomName: string }> {
    const invitation = await RoomInvitation.findOne({
      token,
      status: "pending",
    });

    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.invitedUser.toString() !== userId) {
      throw new AuthorizationError("This invitation is not for you");
    }

    if (invitation.expiresAt < new Date()) {
      throw new ValidationError("Invitation has expired");
    }

    // Add user to room with encryption key
    const room = await ChatRoom.findById(invitation.room);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is already a member
    const isMember = room.members.some(
      (member: any) => member.user && member.user.toString() === userId
    );

    if (!isMember) {
      // Generate public key for the new member if room is encrypted
      const publicKey = room.isEncrypted
        ? EncryptionService.generateDHKeyPair().publicKey
        : undefined;

      room.members.push({
        user: userId as any,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
        publicKey,
      });

      await room.save();
    }

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    console.log(
      `🔐 User ${userId} joined encrypted room ${room.name} via token`
    );

    return {
      roomId: room._id.toString(),
      roomName: room.name,
    };
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
