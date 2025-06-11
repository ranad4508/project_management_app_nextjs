import type { Types } from "mongoose";

export interface MessageEncryptionData {
  iv: string;
  tag: string;
  senderPublicKey: string;
  salt?: any;
}

export interface EncryptedMessageData {
  content: string;
  encryptionData: MessageEncryptionData;
}

export interface DecryptedMessage {
  id: string;
  room: string;
  sender: { id: string; name: string; avatar?: string };
  content: string;
  messageType: "text" | "attachment";
  replyTo?: string;
  mentions?: string[];
  attachments?: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize: number;
  }[];
  reactions: { user: string; type: string; emoji?: string }[];
  isEdited: boolean;
  readBy: { user: string; readAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoomResponse {
  _id: string;
  workspace?: string;
  name: string;
  description?: string;
  type: "group" | "workspace";
  participants: {
    user: { _id: string; name: string };
    joinedAt: Date;
  }[];
  isPrivate: boolean;
  createdBy: string;
  lastMessage?: string;
  unreadCount: { user: string; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoomsResponse {
  rooms: ChatRoomResponse[];
}

export interface MessagesResponse {
  messages: DecryptedMessage[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface CreateChatRoomData {
  workspaceId?: string;
  name: string;
  description?: string;
  type: "group" | "workspace";
  participants: string[];
  isPrivate: boolean;
}

export interface UpdateChatRoomData {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

export interface SendMessageData {
  roomId: string;
  content: string;
  messageType: "text" | "attachment";
  replyTo?: string;
  mentions?: string[];
  attachments?: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize: number;
  }[];
}

export interface SocketMessagePayload {
  roomId: string;
  message: DecryptedMessage;
}

export interface SocketTypingPayload {
  roomId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface SocketReactionPayload {
  roomId: string;
  messageId: string;
  userId: string;
  type: string;
  emoji?: string;
}

export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export interface UserKeyPairData {
  publicKey: string;
  privateKeyEncrypted: string;
  keyVersion: number;
}

export interface ChatRoomKeyData {
  roomId: string;
  user: string;
  encryptedRoomKey: string;
  sharedSecret?: string;
  keyVersion: number;
}
