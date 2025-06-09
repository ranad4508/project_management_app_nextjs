import mongoose, { Schema, type Document } from "mongoose"

export interface IChatRoom extends Document {
  workspace: mongoose.Types.ObjectId
  name: string
  description?: string
  type: "direct" | "group" | "workspace"
  participants: mongoose.Types.ObjectId[]
  admins: mongoose.Types.ObjectId[]
  isPrivate: boolean
  lastMessage?: mongoose.Types.ObjectId
  lastActivity: Date
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface IChatMessage extends Document {
  room: mongoose.Types.ObjectId
  sender: mongoose.Types.ObjectId
  content: string // This will be encrypted
  messageType: "text" | "file" | "image" | "system"
  encryptionData: {
    iv: string
    tag: string
    senderPublicKey: string
  }
  replyTo?: mongoose.Types.ObjectId
  mentions: mongoose.Types.ObjectId[]
  attachments: {
    name: string
    url: string
    type: string
    size: number
  }[]
  isEdited: boolean
  editedAt?: Date
  deletedAt?: Date
  readBy: {
    user: mongoose.Types.ObjectId
    readAt: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

export interface IUserKeyPair extends Document {
  user: mongoose.Types.ObjectId
  publicKey: string
  privateKeyEncrypted: string // Encrypted with user's password
  keyVersion: number
  createdAt: Date
  expiresAt: Date
}

export interface IChatRoomKey extends Document {
  room: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  encryptedRoomKey: string // Room key encrypted with user's public key
  keyVersion: number
  createdAt: Date
}

const ChatRoomSchema: Schema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
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
      enum: ["direct", "group", "workspace"],
      default: "group",
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
)

const ChatMessageSchema: Schema = new Schema(
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
    content: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "file", "image", "system"],
      default: "text",
    },
    encryptionData: {
      iv: {
        type: String,
        required: true,
      },
      tag: {
        type: String,
        required: true,
      },
      senderPublicKey: {
        type: String,
        required: true,
      },
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    attachments: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    readBy: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
)

const UserKeyPairSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    privateKeyEncrypted: {
      type: String,
      required: true,
    },
    keyVersion: {
      type: Number,
      default: 1,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
)

const ChatRoomKeySchema: Schema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    encryptedRoomKey: {
      type: String,
      required: true,
    },
    keyVersion: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
)

// Indexes
ChatRoomSchema.index({ workspace: 1 })
ChatRoomSchema.index({ participants: 1 })
ChatRoomSchema.index({ type: 1 })
ChatRoomSchema.index({ lastActivity: -1 })

ChatMessageSchema.index({ room: 1, createdAt: -1 })
ChatMessageSchema.index({ sender: 1 })
ChatMessageSchema.index({ mentions: 1 })

UserKeyPairSchema.index({ user: 1 })
UserKeyPairSchema.index({ expiresAt: 1 })

ChatRoomKeySchema.index({ room: 1, user: 1 }, { unique: true })

// Methods
ChatRoomSchema.methods.isParticipant = function (userId: string): boolean {
  return this.participants.some((participantId: mongoose.Types.ObjectId) => participantId.toString() === userId)
}

ChatRoomSchema.methods.isAdmin = function (userId: string): boolean {
  return (
    this.admins.some((adminId: mongoose.Types.ObjectId) => adminId.toString() === userId) ||
    this.createdBy.toString() === userId
  )
}

export const ChatRoom = mongoose.models.ChatRoom || mongoose.model<IChatRoom>("ChatRoom", ChatRoomSchema)
export const ChatMessage = mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema)
export const UserKeyPair = mongoose.models.UserKeyPair || mongoose.model<IUserKeyPair>("UserKeyPair", UserKeyPairSchema)
export const ChatRoomKey = mongoose.models.ChatRoomKey || mongoose.model<IChatRoomKey>("ChatRoomKey", ChatRoomKeySchema)
