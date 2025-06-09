import type { ProjectStatus, ProjectPriority } from "@/src/enums/project.enum"
import type { Types } from "mongoose"

export interface CreateProjectData {
  name: string
  description?: string
  workspaceId: string
  members?: string[]
  dueDate?: Date
  priority?: ProjectPriority
}

export interface UpdateProjectData {
  name?: string
  description?: string
  status?: ProjectStatus
  members?: string[]
  dueDate?: Date
  priority?: ProjectPriority
}

export interface ProjectMember {
  user: Types.ObjectId
  role: string
  addedAt: Date
}

export interface ProjectStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  completionPercentage: number
}
