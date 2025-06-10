import { ChatRoom, ChatMessage } from "@/src/models/chat";
import { Workspace } from "@/src/models/workspace";
import { EncryptionService } from "./encryption.service";
import { NotificationService } from "./notification.service";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "@/src/errors/AppError";
import { NotificationType } from "@/src/enums/notification.enum";
import type {
  CreateChatRoomData,
  UpdateChatRoomData,
  SendMessageData,
  DecryptedMessage,
  DecryptedMessagePreview,
  ReactionType,
  MessageReaction,
} from "@/src/types/chat.types";
import type { PaginationParams } from "@/src/types/api.types";
import { socketService } from "@/src/config/socket";

export class ChatService {
  private encryptionService: EncryptionService;
  private notificationService: NotificationService;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new chat room with encryption
   */
  async createChatRoom(userId: string, data: CreateChatRoomData) {
    const {
      workspaceId,
      name,
      description,
      type,
      participants,
      isPrivate = false,
    } = data;

    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId).populate(
      "members.user"
    );
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Check if user is workspace member
    const isWorkspaceMember = workspace.members.some(
      (member: any) => member.user._id.toString() === userId
    );
    if (!isWorkspaceMember) {
      throw new AuthorizationError("Access denied to workspace");
    }

    // Get all workspace member IDs for validation
    const workspaceMemberIds = workspace.members.map((member: any) =>
      member.user._id.toString()
    );

    // For workspace type rooms, include all workspace members
    let allParticipants: string[];
    if (type === "workspace") {
      allParticipants = workspaceMemberIds;
    } else {
      // Validate participants are workspace members
      const validParticipants = participants.filter((participantId) =>
        workspaceMemberIds.includes(participantId)
      );
      if (validParticipants.length !== participants.length) {
        throw new ValidationError(
          "Some participants are not workspace members"
        );
      }
      // Ensure creator is included in participants
      allParticipants = [...new Set([userId, ...validParticipants])];
    }

    // For direct messages, ensure only 2 participants
    if (type === "direct" && allParticipants.length !== 2) {
      throw new ValidationError(
        "Direct messages must have exactly 2 participants"
      );
    }

    // Check if direct message room already exists
    if (type === "direct") {
      const existingRoom = await ChatRoom.findOne({
        workspace: workspaceId,
        type: "direct",
        participants: { $all: allParticipants, $size: 2 },
      });

      if (existingRoom) {
        await existingRoom.populate("participants", "name email avatar");
        await existingRoom.populate("createdBy", "name email avatar");
        return existingRoom;
      }
    }

    // Create chat room
    const chatRoom = new ChatRoom({
      workspace: workspaceId,
      name: type === "direct" ? "Direct Message" : name,
      description,
      type,
      participants: allParticipants,
      admins: [userId],
      isPrivate,
      createdBy: userId,
      lastActivity: new Date(),
    });

    await chatRoom.save();

    // Generate and distribute room encryption key
    await this.encryptionService.generateRoomKey(
      chatRoom._id.toString(),
      allParticipants
    );

    // Populate participants
    await chatRoom.populate("participants", "name email avatar");
    await chatRoom.populate("createdBy", "name email avatar");

