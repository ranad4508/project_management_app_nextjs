import { Schema, model, models, type Document } from "mongoose";
import type { Types } from "mongoose";

interface IChatMessage extends Document {
  room: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  messageType: "text" | "attachment";
  encryptionData: {
    iv: string;
    tag: string;
    senderPublicKey: string;
    salt?: string; // Added to support EncryptionUtils
  };
  replyTo?: Types.ObjectId;
  mentions?: Types.ObjectId[];
  attachments?: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize: number;
  }[];
  reactions: {
    user: Types.ObjectId;
    type: string;
    emoji?: string;
  }[];
  isEdited: boolean;
  readBy: { user: Types.ObjectId; readAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    messageType: {
      type: String,
      enum: ["text", "attachment"],
      default: "text",
    },
    encryptionData: {
      iv: { type: String, required: true },
      tag: { type: String, required: true },
      senderPublicKey: { type: String, required: true },
      salt: { type: String }, // Added to support salting
    },
    replyTo: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    attachments: [
      {
        fileName: { type: String },
        fileType: { type: String },
        fileUrl: { type: String },
        fileSize: { type: Number },
      },
    ],
    reactions: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, required: true },
        emoji: { type: String },
      },
    ],
    isEdited: { type: Boolean, default: false },
    readBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

interface IChatRoom extends Document {
  workspace?: Types.ObjectId;
  name: string;
  description?: string;
  type: "group" | "workspace";
  participants: { user: Types.ObjectId; joinedAt: Date }[];
  isPrivate: boolean;
  createdBy: Types.ObjectId;
  lastMessage?: Types.ObjectId;
  unreadCount: { user: Types.ObjectId; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema = new Schema<IChatRoom>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace" },
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["group", "workspace"], required: true },
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    isPrivate: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
    unreadCount: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        count: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

// Add indexes for frequent queries
ChatRoomSchema.index({ workspace: 1, participants: 1 });

export const ChatMessage =
  models.ChatMessage || model<IChatMessage>("ChatMessage", ChatMessageSchema);
export const ChatRoom =
  models.ChatRoom || model<IChatRoom>("ChatRoom", ChatRoomSchema);
