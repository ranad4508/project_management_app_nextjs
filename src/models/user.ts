import mongoose, { Schema, type Document } from "mongoose"
import { UserRole, UserStatus } from "@/src/enums/user.enum"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: UserRole
  status: UserStatus
  isVerified: boolean
  verificationToken?: string
  verificationTokenExpiry?: Date
  resetPasswordToken?: string
  resetPasswordTokenExpiry?: Date
  mfaEnabled: boolean
  mfaSecret?: string
  avatar?: string
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      sparse: true,
    },
    verificationTokenExpiry: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      sparse: true,
    },
    resetPasswordTokenExpiry: {
      type: Date,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
    },
    avatar: {
      type: String,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password
        delete ret.mfaSecret
        delete ret.verificationToken
        delete ret.resetPasswordToken
        return ret
      },
    },
  },
)

// Indexes
UserSchema.index({ email: 1 })
UserSchema.index({ verificationToken: 1 })
UserSchema.index({ resetPasswordToken: 1 })

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