    return chatRoom;
  }

  /**
   * Get workspace chat rooms for user
   */
  async getWorkspaceChatRooms(workspaceId: string, userId: string) {
    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId).populate(
      "members.user"
    );
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const isWorkspaceMember = workspace.members.some(
      (member: any) => member.user._id.toString() === userId
    );
    if (!isWorkspaceMember) {
      throw new AuthorizationError("Access denied to workspace");
    }

    const chatRooms = await ChatRoom.find({
      workspace: workspaceId,
      participants: userId,
    })
      .populate("participants", "name email avatar")
      .populate("lastMessage")
      .populate("createdBy", "name email avatar")
      .sort({ lastActivity: -1 });

    return chatRooms;
  }

  /**
   * Get chat room by ID
   */
  async getChatRoomById(roomId: string, userId: string) {
    const chatRoom = await ChatRoom.findById(roomId)
      .populate("participants", "name email avatar")
      .populate("admins", "name email avatar")
      .populate("createdBy", "name email avatar");

    if (!chatRoom) {
      throw new NotFoundError("Chat room not found");
    }

    if (!chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied to chat room");
    }

    return chatRoom;
  }

  /**
   * Update chat room
   */
  async updateChatRoom(
    roomId: string,
    userId: string,
    data: UpdateChatRoomData
  ) {
    const chatRoom = await ChatRoom.findById(roomId);

    if (!chatRoom) {
      throw new NotFoundError("Chat room not found");
    }

    if (!chatRoom.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required");
    }

    Object.assign(chatRoom, data);
    await chatRoom.save();

    return chatRoom;
  }

  /**
   * Add participants to chat room
   */
  async addParticipants(
    roomId: string,
    userId: string,
    participantIds: string[]
  ) {
    const chatRoom = await ChatRoom.findById(roomId).populate("workspace");

    if (!chatRoom) {
      throw new NotFoundError("Chat room not found");
    }

    if (!chatRoom.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required");
    }

    const workspace = chatRoom.workspace as any;

    // Validate new participants are workspace members
    const validParticipants = participantIds.filter((participantId) =>
      workspace.isMember(participantId)
    );
    if (validParticipants.length !== participantIds.length) {
      throw new ValidationError("Some participants are not workspace members");
    }

    // Add new participants
    const newParticipants = validParticipants.filter(
      (participantId) =>
        !chatRoom.participants.some((p: any) => p.toString() === participantId)
    );

    if (newParticipants.length === 0) {
      throw new ValidationError("All users are already participants");
    }

    chatRoom.participants.push(...newParticipants);
    await chatRoom.save();

    // Distribute room key to new participants
    await Promise.all(
      newParticipants.map((participantId) =>
        this.encryptionService.addParticipantToRoom(roomId, participantId)
      )
    );

    return chatRoom;
  }

  /**
   * Remove participant from chat room
   */
  async removeParticipant(
    roomId: string,
    userId: string,
    participantId: string
  ) {
    const chatRoom = await ChatRoom.findById(roomId);

    if (!chatRoom) {
      throw new NotFoundError("Chat room not found");
    }

    // Allow self-removal or admin removal
    const canRemove = userId === participantId || chatRoom.isAdmin(userId);
    if (!canRemove) {
      throw new AuthorizationError("Insufficient permissions");
    }

    // Cannot remove room creator
    if (chatRoom.createdBy.toString() === participantId) {
      throw new ValidationError("Cannot remove room creator");
    }

    chatRoom.participants = chatRoom.participants.filter(
      (p: any) => p.toString() !== participantId
    );
    chatRoom.admins = chatRoom.admins.filter(
      (a: any) => a.toString() !== participantId
    );

    await chatRoom.save();

    // Revoke room access
    await this.encryptionService.removeParticipantFromRoom(
      roomId,
      participantId
    );

    return chatRoom;
  }

  /**
   * Send encrypted message to chat room
   */
  async sendMessage(userId: string, password: string, data: SendMessageData) {
    const {
      roomId,
      content,
      messageType = "text",
      replyTo,
      mentions = [],
      attachments = [],
    } = data;

    // Verify room access
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied to chat room");
    }

    // Encrypt message content
    const { content: encryptedContent, encryptionData } =
      await this.encryptionService.encryptMessage(
        content,
        roomId,
        userId,
        password
      );

    // Validate mentions are room participants
    const validMentions = mentions.filter((mentionId) =>
      chatRoom.isParticipant(mentionId)
    );

    // Create message
    const message = new ChatMessage({
      room: roomId,
      sender: userId,
      content: encryptedContent,
      messageType,
      encryptionData,
      replyTo,
      mentions: validMentions,
      attachments,
      reactions: [],
      readBy: [{ user: userId, readAt: new Date() }],
    });

    await message.save();

    // Update room last activity and message
    chatRoom.lastMessage = message._id;
    chatRoom.lastActivity = new Date();
    await chatRoom.save();

    // Populate message data
    await message.populate("sender", "name email avatar");
    if (replyTo) {
      await message.populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name email avatar",
        },
      });
    }
    await message.populate("mentions", "name email avatar");

    // Send notifications for mentions
    if (validMentions.length > 0) {
      await Promise.all(
        validMentions.map((mentionId) =>
          this.notificationService.createNotification(
            mentionId,
            NotificationType.MENTION,
            "You were mentioned",
            `You were mentioned in ${chatRoom.name}`,
            { model: "ChatRoom", id: chatRoom._id }
          )
        )
      );
    }

    // Emit socket event for real-time updates (encrypted)
    try {
      const socketPayload = {
        roomId,
        message: {
          id: message._id.toString(),
          content: encryptedContent, // Send encrypted content
          encryptionData,
          sender: {
            id: message.sender._id.toString(),
            name: message.sender.name,
            email: message.sender.email,
            avatar: message.sender.avatar,
          },
          messageType,
          replyTo: message.replyTo
            ? await this.getReplyToData(message.replyTo)
            : null,
          mentions: message.mentions.map((mention: any) => ({
            id: mention._id.toString(),
            name: mention.name,
            email: mention.email,
            avatar: mention.avatar,
          })),
          attachments,
          reactions: [],
          isEdited: false,
          readBy: [{ user: userId, readAt: new Date() }],
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        },
      };

      socketService.emitToRoom(roomId, "message:received", socketPayload);
    } catch (error) {
      console.error("Error emitting socket event:", error);
    }

    return message;
  }

  /**
   * Get chat room messages with decryption
   */
  async getChatRoomMessages(
    roomId: string,
    userId: string,
    password: string,
    pagination: PaginationParams = {}
  ): Promise<{ messages: DecryptedMessage[]; pagination: any }> {
    // Verify room access
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied to chat room");
    }

    const { page = 1, limit = 50, sortOrder = "desc" } = pagination;
    const skip = (page - 1) * limit;
    const sort = { createdAt: sortOrder === "asc" ? 1 : -1 };

    // Get encrypted messages
    const messages = await ChatMessage.find({
      room: roomId,
      deletedAt: null,
    })
      .populate("sender", "name email avatar")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name email avatar",
        },
      })
      .populate("mentions", "name email avatar")
      .populate("reactions.user", "name email avatar")
      .sort(sort as any)
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments({
      room: roomId,
      deletedAt: null,
    });

    // Decrypt messages
    const decryptedMessages: DecryptedMessage[] = await Promise.all(
      messages.map(async (message) => {
        try {
          const decryptedContent = await this.encryptionService.decryptMessage(
            message.content,
            message.encryptionData,
            roomId,
            userId,
            password
          );

          // Format sender
          const sender = {
            id: message.sender._id.toString(),
            name: message.sender.name,
            email: message.sender.email,
            avatar: message.sender.avatar,
          };

          // Format reply if exists
          let replyToFormatted: DecryptedMessagePreview | null = null;
          if (message.replyTo) {
            const replyToMessage = message.replyTo as any;
            replyToFormatted = {
              id: replyToMessage._id.toString(),
              content: "[Encrypted Reply]", // We don't decrypt replies to avoid complexity
              sender: {
                id: replyToMessage.sender?._id?.toString() || "",
                name: replyToMessage.sender?.name || "Unknown",
                email: replyToMessage.sender?.email || "",
                avatar: replyToMessage.sender?.avatar,
              },
              messageType: replyToMessage.messageType,
              attachments: replyToMessage.attachments || [],
              reactions: [],
              isEdited: replyToMessage.isEdited || false,
              createdAt: replyToMessage.createdAt,
              updatedAt: replyToMessage.updatedAt,
            };
          }

          // Format mentions
          const mentionsFormatted = message.mentions.map((mention: any) => ({
            id: mention._id.toString(),
            name: mention.name,
            email: mention.email,
            avatar: mention.avatar,
          }));

          // Format reactions
          const reactionsFormatted: MessageReaction[] = message.reactions.map(
            (reaction: any) => ({
              user: {
                id: reaction.user._id.toString(),
                name: reaction.user.name,
                email: reaction.user.email,
                avatar: reaction.user.avatar,
              },
              type: reaction.type,
              emoji: reaction.emoji,
              createdAt: reaction.createdAt,
            })
          );

          return {
            id: message._id.toString(),
            content: decryptedContent,
            sender,
            messageType: message.messageType,
            replyTo: replyToFormatted,
            mentions: mentionsFormatted,
            attachments: message.attachments,
            reactions: reactionsFormatted,
            isEdited: message.isEdited,
            editedAt: message.editedAt,
            deletedAt: message.deletedAt,
            readBy: message.readBy,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          };
        } catch (error) {
          // If decryption fails, return placeholder
          return {
            id: message._id.toString(),
            content: "[Message could not be decrypted]",
            sender: {
              id: message.sender._id.toString(),
              name: message.sender.name,
              email: message.sender.email,
              avatar: message.sender.avatar,
            },
            messageType: message.messageType,
            replyTo: null,
            mentions: [],
            attachments: [],
            reactions: [],
            isEdited: message.isEdited,
            editedAt: message.editedAt,
            deletedAt: message.deletedAt,
            readBy: message.readBy,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          };
        }
      })
    );

    return {
      messages: decryptedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  private async getReplyToData(
    replyToId: any
  ): Promise<DecryptedMessagePreview | null> {
    try {
      const replyMessage = await ChatMessage.findById(replyToId).populate(
        "sender",
        "name email avatar"
      );

      if (!replyMessage) return null;

      return {
        id: replyMessage._id.toString(),
        content: "[Encrypted Reply]", // We don't decrypt replies to avoid complexity
        sender: {
          id: replyMessage.sender._id.toString(),
          name: replyMessage.sender.name,
          email: replyMessage.sender.email,
          avatar: replyMessage.sender.avatar,
        },
        messageType: replyMessage.messageType,
        attachments: replyMessage.attachments || [],
        reactions: [],
        isEdited: replyMessage.isEdited || false,
        createdAt: replyMessage.createdAt,
        updatedAt: replyMessage.updatedAt,
      };
    } catch (error) {
      console.error("Error getting reply data:", error);
      return null;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string, userId: string) {
    const message = await ChatMessage.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Verify room access
    const chatRoom = await ChatRoom.findById(message.room);
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied");
    }

    // Check if already read
    const alreadyRead = message.readBy.some(
      (read: any) => read.user.toString() === userId
    );
    if (alreadyRead) {
      return message;
    }

    // Add read status
    message.readBy.push({ user: userId as any, readAt: new Date() });
    await message.save();

    // Emit socket event
    socketService.emitToRoom(message.room.toString(), "message:read", {
      roomId: message.room.toString(),
      messageId,
      userId,
    });

    return message;
  }

  /**
   * Edit message
   */
  async editMessage(
    messageId: string,
    userId: string,
    password: string,
    newContent: string
  ) {
    const message = await ChatMessage.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    if (message.sender.toString() !== userId) {
      throw new AuthorizationError("Can only edit your own messages");
    }

    // Encrypt new content
    const { content: encryptedContent, encryptionData } =
      await this.encryptionService.encryptMessage(
        newContent,
        message.room.toString(),
        userId,
        password
      );

    message.content = encryptedContent;
    message.encryptionData = encryptionData;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    return message;
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await ChatMessage.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Verify room access and permissions
    const chatRoom = await ChatRoom.findById(message.room);
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied");
    }

    // Can delete own messages or admin can delete any message
    const canDelete =
      message.sender.toString() === userId || chatRoom.isAdmin(userId);
    if (!canDelete) {
      throw new AuthorizationError("Insufficient permissions");
    }

    message.deletedAt = new Date();
    await message.save();

    return message;
  }

  /**
   * Add reaction to message
   */
  async addReaction(
    messageId: string,
    userId: string,
    reactionType: ReactionType,
    emoji?: string
  ) {
    const message = await ChatMessage.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Verify room access
    const chatRoom = await ChatRoom.findById(message.room);
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied");
    }

    // Check if user already reacted with this type
    const existingReactionIndex = message.reactions.findIndex(
      (r: any) => r.user.toString() === userId && r.type === reactionType
    );

    if (existingReactionIndex !== -1) {
      // Remove existing reaction of same type
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add new reaction
      message.reactions.push({
        user: userId as any,
        type: reactionType,
        emoji,
        createdAt: new Date(),
      });
    }

    await message.save();
    await message.populate("reactions.user", "name email avatar");

    // Find the added reaction
    const addedReaction = message.reactions.find(
      (r: any) => r.user.toString() === userId && r.type === reactionType
    );

    if (addedReaction) {
      // Emit socket event
      socketService.emitToRoom(message.room.toString(), "message:reaction", {
        roomId: message.room.toString(),
        messageId,
        userId,
        reaction: {
          user: userId,
          type: reactionType,
          emoji,
          createdAt: addedReaction.createdAt,
        },
      });
    }

    return message;
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    reactionType: ReactionType
  ) {
    const message = await ChatMessage.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Verify room access
    const chatRoom = await ChatRoom.findById(message.room);
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied");
    }

    // Remove reaction
    message.reactions = message.reactions.filter(
      (r: any) => !(r.user.toString() === userId && r.type === reactionType)
    );

    await message.save();

    return message;
  }

  /**
   * Initialize user encryption keys
   */
  async initializeUserEncryption(userId: string, password: string) {
    const hasKeys = await this.encryptionService.hasValidKeyPair(userId);
    if (hasKeys) {
      return { message: "User already has encryption keys" };
    }

    const keyPair = await this.encryptionService.generateUserKeyPair(
      userId,
      password
    );
    return {
      message: "Encryption keys generated successfully",
      publicKey: keyPair.publicKey,
    };
  }

  /**
   * Auto-create default workspace chat room with encryption
   */
  async ensureWorkspaceGeneralRoom(workspaceId: string, userId: string) {
    // Check if general room already exists
    const existingRoom = await ChatRoom.findOne({
      workspace: workspaceId,
      type: "workspace",
      name: "General",
    });

    if (existingRoom) {
      return existingRoom;
    }

    // Create general room
    return this.createChatRoom(userId, {
      workspaceId,
      name: "General",
      description: "General workspace discussion",
      type: "workspace",
      participants: [], // Will be populated with all workspace members
      isPrivate: false,
    });
  }

  /**
   * Get user's chat rooms across all workspaces
   */
  async getUserChatRooms(userId: string) {
    const chatRooms = await ChatRoom.find({
      participants: userId,
    })
      .populate("workspace", "name slug")
      .populate("participants", "name email avatar")
      .populate("lastMessage")
      .sort({ lastActivity: -1 });

    return chatRooms;
  }
}
