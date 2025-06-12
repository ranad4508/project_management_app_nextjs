import mongoose, { Schema, type Document } from "mongoose";
import { MessageType, ReactionType } from "@/src/types/chat.types";

export interface IChatMessage extends Document {
  room: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: MessageType;
  content: string;
  encryptedContent?: {
    encryptedContent: string;
    iv: string;
    keyId: string;
  };
  attachments?: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    encryptedUrl?: string;
  }[];
  reactions: {
    user: mongoose.Types.ObjectId;
    type: ReactionType;
    createdAt: Date;
  }[];
  replyTo?: mongoose.Types.ObjectId;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    content: {
      type: String,
      required: true,
    },
    encryptedContent: {
      encryptedContent: String,
      iv: String,
      keyId: String,
    },
    attachments: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        url: { type: String, required: true },
        encryptedUrl: String,
      },
    ],
    reactions: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        type: {
          type: String,
          enum: Object.values(ReactionType),
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    editedAt: Date,
    deletedAt: Date,
  },
  { timestamps: true }
);

// Indexes
ChatMessageSchema.index({ room: 1, createdAt: -1 });
ChatMessageSchema.index({ sender: 1 });
ChatMessageSchema.index({ deletedAt: 1 });

export const ChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
