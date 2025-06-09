import mongoose, { Schema, type Document } from "mongoose"
import { NotificationType, NotificationStatus } from "@/src/enums/notification.enum"

export interface INotification extends Document {
  user: mongoose.Types.ObjectId
  type: NotificationType
  title: string
  message: string
  relatedTo?: {
    model: "Task" | "Project" | "Workspace" | "Chat" | "User"
    id: mongoose.Types.ObjectId
  }
  status: NotificationStatus
  readAt?: Date
  createdAt: Date
}

const NotificationSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    relatedTo: {
      model: {
        type: String,
        enum: ["Task", "Project", "Workspace", "Chat", "User"],
      },
      id: {
        type: Schema.Types.ObjectId,
      },
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.UNREAD,
    },
    readAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

// Indexes
NotificationSchema.index({ user: 1, status: 1 })
NotificationSchema.index({ createdAt: -1 })
NotificationSchema.index({ type: 1 })

export const Notification =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema)
