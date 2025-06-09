import type { Types } from "mongoose"

export interface CreateChatRoomData {
  workspaceId: string
  name: string
  description?: string
  type: "direct" | "group" | "workspace"
  participants: string[]
  isPrivate?: boolean
}

export interface UpdateChatRoomData {
  name?: string
  description?: string
  isPrivate?: boolean
}

export interface SendMessageData {
  roomId: string
  content: string
  messageType?: "text" | "file" | "image"
  replyTo?: string
  mentions?: string[]
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
}

export interface EncryptedMessageData {
  content: string
  encryptionData: {
    iv: string
    tag: string
    senderPublicKey: string
  }
}

export interface ChatRoomMember {
  user: Types.ObjectId | string
  role: "admin" | "member"
  joinedAt: Date
}

export interface MessageReadStatus {
  user: Types.ObjectId | string
  readAt: Date
}

export interface UserKeyPairData {
  publicKey: string
  privateKeyEncrypted: string
  keyVersion: number
}

export interface ChatRoomKeyData {
  roomId: string
  encryptedRoomKey: string
  keyVersion: number
}

export interface DecryptedMessage {
  id: string
  content: string
  sender: any
  messageType: string
  replyTo?: any
  mentions: any[]
  attachments: any[]
  isEdited: boolean
  editedAt?: Date
  deletedAt?: Date
  readBy: MessageReadStatus[]
  createdAt: Date
  updatedAt: Date
}
