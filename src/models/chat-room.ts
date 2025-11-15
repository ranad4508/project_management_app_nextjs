import mongoose, { Schema, type Document } from "mongoose";
import { RoomType } from "@/src/types/chat.types";
import { MemberRole } from "@/src/enums/user.enum";

export interface IChatRoom extends Document {
  name: string;
  description?: string;
  type: RoomType;
  workspace: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  members: {
    user: mongoose.Types.ObjectId;
    role: MemberRole;
    joinedAt: Date;
    lastReadAt?: Date;
    publicKey?: string;
  }[];
  isEncrypted: boolean;
  encryptionKeyId?: string;
  isArchived: boolean;
  archivedAt?: Date;
  lastMessage?: mongoose.Types.ObjectId;
  lastActivity: Date;
  settings: {
    allowFileUploads: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    messageRetention: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema = new Schema<IChatRoom>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: Object.values(RoomType),
      required: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: Object.values(MemberRole),
          default: MemberRole.MEMBER,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        lastReadAt: {
          type: Date,
        },
        publicKey: {
          type: String,
        },
      },
    ],
    isEncrypted: {
      type: Boolean,
      default: true,
    },
    encryptionKeyId: {
      type: String,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    settings: {
      allowFileUploads: {
        type: Boolean,
        default: true,
      },
      maxFileSize: {
        type: Number,
        default: 100 * 1024 * 1024, // 100MB - WhatsApp-like limit
      },
      allowedFileTypes: {
        type: [String],
        default: ["*/*"], // Accept all file types by default
      },
      messageRetention: {
        type: Number,
        default: 365, // days
      },
    },
  },
  { timestamps: true }
);

// Indexes
ChatRoomSchema.index({ workspace: 1, type: 1 });
ChatRoomSchema.index({ "members.user": 1 });
ChatRoomSchema.index({ lastActivity: -1 });
ChatRoomSchema.index(
  { workspace: 1, name: 1 },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  }
);

// Methods
ChatRoomSchema.methods.isMember = function (userId: string): boolean {
  return this.members.some((member: any) => member.user.toString() === userId);
};

ChatRoomSchema.methods.getMemberRole = function (
  userId: string
): MemberRole | null {
  const member = this.members.find(
    (member: any) => member.user.toString() === userId
  );
  return member ? member.role : null;
};

ChatRoomSchema.methods.isAdmin = function (userId: string): boolean {
  const role = this.getMemberRole(userId);
  return role === MemberRole.ADMIN || this.createdBy.toString() === userId;
};

export const ChatRoom =
  mongoose.models.ChatRoom ||
  mongoose.model<IChatRoom>("ChatRoom", ChatRoomSchema);
