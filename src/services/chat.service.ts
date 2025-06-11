import { Types, Document } from "mongoose";
import { ChatRoom, ChatMessage } from "@/src/models/chat";
import { EncryptionService } from "@/src/services/encryption.service";
import { ValidationError } from "@/src/errors/validation.error";
import type {
  CreateChatRoomData,
  UpdateChatRoomData,
  SendMessageData,
  ChatRoomResponse,
  MessagesResponse,
  DecryptedMessage,
  ReactionType,
} from "@/src/types/chat.types";
import type { PaginationParams } from "@/src/types/api.types";

// Interface for lean ChatRoom document
interface LeanChatRoom {
  _id: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  name: string;
  description?: string;
  type: "group" | "workspace";
  participants: {
    user: { _id: Types.ObjectId; name: string };
    joinedAt: Date;
  }[];
  isPrivate: boolean;
  unreadCount: { user: Types.ObjectId; count: number }[];
  createdBy: { _id: Types.ObjectId; name: string };
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

// Interface for lean ChatMessage document
interface LeanChatMessage {
  _id: Types.ObjectId;
  room: Types.ObjectId;
  sender: { _id: Types.ObjectId; name: string; avatar?: string };
  content: string;
  messageType: "text" | "attachment";
  encryptionData: {
    iv: string;
    tag: string;
    senderPublicKey: string;
    salt?: string;
  };
  replyTo?: Types.ObjectId;
  mentions?: Types.ObjectId[];
  attachments: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize: number;
  }[];
  reactions: { user: Types.ObjectId; type: string; emoji?: string }[];
  isEdited: boolean;
  readBy: { user: Types.ObjectId; readAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export class ChatService {
  public encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  async createChatRoom(
    userId: string,
    data: CreateChatRoomData,
    password: string
  ): Promise<ChatRoomResponse> {
    const room = new ChatRoom({
      workspaceId: data.workspaceId
        ? new Types.ObjectId(data.workspaceId)
        : undefined,
      name: data.name,
      description: data.description,
      type: data.type,
      participants: [
        { user: new Types.ObjectId(userId), joinedAt: new Date() },
        ...data.participants.map((id) => ({
          user: new Types.ObjectId(id),
          joinedAt: new Date(),
        })),
      ],
      isPrivate: data.isPrivate,
      createdBy: new Types.ObjectId(userId),
      unreadCount: [],
    });

    await room.save();

    // Initialize encryption for all participants
    for (const participant of room.participants) {
      await this.encryptionService.addParticipantToRoom(
        room._id.toString(),
        participant.user.toString(),
        password
      );
    }

    const populatedRoom = (await ChatRoom.findById(room._id)
      .populate("participants.user", "name")
      .populate("createdBy", "name")
      .lean()) as LeanChatRoom;

    return this.mapToChatRoomResponse(populatedRoom);
  }

  async getUserChatRooms(userId: string): Promise<ChatRoomResponse[]> {
    const rooms = (await ChatRoom.find({
      participants: { $elemMatch: { user: new Types.ObjectId(userId) } },
    })
      .populate("participants.user", "name")
      .populate("createdBy", "name")
      .lean()) as LeanChatRoom[];

    return rooms.map((room: any) => this.mapToChatRoomResponse(room));
  }

  async getWorkspaceChatRooms(
    workspaceId: string,
    userId: string
  ): Promise<ChatRoomResponse[]> {
    const rooms = (await ChatRoom.find({
      workspaceId: new Types.ObjectId(workspaceId),
      participants: { $elemMatch: { user: new Types.ObjectId(userId) } },
    })
      .populate("participants.user", "name")
      .populate("createdBy", "name")
      .lean()) as LeanChatRoom[];

    return rooms.map((room: any) => this.mapToChatRoomResponse(room));
  }

  async getChatRoomById(
    roomId: string,
    userId: string
  ): Promise<ChatRoomResponse> {
    const room = (await ChatRoom.findOne({
      _id: new Types.ObjectId(roomId),
      participants: { $elemMatch: { user: new Types.ObjectId(userId) } },
    })
      .populate("participants.user", "name")
      .populate("createdBy", "name")
      .lean()) as LeanChatRoom;

    if (!room) {
      throw new ValidationError("Room not found or access denied", 404);
    }

    return this.mapToChatRoomResponse(room);
  }

  async updateChatRoom(
    roomId: string,
    userId: string,
    data: UpdateChatRoomData
  ): Promise<ChatRoomResponse> {
    const room = (await ChatRoom.findOneAndUpdate(
      {
        _id: new Types.ObjectId(roomId),
        participants: { $elemMatch: { user: new Types.ObjectId(userId) } },
      },
      { $set: data },
      { new: true }
    )
      .populate("participants.user", "name")
      .populate("createdBy", "name")
      .lean()) as LeanChatRoom;

    if (!room) {
      throw new ValidationError("Room not found or access denied", 404);
    }

    return this.mapToChatRoomResponse(room);
  }

  async addParticipantsToRoom(
    roomId: string,
    userId: string,
    participantIds: string[],
    password: string
  ): Promise<ChatRoomResponse> {
    const room = await ChatRoom.findOne({
      _id: new Types.ObjectId(roomId),
      participants: { $elemMatch: { user: new Types.ObjectId(userId) } },
    });

    if (!room) {
      throw new ValidationError("Invalid room ID or access denied", 400);
    }

    const newParticipants = participantIds
      .filter(
        (id) =>
          !room.participants.some((p: any) => p.user.toString() === id) &&
          id !== userId
      )
      .map((id) => ({
        user: new Types.ObjectId(id),
        joinedAt: new Date(),
      }));

    if (newParticipants.length === 0) {
      throw new ValidationError("No new participants to add", 400);
    }

    room.participants.push(...newParticipants);
    await room.save();

    for (const id of participantIds) {
      await this.encryptionService.addParticipantToRoom(roomId, id, password);
    }

    const populatedRoom = (await ChatRoom.findById(room._id)
      .populate("participants.user", "name")
      .populate("createdBy", "name")
      .lean()) as LeanChatRoom;

    return this.mapToChatRoomResponse(populatedRoom);
  }

  async removeParticipantFromRoom(
    roomId: string,
    userId: string,
    participantId: string
  ): Promise<ChatRoomResponse> {
    const room = await ChatRoom.findOne({
      _id: new Types.ObjectId(roomId),
      participants: { $elemMatch: { user: new Types.ObjectId(userId) } },
    });
    if (!room) {
      throw new ValidationError("Room not found or access denied", 404);
    }

    room.participants = room.participants.filter(
      (p: any) => p.user.toString() !== participantId
    );
    await room.save();

    const populatedRoom = (await ChatRoom.findById(room._id)
      .populate("participants.user", "name")
      .populate("createdBy", "name")
      .lean()) as LeanChatRoom;

    return this.mapToChatRoomResponse(populatedRoom);
  }

  async sendMessage(
    userId: string,
    data: SendMessageData,
    password: string
  ): Promise<DecryptedMessage> {
    const room = await ChatRoom.findById(data.roomId);
    if (
      !room ||
      !room.participants.some((p: any) => p.user.toString() === userId)
    ) {
      throw new ValidationError("Room not found or access denied", 404);
    }

    const encrypted = await this.encryptionService.encryptMessage(
      data.content || "",
      data.roomId,
      userId,
      password
    );

    const message = new ChatMessage({
      room: new Types.ObjectId(data.roomId),
      sender: new Types.ObjectId(userId),
      content: encrypted.content,
      messageType: data.messageType,
      encryptionData: encrypted.encryptionData,
      replyTo: data.replyTo ? new Types.ObjectId(data.replyTo) : undefined,
      mentions: data.mentions?.map((id) => new Types.ObjectId(id)) || [],
      attachments: data.attachments || [],
      reactions: [],
      readBy: [{ user: new Types.ObjectId(userId), readAt: new Date() }],
    });

    await message.save();

    room.lastMessage = message._id;
    room.unreadCount = room.participants.map((p: any) => ({
      user: p.user,
      count:
        p.user.toString() === userId
          ? 0
          : (room.unreadCount.find(
              (u: any) => u.user.toString() === p.user.toString()
            )?.count || 0) + 1,
    }));
    await room.save();

    const decrypted = await this.encryptionService.decryptMessage(
      message.content,
      message.encryptionData,
      data.roomId,
      userId,
      password
    );

    interface PopulatedSender {
      sender: {
        name: string;
        avatar?: string;
      };
    }

    const populatedSender = (await ChatMessage.findById(message._id)
      .populate("sender", "name avatar")
      .lean()) as unknown as PopulatedSender;

    return {
      id: message._id.toString(),
      room: data.roomId,
      content: decrypted,
      sender: {
        id: userId,
        name: populatedSender?.sender.name || "",
        avatar: populatedSender?.sender.avatar || "",
      },
      messageType: data.messageType,
      replyTo: message.replyTo?.toString(),
      mentions: message.mentions?.map((m: any) => m.toString()) || [],
      attachments: message.attachments,
      reactions: [],
      isEdited: false,
      readBy: [{ user: userId, readAt: new Date() }],
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  async getChatRoomMessages(
    roomId: string,
    userId: string,
    password: string,
    pagination: PaginationParams
  ): Promise<MessagesResponse> {
    const room = await ChatRoom.findById(roomId);
    if (
      !room ||
      !room.participants.some((p: any) => p.user.toString() === userId)
    ) {
      throw new ValidationError("Room not found or access denied", 404);
    }

    const { page = 1, limit = 50, sortOrder = "asc" } = pagination;
    const skip = (page - 1) * limit;

    const messages = (await ChatMessage.find({
      room: new Types.ObjectId(roomId),
    })
      .sort({ createdAt: sortOrder === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name avatar")
      .lean()) as LeanChatMessage[];

    const decryptedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        const decrypted = await this.encryptionService.decryptMessage(
          msg.content,
          msg.encryptionData,
          roomId,
          userId,
          password
        );
        return {
          id: msg._id.toString(),
          room: roomId,
          content: decrypted,
          sender: {
            id: msg.sender._id.toString(),
            name: msg.sender.name,
            avatar: msg.sender.avatar,
          },
          messageType: msg.messageType,
          replyTo: msg.replyTo?.toString(),
          mentions: msg.mentions?.map((m: any) => m.toString()) || [],
          attachments: msg.attachments,
          reactions: msg.reactions.map((r: any) => ({
            user: r.user.toString(),
            type: r.type,
            emoji: r.emoji,
          })),
          isEdited: msg.isEdited,
          readBy: msg.readBy.map((r: any) => ({
            user: r.user.toString(),
            readAt: r.readAt,
          })),
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        } as DecryptedMessage;
      })
    );

    const total = await ChatMessage.countDocuments({
      room: new Types.ObjectId(roomId),
    });

    return {
      messages: decryptedMessages,
      pagination: {
        total,
        page,
        limit,
      },
    };
  }

  async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const message = await ChatMessage.findById(messageId).populate("room");
    if (
      !message ||
      !((message.room as any).participants as any[]).some(
        (p: any) => p.user.toString() === userId
      )
    ) {
      throw new ValidationError("Message not found or access denied", 404);
    }

    if (!message.readBy.some((r: any) => r.user.toString() === userId)) {
      message.readBy.push({
        user: new Types.ObjectId(userId),
        readAt: new Date(),
      });
      await message.save();

      const room = await ChatRoom.findById(message.room);
      if (room) {
        room.unreadCount = room.unreadCount.map((u: any) =>
          u.user.toString() === userId
            ? { user: u.user, count: Math.max(0, u.count - 1) }
            : u
        );
        await room.save();
      }
    }

    return { success: true, message: "Message marked as read" };
  }

  async editMessage(
    messageId: string,
    userId: string,
    content: string,
    password: string
  ): Promise<DecryptedMessage> {
    const message = await ChatMessage.findOne({
      _id: new Types.ObjectId(messageId),
      sender: new Types.ObjectId(userId),
    }).populate("room sender");
    if (!message) {
      throw new ValidationError("Message not found or access denied", 404);
    }

    const encrypted = await this.encryptionService.encryptMessage(
      content,
      (message.room as any)._id.toString(),
      userId,
      password
    );

    message.content = encrypted.content;
    message.encryptionData = encrypted.encryptionData;
    message.isEdited = true;
    await message.save();

    const decrypted = await this.encryptionService.decryptMessage(
      message.content,
      message.encryptionData,
      (message.room as any)._id.toString(),
      userId,
      password
    );

    return {
      id: message._id.toString(),
      room: (message.room as any)._id.toString(),
      content: decrypted,
      sender: {
        id: (message.sender as any)._id.toString(),
        name: (message.sender as any).name,
        avatar: (message.sender as any).avatar,
      },
      messageType: message.messageType,
      replyTo: message.replyTo?.toString(),
      mentions: message.mentions?.map((m: any) => m.toString()) || [],
      attachments: message.attachments,
      reactions: message.reactions.map((r: any) => ({
        user: r.user.toString(),
        type: r.type,
        emoji: r.emoji,
      })),
      isEdited: true,
      readBy: message.readBy.map((r: any) => ({
        user: r.user.toString(),
        readAt: r.readAt,
      })),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const message = await ChatMessage.findOne({
      _id: new Types.ObjectId(messageId),
      sender: new Types.ObjectId(userId),
    });
    if (!message) {
      throw new ValidationError("Message not found or access denied", 404);
    }

    await message.deleteOne();
    return { success: true, message: "Message deleted" };
  }

  async addReaction(
    messageId: string,
    userId: string,
    type: ReactionType,
    emoji?: string
  ): Promise<DecryptedMessage> {
    const message = await ChatMessage.findById(messageId).populate(
      "room sender"
    );
    if (
      !message ||
      !((message.room as any).participants as any[]).some(
        (p: any) => p.user.toString() === userId
      )
    ) {
      throw new ValidationError("Message not found or access denied", 404);
    }

    if (
      !message.reactions.some(
        (r: any) => r.user.toString() === userId && r.type === type
      )
    ) {
      message.reactions.push({ user: new Types.ObjectId(userId), type, emoji });
      await message.save();
    }

    const decrypted = await this.encryptionService.decryptMessage(
      message.content,
      message.encryptionData,
      (message.room as any)._id.toString(),
      userId,
      "password" // Controller provides password
    );

    return {
      id: message._id.toString(),
      room: (message.room as any)._id.toString(),
      content: decrypted,
      sender: {
        id: (message.sender as any)._id.toString(),
        name: (message.sender as any).name,
        avatar: (message.sender as any).avatar,
      },
      messageType: message.messageType,
      replyTo: message.replyTo?.toString(),
      mentions: message.mentions?.map((m: any) => m.toString()) || [],
      attachments: message.attachments,
      reactions: message.reactions.map((r: any) => ({
        user: r.user.toString(),
        type: r.type,
        emoji: r.emoji,
      })),
      isEdited: message.isEdited,
      readBy: message.readBy.map((r: any) => ({
        user: r.user.toString(),
        readAt: r.readAt,
      })),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  async removeReaction(
    messageId: string,
    userId: string,
    reactionType: string
  ): Promise<DecryptedMessage> {
    const message = await ChatMessage.findById(messageId).populate(
      "room sender"
    );
    if (
      !message ||
      !((message.room as any).participants as any[]).some(
        (p: any) => p.user.toString() === userId
      )
    ) {
      throw new ValidationError("Message not found or access denied", 404);
    }

    message.reactions = message.reactions.filter(
      (r: any) => !(r.user.toString() === userId && r.type === reactionType)
    );
    await message.save();

    const decrypted = await this.encryptionService.decryptMessage(
      message.content,
      message.encryptionData,
      (message.room as any)._id.toString(),
      userId,
      "password" // Controller provides password
    );

    return {
      id: message._id.toString(),
      room: (message.room as any)._id.toString(),
      content: decrypted,
      sender: {
        id: (message.sender as any)._id.toString(),
        name: (message.sender as any).name,
        avatar: (message.sender as any).avatar,
      },
      messageType: message.messageType,
      replyTo: message.replyTo?.toString(),
      mentions: message.mentions?.map((m: any) => m.toString()) || [],
      attachments: message.attachments,
      reactions: message.reactions.map((r: any) => ({
        user: r.user.toString(),
        type: r.type,
        emoji: r.emoji,
      })),
      isEdited: message.isEdited,
      readBy: message.readBy.map((r: any) => ({
        user: r.user.toString(),
        readAt: r.readAt,
      })),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  async ensureWorkspaceGeneralRoom(
    workspaceId: string,
    userId: string,
    password: string
  ): Promise<ChatRoomResponse> {
    let room = (await ChatRoom.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      name: "General",
      type: "workspace",
    }).lean()) as LeanChatRoom;

    if (!room) {
      const newRoom = await this.createChatRoom(
        userId,
        {
          workspaceId,
          name: "General",
          type: "workspace",
          participants: [],
          isPrivate: false,
        },
        password
      );
      return newRoom;
    }

    return this.mapToChatRoomResponse(room);
  }

  private mapToChatRoomResponse(room: LeanChatRoom): ChatRoomResponse {
    return {
      _id: room._id.toString(),
      workspace: room.workspaceId?.toString() || "",
      name: room.name,
      description: room.description,
      type: room.type,
      participants: room.participants.map((p: any) => ({
        user: {
          _id: p.user._id.toString(),
          name: p.user.name,
        },
        joinedAt: p.joinedAt,
      })),
      isPrivate: room.isPrivate,
      createdBy: room.createdBy._id.toString(),
      unreadCount: room.unreadCount.map((u: any) => ({
        user: u.user.toString(),
        count: u.count,
      })),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }
}
