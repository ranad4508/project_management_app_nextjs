import { ChatRoom, ChatMessage } from "@/src/models/chat"
import { Workspace } from "@/src/models/workspace"
import { EncryptionService } from "./encryption.service"
import { NotificationService } from "./notification.service"
import { NotFoundError, AuthorizationError, ValidationError } from "@/src/errors/AppError"
import { NotificationType } from "@/src/enums/notification.enum"
import type { CreateChatRoomData, UpdateChatRoomData, SendMessageData, DecryptedMessage } from "@/src/types/chat.types"
import type { PaginationParams } from "@/src/types/api.types"

export class ChatService {
  private encryptionService: EncryptionService
  private notificationService: NotificationService

  constructor() {
    this.encryptionService = new EncryptionService()
    this.notificationService = new NotificationService()
  }

  /**
   * Create a new chat room
   */
  async createChatRoom(userId: string, data: CreateChatRoomData) {
    const { workspaceId, name, description, type, participants, isPrivate = false } = data

    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId)
    if (!workspace || !workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace")
    }

    // Validate participants are workspace members
    const validParticipants = participants.filter((participantId) => workspace.isMember(participantId))
    if (validParticipants.length !== participants.length) {
      throw new ValidationError("Some participants are not workspace members")
    }

    // Ensure creator is included in participants
    const allParticipants = [...new Set([userId, ...validParticipants])]

    // For direct messages, ensure only 2 participants
    if (type === "direct" && allParticipants.length !== 2) {
      throw new ValidationError("Direct messages must have exactly 2 participants")
    }

    // Check if direct message room already exists
    if (type === "direct") {
      const existingRoom = await ChatRoom.findOne({
        workspace: workspaceId,
        type: "direct",
        participants: { $all: allParticipants, $size: 2 },
      })

      if (existingRoom) {
        return existingRoom
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
    })

    await chatRoom.save()

    // Generate and distribute room encryption key
    await this.encryptionService.generateRoomKey(chatRoom._id.toString(), allParticipants)

    // Populate participants
    await chatRoom.populate("participants", "name email avatar")
    await chatRoom.populate("createdBy", "name email avatar")

