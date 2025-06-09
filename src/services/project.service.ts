import { Project } from "@/src/models/project"
import { Workspace } from "@/src/models/workspace"
import { Task } from "@/src/models/task"
import { StringUtils } from "@/src/utils/string.utils"
import { NotificationService } from "./notification.service"
import { NotFoundError, AuthorizationError, ValidationError } from "@/src/errors/AppError"
import { ProjectStatus } from "@/src/enums/project.enum"
import { TaskStatus } from "@/src/enums/task.enum"
import type { CreateProjectData, UpdateProjectData, ProjectStats } from "@/src/types/project.types"
import type { PaginationParams, FilterParams } from "@/src/types/api.types"

export class ProjectService {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = new NotificationService()
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, data: CreateProjectData) {
    const { name, description, workspaceId, members = [], dueDate, priority } = data

    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId)
    if (!workspace || !workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace")
    }

    // Generate unique slug within workspace
    const baseSlug = StringUtils.slugify(name)
    let slug = baseSlug
    let counter = 1

    while (await Project.findOne({ slug, workspace: workspaceId })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Validate members are workspace members
    if (members.length > 0) {
      const validMembers = members.filter((memberId) => workspace.isMember(memberId))

      if (validMembers.length !== members.length) {
        throw new ValidationError("Some members are not part of the workspace")
      }
    }

    const project = new Project({
      name,
      description,
      slug,
      workspace: workspaceId,
      members: [...new Set([userId, ...members])], // Include creator and remove duplicates
      dueDate,
      priority,
      createdBy: userId,
    })

    await project.save()
    await project.populate("members", "name email avatar")
    await project.populate("createdBy", "name email avatar")

    // Notify project members
    if (members.length > 0) {
      await this.notificationService.notifyProjectMembers(
        project._id,
        `New project: ${name}`,
        `You have been added to the project "${name}"`,
        members.filter((id) => id !== userId),
      )
    }

    return project
  }

  /**
   * Get workspace projects
   */
  async getWorkspaceProjects(
    workspaceId: string,
    userId: string,
    pagination: PaginationParams = {},
    filters: FilterParams = {},
  ) {
    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId)
    if (!workspace || !workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace")
    }

    const { page = 1, limit = 10, sortBy = "updatedAt", sortOrder = "desc" } = pagination
    const { search, status, priority } = filters

    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    // Build query
    const query: any = { workspace: workspaceId }

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    if (status) {
      query.status = status
    }

    if (priority) {
      query.priority = priority
    }

    const projects = await Project.find(query)
      .populate("members", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const total = await Project.countDocuments(query)

    // Get project statistics
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const stats = await this.getProjectStats(project._id.toString())
        return {
          ...project.toObject(),
          stats,
        }
      }),
    )

    return {
      projects: projectsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId: string, userId: string) {
    const project = await Project.findById(projectId)
      .populate("workspace")
      .populate("members", "name email avatar")
      .populate("createdBy", "name email avatar")

    if (!project) {
      throw new NotFoundError("Project not found")
    }

    const workspace = project.workspace as any
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to project")
    }

    const stats = await this.getProjectStats(projectId)

    return {
      ...project.toObject(),
      stats,
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, userId: string, data: UpdateProjectData) {
    const project = await Project.findById(projectId).populate("workspace")

    if (!project) {
      throw new NotFoundError("Project not found")
    }

    const workspace = project.workspace as any
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to project")
    }

    // Check if user can edit (project member or workspace admin)
    const canEdit = project.isMember(userId) || workspace.isAdmin(userId)
    if (!canEdit) {
      throw new AuthorizationError("Insufficient permissions to edit project")
    }

    // Update slug if name changed
    if (data.name && data.name !== project.name) {
      const baseSlug = StringUtils.slugify(data.name)
      let slug = baseSlug
      let counter = 1

      while (
        await Project.findOne({
          slug,
          workspace: project.workspace,
          _id: { $ne: projectId },
        })
      ) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      project.slug = slug
    }

    // Validate new members
    if (data.members) {
      const validMembers = data.members.filter((memberId) => workspace.isMember(memberId))

      if (validMembers.length !== data.members.length) {
        throw new ValidationError("Some members are not part of the workspace")
      }
    }

    // Track status change for completion
    const oldStatus = project.status
    Object.assign(project, data)

    if (data.status === ProjectStatus.COMPLETED && oldStatus !== ProjectStatus.COMPLETED) {
      project.completedAt = new Date()
      project.progress = 100
    }

    await project.save()
    await project.populate("members", "name email avatar")

    // Notify members of changes
    if (data.members) {
      const newMembers = data.members.filter((id) => !project.members.some((member) => member.toString() === id))

      if (newMembers.length > 0) {
        await this.notificationService.notifyProjectMembers(
          project._id,
          `Added to project: ${project.name}`,
          `You have been added to the project "${project.name}"`,
          newMembers,
        )
      }
    }

    return project
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string, userId: string) {
    const project = await Project.findById(projectId).populate("workspace")

    if (!project) {
      throw new NotFoundError("Project not found")
    }

    const workspace = project.workspace as any

    // Only workspace admin or project creator can delete
    const canDelete = workspace.isAdmin(userId) || project.createdBy.toString() === userId
    if (!canDelete) {
      throw new AuthorizationError("Insufficient permissions to delete project")
    }

    // Check if project has tasks
    const taskCount = await Task.countDocuments({ project: projectId })
    if (taskCount > 0) {
      throw new ValidationError("Cannot delete project with existing tasks. Archive it instead.")
    }

    await Project.findByIdAndDelete(projectId)

    return { message: "Project deleted successfully" }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const [totalTasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
      Task.countDocuments({ project: projectId }),
      Task.countDocuments({ project: projectId, status: TaskStatus.DONE }),
      Task.countDocuments({ project: projectId, status: TaskStatus.IN_PROGRESS }),
      Task.countDocuments({
        project: projectId,
        dueDate: { $lt: new Date() },
        status: { $nin: [TaskStatus.DONE, TaskStatus.CANCELLED] },
      }),
    ])

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionPercentage,
    }
  }

  /**
   * Archive project
   */
  async archiveProject(projectId: string, userId: string) {
    return this.updateProject(projectId, userId, {
      status: ProjectStatus.ARCHIVED,
    })
  }

  /**
   * Get user projects across all workspaces
   */
  async getUserProjects(userId: string, pagination: PaginationParams = {}) {
    const { page = 1, limit = 10, sortBy = "updatedAt", sortOrder = "desc" } = pagination

    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const projects = await Project.find({
      $or: [{ members: userId }, { createdBy: userId }],
    })
      .populate("workspace", "name slug")
      .populate("members", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const total = await Project.countDocuments({
      $or: [{ members: userId }, { createdBy: userId }],
    })

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }
  }
}
