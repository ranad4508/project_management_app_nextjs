import type { ProjectPriority, ProjectStatus } from "@/src/enums/project.enum";
import type { User, WorkspaceProject } from "@/src/types/workspace.types";
import type { Types } from "mongoose";

export interface ProjectMember {
  user: Types.ObjectId;
  role: string;
  addedAt: Date;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  totalEffort: number;
  completedEffort: number;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  workspaceId: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  dueDate?: Date;
  members: ProjectMember[];
  assignedTo: User[];
  tasksCount: number;
  completedTasks: number;
  stats?: ProjectStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  workspaceId: string;
  members?: string[];
  dueDate?: Date;
  priority?: ProjectPriority;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  members?: string[];
  dueDate?: Date;
  priority?: ProjectPriority;
}

// Type that can be either a Project or a WorkspaceProject
export type ProjectOrWorkspaceProject = Project | WorkspaceProject;

// Utility function to check if a project is a WorkspaceProject
export function isWorkspaceProject(
  project: ProjectOrWorkspaceProject
): project is WorkspaceProject {
  return !("workspaceId" in project);
}

// Utility function to adapt a WorkspaceProject to a Project
export function adaptWorkspaceProject(
  project: WorkspaceProject,
  workspaceId: string
): Project {
  return {
    ...project,
    workspaceId,
    members: [],
    assignedTo: project.assignedTo || [],
    tasksCount: project.tasksCount || 0,
    completedTasks: project.completedTasks || 0,
    stats: {
      totalTasks: project.stats?.totalTasks || project.tasksCount || 0,
      completedTasks:
        project.stats?.completedTasks || project.completedTasks || 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      completionPercentage: project.stats?.completionPercentage || 0,
    },
  };
}
