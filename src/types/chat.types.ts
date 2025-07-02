import type { User } from "./workspace.types";
import type { MemberRole } from "@/src/enums/user.enum";

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
  EMOJI = "emoji",
  SYSTEM = "system",
}

export enum RoomType {
  GENERAL = "general",
  PRIVATE = "private",
}

export enum ReactionType {
  LIKE = "like",
  LOVE = "love",
  LAUGH = "laugh",
  ANGRY = "angry",
  SAD = "sad",
  THUMBS_UP = "thumbs_up",
  THUMBS_DOWN = "thumbs_down",
}

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
  sharedSecret?: string;
}

export interface KeyExchange {
  userId: string;
  publicKey: string;
  timestamp: Date;
}

export interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  keyId: string;
}

export interface MessageReaction {
  _id: string;
  user: User;
  type: ReactionType;
  roomId?: string;
  createdAt: Date;
}

export interface MessageAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  encryptedUrl?: string;
}

export interface FileAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  encryptedUrl?: string;
}

export interface ProcessedFileAttachment {
  data: number[]; // Array buffer as number array
  name: string;
  type: string;
  size: number;
  lastModified?: number;
}

export interface SocketMessageData {
  roomId: string;
  content: string;
  type?: MessageType;
  attachments?: ProcessedFileAttachment[];
  replyTo?: string;
  isEncrypted?: boolean;
}

export interface ChatMessage {
  _id: string;
  room: string;
  sender: User;
  type: MessageType;
  content: string;
  encryptedContent?: EncryptedMessage;
  attachments?: MessageAttachment[];
  reactions: MessageReaction[];
  replyTo?: string | ChatMessage; // Can be either ID string or populated message object
  isEdited?: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoom {
  _id: string;
  name: string;
  description?: string;
  type: RoomType;
  workspace: string;
  createdBy: User;
  members: RoomMember[];
  isEncrypted: boolean;
  encryptionKeyId?: string;
  isArchived: boolean;
  archivedAt?: Date;
  lastMessage?: ChatMessage;
  lastActivity: Date | string; // Date from server, string in Redux for serialization
  settings: {
    allowFileUploads: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    messageRetention: number; // days
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomMember {
  user: User;
  role: MemberRole;
  joinedAt: Date;
  lastReadAt?: Date;
  publicKey?: string;
}

export interface RoomInvitation {
  _id: string;
  room: string;
  invitedBy: User;
  invitedUser: User;
  status: "pending" | "accepted" | "declined";
  expiresAt: Date;
  createdAt: Date;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  roomId: string;
  timestamp: Date;
}

export interface OnlineUser {
  userId: string;
  userName: string;
  avatar?: string;
  lastSeen: Date;
  rooms: string[];
}

// Socket Events
export interface ServerToClientEvents {
  "message:new": (message: ChatMessage) => void;
  "message:updated": (message: ChatMessage) => void;
  "message:deleted": (messageId: string) => void;
  "reaction:added": (messageId: string, reaction: MessageReaction) => void;
  "reaction:removed": (messageId: string, reactionId: string) => void;
  "typing:start": (data: TypingIndicator) => void;
  "typing:stop": (data: TypingIndicator) => void;
  "user:online": (user: OnlineUser) => void;
  "user:offline": (userId: string) => void;
  "room:joined": (roomId: string, user: User) => void;
  "room:left": (roomId: string, userId: string) => void;
  "key:exchange": (data: KeyExchange) => void;
  "notification:new": (notification: any) => void;
  "notification:read": (data: {
    notificationId: string;
    userId: string;
  }) => void;
  "notification:all_read": (data: { userId: string }) => void;
  "notification:deleted": (data: {
    notificationId: string;
    userId: string;
  }) => void;
  "activity:new": (activity: any) => void;
  error: (error: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  "message:send": (data: SendMessageData) => void;
  "message:edit": (messageId: string, content: string) => void;
  "message:delete": (messageId: string) => void;
  "reaction:add": (messageId: string, type: ReactionType) => void;
  "reaction:remove": (messageId: string, reactionId: string) => void;
  "typing:start": (roomId: string) => void;
  "typing:stop": (roomId: string) => void;
  "room:join": (roomId: string) => void;
  "room:leave": (roomId: string) => void;
  "key:exchange": (data: KeyExchange) => void;
  "key:request": (roomId: string) => void;
  "message:read": (data: {
    roomId: string;
    messageId: string;
    userId: string;
  }) => void; // <-- add this
}

export interface SendMessageData {
  roomId: string;
  content: string;
  type: MessageType;
  attachments?: File[];
  replyTo?: string;
  isEncrypted?: boolean;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  type: RoomType;
  workspaceId: string;
  isEncrypted?: boolean;
  inviteUsers?: string[];
}

export interface UpdateRoomData {
  name?: string;
  description?: string;
  type?: RoomType;
  isEncrypted?: boolean;
  isArchived?: boolean;
  settings?: Partial<ChatRoom["settings"]>;
}

export interface RoomListResponse {
  rooms: ChatRoom[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MessageListResponse {
  messages: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
