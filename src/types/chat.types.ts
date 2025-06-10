import type { Types } from "mongoose";

export type ChatRoomType = "direct" | "group" | "workspace";
export type MessageType = "text" | "file" | "image" | "system";
export type ReactionType =
  | "like"
  | "love"
  | "laugh"
  | "wow"
  | "sad"
  | "angry"
  | "thumbsup"
  | "thumbsdown"
  | "custom";

export interface CreateChatRoomData {
  workspaceId: string;
  name: string;
  description?: string;
  type: ChatRoomType;
  participants: string[];
  isPrivate?: boolean;
}

export interface UpdateChatRoomData {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

export interface SendMessageData {
  roomId: string;
  content: string;
  messageType?: MessageType;
  replyTo?: string;
  mentions?: string[];
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface MessageReaction {
  user: string | { id: string; name: string; email: string; avatar?: string };
  type: ReactionType;
  emoji?: string;
  createdAt: Date;
}

export interface MessageEncryptionData {
  iv: string;
  tag: string;
  senderPublicKey: string;
}

export interface EncryptedMessageData {
  content: string;
  encryptionData: MessageEncryptionData;
}

export interface MessageReadStatus {
  user: string | Types.ObjectId;
  readAt: Date;
}

export interface DecryptedMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  messageType: MessageType;
  replyTo?: DecryptedMessagePreview | null;
  mentions: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  isEdited: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  readBy: MessageReadStatus[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DecryptedMessagePreview {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  messageType: MessageType;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoom {
  _id: string;
  name: string;
  description?: string;
  type: ChatRoomType;
  workspace: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    role: string;
    joinedAt: Date;
  }>;
  isPrivate: boolean;
  lastMessage?: DecryptedMessage;
  unreadCount: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoomResponse extends ChatRoom {}

export interface ChatRoomsResponse {
  rooms: ChatRoom[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface MessagesResponse {
  messages: DecryptedMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SocketMessagePayload {
  roomId: string;
  message: {
    content: string;
    messageType?: MessageType;
    replyTo?: string;
    mentions?: string[];
    attachments?: MessageAttachment[];
  };
}

export interface SocketReactionPayload {
  roomId: string;
  messageId: string;
  reactionType: ReactionType;
  emoji?: string;
}

export interface SocketTypingPayload {
  roomId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ChatRoomMember {
  user: Types.ObjectId | string;
  role: string;
  joinedAt: Date;
}

export interface UserKeyPairData {
  publicKey: string;
  privateKeyEncrypted: string;
  keyVersion: number;
}

export interface ChatRoomKeyData {
  roomId: string;
  encryptedRoomKey: string;
  keyVersion: number;
}
