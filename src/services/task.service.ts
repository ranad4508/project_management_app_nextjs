import { Task } from "@/src/models/task"
import { Project } from "@/src/models/project"
import { NotificationService } from "./notification.service"
import { NotFoundError, AuthorizationError, ValidationError } from "@/src/errors/AppError"
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum"
import { NotificationType } from "@/src/enums/notification.enum"
import type { CreateTaskData, UpdateTaskData, TaskComment } from "@/src/types/task.types"
import type { PaginationParams, FilterParams } from "@/src/types/api.types"

export class TaskService {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = new NotificationService()
  }

  /**
   * Create a new task
   */
  async createTask(userId: string, data: CreateTaskData) {
    const {
      title,
      description,
      projectId,
      assignedTo,
      status = TaskStatus.TODO,
      priority = TaskPriority.MEDIUM,
      type,
      dueDate,
      tags = [],
      estimatedHours,
    } = data

    // Verify project access
    const project = await Project.findById(projectId).populate("workspace")
    if (!project) {
      throw new NotFoundError("Project not found")
    }

    const workspace = project.workspace as any
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to project")
    }

    // Validate assignee is project member
    if (assignedTo && !project.isMember(assignedTo)) {
      throw new ValidationError("Assignee must be a project member")
    }

    const task = new Task({
      title,
      description,
      project: projectId,
      assignedTo,
      status,
      priority,
      type,
      dueDate,
      tags,
      estimatedHours,
      createdBy: userId,
      activities: [
        {
          user: userId,
          action: "created",
          createdAt: new Date(),
        },
      ],
    })

    await task.save()
    await task.populate("assignedTo", "name email avatar")
    await task.populate("createdBy", "name email avatar")

    // Notify assignee
    if (assignedTo && assignedTo !== userId) {
      await this.notificationService.createNotification(
        assignedTo,
        NotificationType.TASK_ASSIGNED,
        "New task assigned",
        `You have been assigned to task: ${title}`,
        { model: "Task", id: task._id },
      )
    }

    return task
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(
    projectId: string,
    userId: string,
    pagination: PaginationParams = {},
    filters: FilterParams = {},
  ) {
    // Verify project access
    const project = await Project.findById(projectId).populate("workspace")
    if (!project) {
      throw new NotFoundError("Project not found")
    }

    const workspace = project.workspace as any
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to project")
    }

    const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = pagination
    const { search, status, priority, assignedTo, dateFrom, dateTo } = filters

    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    // Build query
    const query: any = { project: projectId }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ]
    }

    if (status) {
      query.status = status
    }

    if (priority) {
      query.priority = priority
    }

    if (assignedTo) {
      query.assignedTo = assignedTo
    }

    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
      if (dateTo) query.createdAt.$lte = new Date(dateTo)
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("comments.user", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const total = await Task.countDocuments(query)

    return {
      tasks,
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
   * Get task by ID
   */
  async getTaskById(taskId: string, userId: string) {
    const task = await Task.findById(taskId)
      .populate("project")
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("comments.user", "name email avatar")
      .populate("activities.user", "name email avatar")
      .populate("dependencies", "title status")
      .populate("subtasks", "title status")

    if (!task) {
      throw new NotFoundError("Task not found")
    }

    // Verify access through project
    const project = await Project.findById(task.project).populate("workspace")
    const workspace = project!.workspace as any

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task")
    }

    return task
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, userId: string, data: UpdateTaskData) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    })

    if (!task) {
      throw new NotFoundError("Task not found")
    }

    const project = task.project as any
    const workspace = project.workspace as any

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task")
    }

    // Track changes for activity log
    const changes: any[] = []
    const oldValues: any = {}

    Object.keys(data).forEach((key) => {
      if (
        data[key as keyof UpdateTaskData] !== undefined &&
        task[key as keyof typeof task] !== data[key as keyof UpdateTaskData]
      ) {
        oldValues[key] = task[key as keyof typeof task]
        changes.push({
          user: userId,
          action: "updated",
          field: key,
          oldValue: task[key as keyof typeof task],
          newValue: data[key as keyof UpdateTaskData],
          createdAt: new Date(),
        })
      }
    })

    // Validate assignee
    if (data.assignedTo && !project.isMember(data.assignedTo)) {
      throw new ValidationError("Assignee must be a project member")
    }

    // Handle status change
    if (data.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      data.completedAt = new Date()
    } else if (data.status !== TaskStatus.DONE && task.status === TaskStatus.DONE) {
      data.completedAt = undefined
    }

    Object.assign(task, data)
    task.activities.push(...changes)

    await task.save()
    await task.populate("assignedTo", "name email avatar")

    // Send notifications for important changes
    if (data.assignedTo && data.assignedTo !== oldValues.assignedTo) {
      if (data.assignedTo !== userId) {
        await this.notificationService.createNotification(
          data.assignedTo,
          NotificationType.TASK_ASSIGNED,
          "Task assigned to you",
          `You have been assigned to task: ${task.title}`,
          { model: "Task", id: task._id },
        )
      }

      // Notify previous assignee
      if (oldValues.assignedTo && oldValues.assignedTo !== userId) {
        await this.notificationService.createNotification(
          oldValues.assignedTo,
          NotificationType.TASK_UPDATED,
          "Task reassigned",
          `Task "${task.title}" has been reassigned`,
          { model: "Task", id: task._id },
        )
      }
    }

    if (data.status === TaskStatus.DONE && oldValues.status !== TaskStatus.DONE) {
      // Notify project members about completion
      const notifyUsers = project.members.filter((id: string) => id !== userId)
      await Promise.all(
        notifyUsers.map((memberId: string) =>
          this.notificationService.createNotification(
            memberId,
            NotificationType.TASK_COMPLETED,
            "Task completed",
            `Task "${task.title}" has been completed`,
            { model: "Task", id: task._id },
          ),
        ),
      )
    }

    return task
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string, userId: string) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    })

    if (!task) {
      throw new NotFoundError("Task not found")
    }

    const project = task.project as any
    const workspace = project.workspace as any

    // Only task creator, assignee, or workspace admin can delete
    const canDelete =
      task.createdBy.toString() === userId || task.assignedTo?.toString() === userId || workspace.isAdmin(userId)

    if (!canDelete) {
      throw new AuthorizationError("Insufficient permissions to delete task")
    }

    await Task.findByIdAndDelete(taskId)

    return { message: "Task deleted successfully" }
  }

  /**
   * Add comment to task
   */
  async addComment(taskId: string, userId: string, content: string) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    })

    if (!task) {
      throw new NotFoundError("Task not found")
    }

    const project = task.project as any
    const workspace = project.workspace as any

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task")
    }

    const comment: TaskComment = {
      user: userId as any,
      content,
      createdAt: new Date(),
    }

    task.comments.push(comment)
    task.activities.push({
      user: userId as any,
      action: "commented",
      createdAt: new Date(),
    })

    await task.save()
    await task.populate("comments.user", "name email avatar")

    // Notify task assignee and creator (if different)
    const notifyUsers = [task.assignedTo, task.createdBy]
      .filter((id) => id && id.toString() !== userId)
      .map((id) => id!.toString())

    await Promise.all(
      [...new Set(notifyUsers)].map((memberId) =>
        this.notificationService.createNotification(
          memberId,
          NotificationType.COMMENT_ADDED,
          "New comment on task",
          `New comment on task: ${task.title}`,
          { model: "Task", id: task._id },
        ),
      ),
    )

    return task.comments[task.comments.length - 1]
  }

  /**
   * Get user tasks
   */
  async getUserTasks(userId: string, pagination: PaginationParams = {}, filters: FilterParams = {}) {
    const { page = 1, limit = 20, sortBy = "dueDate", sortOrder = "asc" } = pagination
    const { status, priority, dateFrom, dateTo } = filters

    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    // Build query
    const query: any = {
      $or: [{ assignedTo: userId }, { createdBy: userId }],
    }

    if (status) {
      query.status = status
    }

    if (priority) {
      query.priority = priority
    }

    if (dateFrom || dateTo) {
      query.dueDate = {}
      if (dateFrom) query.dueDate.$gte = new Date(dateFrom)
      if (dateTo) query.dueDate.$lte = new Date(dateTo)
    }

    const tasks = await Task.find(query)
      .populate("project", "name slug workspace")
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const total = await Task.countDocuments(query)

    return {
      tasks,
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
   * Get overdue tasks for user
   */
  async getOverdueTasks(userId: string) {
    const tasks = await Task.find({
      assignedTo: userId,
      dueDate: { $lt: new Date() },
      status: { $nin: [TaskStatus.DONE, TaskStatus.CANCELLED] },
    })
      .populate("project", "name workspace")
      .sort({ dueDate: 1 })

    return tasks
  }
}
