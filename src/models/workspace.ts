import mongoose, { Schema, type Document } from "mongoose"
import { MemberRole } from "@/src/enums/user.enum"
import { WorkspaceStatus } from "@/src/enums/workspace.enum"

export interface IWorkspaceMember {
  user: mongoose.Types.ObjectId
  role: MemberRole
  joinedAt: Date
  permissions: string[]
}

export interface IWorkspace extends Document {
  name: string
  description?: string
  slug: string
  owner: mongoose.Types.ObjectId
  members: IWorkspaceMember[]
  status: WorkspaceStatus
  settings: {
    allowGuestAccess: boolean
    requireApprovalForTasks: boolean
    defaultTaskStatus: string
    timeZone: string
    workingHours: {
      start: string
      end: string
      days: number[]
    }
  }
  createdAt: Date
  updatedAt: Date
}

const WorkspaceSchema: Schema = new Schema(
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
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    owner: {
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
        permissions: [
          {
            type: String,
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: Object.values(WorkspaceStatus),
      default: WorkspaceStatus.ACTIVE,
    },
    settings: {
      allowGuestAccess: {
        type: Boolean,
        default: false,
      },
      requireApprovalForTasks: {
        type: Boolean,
        default: false,
      },
      defaultTaskStatus: {
        type: String,
        default: "todo",
      },
      timeZone: {
        type: String,
        default: "UTC",
      },
      workingHours: {
        start: {
          type: String,
          default: "09:00",
        },
        end: {
          type: String,
          default: "17:00",
        },
        days: [
          {
            type: Number,
            min: 0,
            max: 6,
          },
        ],
        default: {
          start: "09:00",
          end: "17:00",
          days: [1, 2, 3, 4, 5], // Monday to Friday
        },
      },
    },
  },
  { timestamps: true },
)

// Indexes
WorkspaceSchema.index({ slug: 1 })
WorkspaceSchema.index({ owner: 1 })
WorkspaceSchema.index({ "members.user": 1 })
WorkspaceSchema.index({ status: 1 })

// Methods
WorkspaceSchema.methods.isMember = function (userId: string): boolean {
  return this.members.some((member: IWorkspaceMember) => member.user.toString() === userId)
}

WorkspaceSchema.methods.getMemberRole = function (userId: string): MemberRole | null {
  const member = this.members.find((member: IWorkspaceMember) => member.user.toString() === userId)
  return member ? member.role : null
}

WorkspaceSchema.methods.isAdmin = function (userId: string): boolean {
  const role = this.getMemberRole(userId)
  return role === MemberRole.ADMIN || this.owner.toString() === userId
}

export const Workspace = mongoose.models.Workspace || mongoose.model<IWorkspace>("Workspace", WorkspaceSchema)
