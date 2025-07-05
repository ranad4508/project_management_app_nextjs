import type { MemberRole } from "@/src/enums/user.enum";
import type { WorkspaceStatus } from "@/src/enums/workspace.enum";
import type { ProjectPriority, ProjectStatus } from "@/src/enums/project.enum";

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  lastLoginAt?: Date;
}

export interface WorkspaceMember {
  user: User;
  role: MemberRole;
  joinedAt: Date;
  permissions: string[];
}

export interface WorkspaceStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeMembers: number;
  completionRate: number;
}

export interface WorkspaceProject {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  tasksCount: number;
  completedTasks: number;
  assignedTo: User[];
  dueDate?: Date;
  stats?: {
    completionPercentage: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    totalEffort: number;
    completedEffort: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  owner: User;
  members: WorkspaceMember[];
  status: WorkspaceStatus;
  settings: {
    allowGuestAccess: boolean;
    requireApprovalForTasks: boolean;
    defaultTaskStatus: string;
    timeZone: string;
    workingHours: {
      start: string;
      end: string;
      days: number[];
    };
  };
  stats: WorkspaceStats;
  projects?: WorkspaceProject[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingInvitation {
  _id: string;
  email: string;
  role: MemberRole;
  token: string;
  expiresAt: Date;
  invitedBy: User;
  message?: string;
  createdAt: Date;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
  settings?: Partial<Workspace["settings"]>;
}

export interface InviteMemberData {
  email: string;
  role: MemberRole;
  message?: string;
}

export interface WorkspaceResponse extends Workspace {}

export interface WorkspacesResponse {
  workspaces: Workspace[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface WorkspaceMembersResponse {
  members: WorkspaceMember[];
  owner: User;
  pendingInvitations: PendingInvitation[];
}
