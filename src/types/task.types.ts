import type { TaskStatus, TaskPriority, TaskType } from "@/src/enums/task.enum"
import type { Types } from "mongoose"

export interface CreateTaskData {
  title: string
  description?: string
  projectId: string
  assignedTo?: string
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  dueDate?: Date
  tags?: string[]
  estimatedHours?: number
}

export interface UpdateTaskData {
  title?: string
  description?: string
  assignedTo?: string
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  dueDate?: Date
  tags?: string[]
  estimatedHours?: number
  actualHours?: number
}

export interface TaskComment {
  user: Types.ObjectId
  content: string
  createdAt: Date
  updatedAt?: Date
}

export interface TaskAttachment {
  name: string
  url: string
  type: string
  size: number
  uploadedBy: Types.ObjectId
  uploadedAt: Date
}

export interface TaskActivity {
  user: Types.ObjectId
  action: string
  field?: string
  oldValue?: any
  newValue?: any
  createdAt: Date
}
