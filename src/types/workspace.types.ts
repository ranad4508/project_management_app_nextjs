import type { MemberRole } from "@/src/enums/workspace.enum"
import type { Types } from "mongoose"

export interface CreateWorkspaceData {
  name: string
  description?: string
}

export interface UpdateWorkspaceData {
  name?: string
  description?: string
}

export interface WorkspaceMember {
  user: Types.ObjectId | string
  role: MemberRole
  joinedAt: Date
  permissions?: string[]
}

export interface InviteMemberData {
  email: string
  role: MemberRole
  message?: string
}

export interface WorkspaceSettings {
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
