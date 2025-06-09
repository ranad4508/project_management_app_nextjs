import type { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { AuthenticationError, AuthorizationError, NotFoundError } from "@/src/errors/AppError"
import { Workspace } from "@/src/models/workspace"
import { Project } from "@/src/models/project"
import { Task } from "@/src/models/task"
import type { UserRole } from "@/src/enums/user.enum"
import Database from "@/src/config/database"

export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    throw new AuthenticationError("Authentication required")
  }

  return session.user
}

export async function requireRole(req: NextRequest, allowedRoles: UserRole[]) {
  const user = await requireAuth(req)

  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new AuthorizationError("Insufficient permissions")
  }

  return user
}

export async function requireWorkspaceAccess(req: NextRequest, workspaceId: string) {
  const user = await requireAuth(req)

  await Database.connect()

  const workspace = await Workspace.findById(workspaceId)

  if (!workspace) {
    throw new NotFoundError("Workspace not found")
  }

  // Check if user is a member of the workspace
  const isMember = workspace.isMember(user.id)

  if (!isMember) {
    throw new AuthorizationError("Access denied to this workspace")
  }

  return { user, workspace }
}

export async function requireProjectAccess(req: NextRequest, projectId: string) {
  const user = await requireAuth(req)

  await Database.connect()

  const project = await Project.findById(projectId).populate("workspace")

  if (!project) {
    throw new NotFoundError("Project not found")
  }

  // Check if user has access to the workspace that contains this project
  const workspace = project.workspace as any
  const isMember = workspace.isMember(user.id)

  if (!isMember) {
    throw new AuthorizationError("Access denied to this project")
  }

  return { user, project, workspace }
}

export async function requireTaskAccess(req: NextRequest, taskId: string) {
  const user = await requireAuth(req)

  await Database.connect()

  const task = await Task.findById(taskId).populate({
    path: "project",
    populate: {
      path: "workspace",
    },
  })

  if (!task) {
    throw new NotFoundError("Task not found")
  }

  // Check if user has access to the workspace that contains this task's project
  const project = task.project as any
  const workspace = project.workspace as any
  const isMember = workspace.isMember(user.id)

  if (!isMember) {
    throw new AuthorizationError("Access denied to this task")
  }

  return { user, task, project, workspace }
}

export async function requireWorkspaceAdmin(req: NextRequest, workspaceId: string) {
  const { user, workspace } = await requireWorkspaceAccess(req, workspaceId)

  const isAdmin = workspace.isAdmin(user.id)

  if (!isAdmin) {
    throw new AuthorizationError("Admin access required for this workspace")
  }

  return { user, workspace }
}
