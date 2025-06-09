import mongoose, { Schema, type Document } from "mongoose"
import { ProjectStatus, ProjectPriority } from "@/src/enums/project.enum"

export interface IProject extends Document {
  name: string
  description?: string
  slug: string
  workspace: mongoose.Types.ObjectId
  status: ProjectStatus
  priority: ProjectPriority
  members: mongoose.Types.ObjectId[]
  startDate?: Date
  dueDate?: Date
  completedAt?: Date
  progress: number
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.ACTIVE,
    },
    priority: {
      type: String,
      enum: Object.values(ProjectPriority),
      default: ProjectPriority.MEDIUM,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
)

// Indexes
ProjectSchema.index({ workspace: 1 })
ProjectSchema.index({ slug: 1, workspace: 1 }, { unique: true })
ProjectSchema.index({ status: 1 })
ProjectSchema.index({ members: 1 })
ProjectSchema.index({ createdBy: 1 })

// Methods
ProjectSchema.methods.isMember = function (userId: string): boolean {
  return (
    this.members.some((memberId: mongoose.Types.ObjectId) => memberId.toString() === userId) ||
    this.createdBy.toString() === userId
  )
}

export const Project = mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema)
