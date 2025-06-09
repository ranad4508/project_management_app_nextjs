import mongoose, { Schema, type Document } from "mongoose"
import { InvitationStatus } from "@/src/enums/invitation.enum"
import { MemberRole } from "@/src/enums/user.enum"

export interface IInvitation extends Document {
  email: string
  workspace: mongoose.Types.ObjectId
  role: MemberRole
  token: string
  expiresAt: Date
  invitedBy: mongoose.Types.ObjectId
  status: InvitationStatus
  message?: string
  acceptedAt?: Date
  declinedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const InvitationSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(MemberRole),
      default: MemberRole.MEMBER,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    acceptedAt: {
      type: Date,
    },
    declinedAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

// Indexes
InvitationSchema.index({ email: 1, workspace: 1 })
InvitationSchema.index({ token: 1 })
InvitationSchema.index({ status: 1 })
InvitationSchema.index({ expiresAt: 1 })

// Methods
InvitationSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt
}

export const Invitation = mongoose.models.Invitation || mongoose.model<IInvitation>("Invitation", InvitationSchema)