    return chatRoom
  }

  /**
   * Get workspace chat rooms for user
   */
  async getWorkspaceChatRooms(workspaceId: string, userId: string) {
    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId)
    if (!workspace || !workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace")
    }

    const chatRooms = await ChatRoom.find({
      workspace: workspaceId,
      participants: userId,
    })
      .populate("participants", "name email avatar")
      .populate("lastMessage")
      .populate("createdBy", "name email avatar")
      .sort({ lastActivity: -1 })

    return chatRooms
  }

  /**
   * Get chat room by ID
   */
  async getChatRoomById(roomId: string, userId: string) {
    const chatRoom = await ChatRoom.findById(roomId)
      .populate("participants", "name email avatar")
      .populate("admins", "name email avatar")
      .populate("createdBy", "name email avatar")

    if (!chatRoom) {
      throw new NotFoundError("Chat room not found")
    }

    if (!chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied to chat room")
    }

    return chatRoom
  }

  /**
   * Update chat room
   */
  async updateChatRoom(roomId: string, userId: string, data: UpdateChatRoomData) {
    const chatRoom = await ChatRoom.findById(roomId)

    if (!chatRoom) {
      throw new NotFoundError("Chat room not found")
    }

    if (!chatRoom.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required")
    }

    Object.assign(chatRoom, data)
    await chatRoom.save()

    return chatRoom
  }

  /**
   * Add participants to chat room
   */
  async addParticipants(roomId: string, userId: string, participantIds: string[]) {
    const chatRoom = await ChatRoom.findById(roomId).populate("workspace")

    if (!chatRoom) {
      throw new NotFoundError("Chat room not found")
    }

    if (!chatRoom.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required")
    }

    const workspace = chatRoom.workspace as any

    // Validate new participants are workspace members
    const validParticipants = participantIds.filter((participantId) => workspace.isMember(participantId))
    if (validParticipants.length !== participantIds.length) {
      throw new ValidationError("Some participants are not workspace members")
    }

    // Add new participants
    const newParticipants = validParticipants.filter(
      (participantId) => !chatRoom.participants.some((p) => p.toString() === participantId),
    )

    if (newParticipants.length === 0) {
      throw new ValidationError("All users are already participants")
    }

    chatRoom.participants.push(...newParticipants)
    await chatRoom.save()

    // Distribute room key to new participants
    await Promise.all(
      newParticipants.map((participantId) => this.encryptionService.addParticipantToRoom(roomId, participantId)),
    )

    return chatRoom
  }

  /**
   * Remove participant from chat room
   */
  async removeParticipant(roomId: string, userId: string, participantId: string) {
    const chatRoom = await ChatRoom.findById(roomId)

    if (!chatRoom) {
      throw new NotFoundError("Chat room not found")
    }

    // Allow self-removal or admin removal
    const canRemove = userId === participantId || chatRoom.isAdmin(userId)
    if (!canRemove) {
      throw new AuthorizationError("Insufficient permissions")
    }

    // Cannot remove room creator
    if (chatRoom.createdBy.toString() === participantId) {
      throw new ValidationError("Cannot remove room creator")
    }

    chatRoom.participants = chatRoom.participants.filter((p) => p.toString() !== participantId)
    chatRoom.admins = chatRoom.admins.filter((a) => a.toString() !== participantId)

    await chatRoom.save()

    // Revoke room access
    await this.encryptionService.removeParticipantFromRoom(roomId, participantId)

    return chatRoom
  }

  /**
   * Send message to chat room
   */
  async sendMessage(userId: string, password: string, data: SendMessageData) {
    const { roomId, content, messageType = "text", replyTo, mentions = [], attachments = [] } = data

    // Verify room access
    const chatRoom = await ChatRoom.findById(roomId)
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied to chat room")
    }

    // Encrypt message content
    const { encryptedContent, encryptionData } = await this.encryptionService.encryptMessage(
      content,
      roomId,
      userId,
      password,
    )

    // Validate mentions are room participants
    const validMentions = mentions.filter((mentionId) => chatRoom.isParticipant(mentionId))

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
      readBy: [{ user: userId, readAt: new Date() }],
    })

    await message.save()

    // Update room last activity and message
    chatRoom.lastMessage = message._id
    chatRoom.lastActivity = new Date()
    await chatRoom.save()

    // Populate message data
    await message.populate("sender", "name email avatar")
    await message.populate("replyTo")
    await message.populate("mentions", "name email avatar")

    // Send notifications for mentions
    if (validMentions.length > 0) {
      await Promise.all(
        validMentions.map((mentionId) =>
          this.notificationService.createNotification(
            mentionId,
            NotificationType.MENTION,
            "You were mentioned",
            `You were mentioned in ${chatRoom.name}`,
            { model: "ChatRoom", id: chatRoom._id },
          ),
        ),
      )
    }

    return message
  }

  /**
   * Get chat room messages
   */
  async getChatRoomMessages(
    roomId: string,
    userId: string,
    password: string,
    pagination: PaginationParams = {},
  ): Promise<{ messages: DecryptedMessage[]; pagination: any }> {
    // Verify room access
    const chatRoom = await ChatRoom.findById(roomId)
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied to chat room")
    }

    const { page = 1, limit = 50, sortOrder = "desc" } = pagination
    const skip = (page - 1) * limit
    const sort = { createdAt: sortOrder === "asc" ? 1 : -1 }

    // Get encrypted messages
    const messages = await ChatMessage.find({
      room: roomId,
      deletedAt: null,
    })
      .populate("sender", "name email avatar")
      .populate("replyTo")
      .populate("mentions", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const total = await ChatMessage.countDocuments({
      room: roomId,
      deletedAt: null,
    })

    // Decrypt messages
    const decryptedMessages: DecryptedMessage[] = await Promise.all(
      messages.map(async (message) => {
        try {
          const decryptedContent = await this.encryptionService.decryptMessage(
            message.content,
            message.encryptionData,
            roomId,
            userId,
            password,
          )

          return {
            id: message._id.toString(),
            content: decryptedContent,
            sender: message.sender,
            messageType: message.messageType,
            replyTo: message.replyTo,
            mentions: message.mentions,
            attachments: message.attachments,
            isEdited: message.isEdited,
            editedAt: message.editedAt,
            deletedAt: message.deletedAt,
            readBy: message.readBy,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          }
        } catch (error) {
          // If decryption fails, return placeholder
          return {
            id: message._id.toString(),
            content: "[Message could not be decrypted]",
            sender: message.sender,
            messageType: message.messageType,
            replyTo: message.replyTo,
            mentions: message.mentions,
            attachments: message.attachments,
            isEdited: message.isEdited,
            editedAt: message.editedAt,
            deletedAt: message.deletedAt,
            readBy: message.readBy,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          }
        }
      }),
    )

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
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string, userId: string) {
    const message = await ChatMessage.findById(messageId)

    if (!message) {
      throw new NotFoundError("Message not found")
    }

    // Verify room access
    const chatRoom = await ChatRoom.findById(message.room)
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied")
    }

    // Check if already read
    const alreadyRead = message.readBy.some((read) => read.user.toString() === userId)
    if (alreadyRead) {
      return message
    }

    // Add read status
    message.readBy.push({ user: userId as any, readAt: new Date() })
    await message.save()

    return message
  }

  /**
   * Edit message
   */
  async editMessage(messageId: string, userId: string, password: string, newContent: string) {
    const message = await ChatMessage.findById(messageId)

    if (!message) {
      throw new NotFoundError("Message not found")
    }

    if (message.sender.toString() !== userId) {
      throw new AuthorizationError("Can only edit your own messages")
    }

    // Encrypt new content
    const { encryptedContent, encryptionData } = await this.encryptionService.encryptMessage(
      newContent,
      message.room.toString(),
      userId,
      password,
    )

    message.content = encryptedContent
    message.encryptionData = encryptionData
    message.isEdited = true
    message.editedAt = new Date()

    await message.save()

    return message
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await ChatMessage.findById(messageId)

    if (!message) {
      throw new NotFoundError("Message not found")
    }

    // Verify room access and permissions
    const chatRoom = await ChatRoom.findById(message.room)
    if (!chatRoom || !chatRoom.isParticipant(userId)) {
      throw new AuthorizationError("Access denied")
    }

    // Can delete own messages or admin can delete any message
    const canDelete = message.sender.toString() === userId || chatRoom.isAdmin(userId)
    if (!canDelete) {
      throw new AuthorizationError("Insufficient permissions")
    }

    message.deletedAt = new Date()
    await message.save()

    return message
  }

  /**
   * Initialize user encryption keys
   */
  async initializeUserEncryption(userId: string, password: string) {
    const hasKeys = await this.encryptionService.hasValidKeyPair(userId)
    if (hasKeys) {
      return { message: "User already has encryption keys" }
    }

    const keyPair = await this.encryptionService.generateUserKeyPair(userId, password)
    return {
      message: "Encryption keys generated successfully",
      publicKey: keyPair.publicKey,
    }
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
      .sort({ lastActivity: -1 })

    return chatRooms
  }
}
