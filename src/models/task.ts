import mongoose, { Schema, type Document } from "mongoose"
import { TaskStatus, TaskPriority, TaskType } from "@/src/enums/task.enum"

export interface ITaskComment {
  user: mongoose.Types.ObjectId
  content: string
  createdAt: Date
  updatedAt?: Date
}

export interface ITaskAttachment {
  name: string
  url: string
  type: string
  size: number
  uploadedBy: mongoose.Types.ObjectId
  uploadedAt: Date
}

export interface ITaskActivity {
  user: mongoose.Types.ObjectId
  action: string
  field?: string
  oldValue?: any
  newValue?: any
  createdAt: Date
}

export interface ITask extends Document {
  title: string
  description?: string
  project: mongoose.Types.ObjectId
  assignedTo?: mongoose.Types.ObjectId
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  dueDate?: Date
  startDate?: Date
  completedAt?: Date
  estimatedHours?: number
  actualHours?: number
  tags: string[]
  attachments: ITaskAttachment[]
  comments: ITaskComment[]
  activities: ITaskActivity[]
  dependencies: mongoose.Types.ObjectId[]
  subtasks: mongoose.Types.ObjectId[]
  parentTask?: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
    },
    type: {
      type: String,
      enum: Object.values(TaskType),
      default: TaskType.TASK,
    },
    dueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
      max: 1000,
    },
    actualHours: {
      type: Number,
      min: 0,
      max: 1000,
    },
    tags: [
      {
        type: String,
        trim: true,
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
        },
        size: {
          type: Number,
        },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: 1000,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
        },
      },
    ],
    activities: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        action: {
          type: String,
          required: true,
        },
        field: {
          type: String,
        },
        oldValue: {
          type: Schema.Types.Mixed,
        },
        newValue: {
          type: Schema.Types.Mixed,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    dependencies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    subtasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: "Task",
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
TaskSchema.index({ project: 1 })
TaskSchema.index({ assignedTo: 1 })
TaskSchema.index({ status: 1 })
TaskSchema.index({ priority: 1 })
TaskSchema.index({ dueDate: 1 })
TaskSchema.index({ createdBy: 1 })
TaskSchema.index({ tags: 1 })

export const Task = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema)
