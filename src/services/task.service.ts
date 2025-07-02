import mongoose from "mongoose";
import { Task } from "@/src/models/task";
import { Project } from "@/src/models/project";
import { User } from "@/src/models/user";
import { Workspace } from "@/src/models/workspace";
import { NotificationService } from "./notification.service";
import { FileUploadService } from "./file-upload.service";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "@/src/errors/AppError";
import {
  TaskStatus,
  TaskStatusType,
  TaskPriority,
} from "@/src/enums/task.enum";
import { NotificationType } from "@/src/enums/notification.enum";
import type {
  CreateTaskData,
  UpdateTaskData,
  TaskComment,
} from "@/src/types/task.types";
import type { PaginationParams, FilterParams } from "@/src/types/api.types";

export class TaskService {
  private notificationService: NotificationService;
  private fileUploadService: FileUploadService;

  constructor() {
    this.notificationService = new NotificationService();
    this.fileUploadService = new FileUploadService();
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
      labels = [],
      estimatedHours,
    } = data;

    // Verify project access
    const project = await Project.findById(projectId).populate("workspace");
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const workspace = project.workspace as any;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to project");
    }

    // Validate assignee is workspace member
    if (assignedTo && !workspace.isMember(assignedTo)) {
      throw new ValidationError("Assignee must be a workspace member");
    }

    // Validate labels belong to the same workspace
    if (labels && labels.length > 0) {
      const { Label } = await import("@/src/models/label");
      const labelDocs = await Label.find({
        _id: { $in: labels },
        workspace: project.workspace,
      });

      if (labelDocs.length !== labels.length) {
        throw new ValidationError(
          "Some labels do not belong to this workspace"
        );
      }
    }

    // Validate assignee is a workspace member
    if (assignedTo) {
      const isAssigneeMember = project.workspace.members.some(
        (member: any) => member.user.toString() === assignedTo
      );
      if (!isAssigneeMember) {
        throw new AuthorizationError("Assignee must be a workspace member");
      }
    }

    // Determine status type based on status
    const statusType = this.getStatusTypeFromStatus(status);

    const task = new Task({
      title,
      description,
      project: projectId,
      assignedTo,
      status,
      statusType,
      priority,
      type,
      dueDate,
      tags,
      labels: labels || [],
      estimatedHours,
      parentTask: data.parentTask,
      isCompleted: status === TaskStatus.DONE,
      completionPercentage: status === TaskStatus.DONE ? 100 : 0,
      createdBy: userId,
      activities: [
        {
          user: userId,
          action: "created",
          createdAt: new Date(),
        },
      ],
    });

    await task.save();
    await task.populate([
      { path: "assignedTo", select: "name email avatar" },
      { path: "createdBy", select: "name email avatar" },
      { path: "labels", select: "name color" },
      { path: "project", select: "name workspace" },
    ]);

    // If this is a subtask, add it to parent's subtasks array
    if (data.parentTask) {
      await Task.findByIdAndUpdate(data.parentTask, {
        $addToSet: { subtasks: task._id },
      });
      // Update parent task progress
      await this.updateParentTaskProgress(data.parentTask);
    }

    // Notify assignee
    if (assignedTo && assignedTo !== userId) {
      await this.notificationService.createNotification(
        assignedTo,
        NotificationType.TASK_ASSIGNED,
        "New task assigned",
        `You have been assigned to task: ${title}`,
        { model: "Task", id: task._id }
      );
    }

    return task;
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(
    projectId: string,
    userId: string,
    pagination: PaginationParams = {},
    filters: FilterParams = {}
  ) {
    // Verify project access
    const project = await Project.findById(projectId).populate("workspace");
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const workspace = project.workspace as any;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to project");
    }

    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;
    const {
      search,
      status,
      priority,
      assignedTo,
      createdBy,
      dateFrom,
      dateTo,
      labels,
    } = filters;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Build query
    const query: any = { project: projectId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (labels && labels.length > 0) {
      query.labels = { $in: labels };
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("comments.user", "name email avatar")
      .populate("subtasks", "title status isCompleted")
      .populate("labels", "name color")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(query);

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
    };
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
      .populate("labels", "name color");

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    // Verify access through project
    const project = await Project.findById(task.project).populate("workspace");
    const workspace = project!.workspace as any;

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    return task;
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, userId: string, data: UpdateTaskData) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const project = task.project as any;
    const workspace = project.workspace as any;

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    // Track changes for activity log
    const changes: any[] = [];
    const oldValues: any = {};

    for (const key of Object.keys(data)) {
      if (
        data[key as keyof UpdateTaskData] !== undefined &&
        task[key as keyof typeof task] !== data[key as keyof UpdateTaskData]
      ) {
        oldValues[key] = task[key as keyof typeof task];

        let newValue = data[key as keyof UpdateTaskData];
        let oldValue = task[key as keyof typeof task];

        // For assignedTo field, get the user name instead of ID
        if (key === "assignedTo") {
          if (newValue) {
            const assignedUser = await User.findById(newValue).select("name");
            newValue = assignedUser?.name || newValue;
          }
          if (oldValue) {
            const oldUser = await User.findById(oldValue).select("name");
            oldValue = oldUser?.name || oldValue;
          }
        }

        changes.push({
          user: userId,
          action: "updated",
          field: key,
          oldValue: oldValue,
          newValue: newValue,
          createdAt: new Date(),
        });
      }
    }

    // Validate assignee
    if (data.assignedTo && !workspace.isMember(data.assignedTo)) {
      throw new ValidationError("Assignee must be a workspace member");
    }

    // Handle status change
    if (data.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      // Task completed - could add completion tracking here if needed
    } else if (
      data.status !== TaskStatus.DONE &&
      task.status === TaskStatus.DONE
    ) {
      // Task uncompleted - could add tracking here if needed
    }

    Object.assign(task, data);
    task.activities.push(...changes);

    await task.save();
    await task.populate([
      { path: "assignedTo", select: "name email avatar" },
      { path: "labels", select: "name color" },
      { path: "createdBy", select: "name email avatar" },
      { path: "project", select: "name workspace" },
    ]);

    // Update parent task progress if this is a subtask
    if (task.parentTask) {
      await this.updateParentTaskProgress(task.parentTask.toString());
    }

    // Send notifications for important changes
    if (data.assignedTo && data.assignedTo !== oldValues.assignedTo) {
      if (data.assignedTo !== userId) {
        await this.notificationService.createNotification(
          data.assignedTo,
          NotificationType.TASK_ASSIGNED,
          "Task assigned to you",
          `You have been assigned to task: ${task.title}`,
          { model: "Task", id: task._id }
        );
      }

      // Notify previous assignee
      if (oldValues.assignedTo && oldValues.assignedTo !== userId) {
        await this.notificationService.createNotification(
          oldValues.assignedTo,
          NotificationType.TASK_UPDATED,
          "Task reassigned",
          `Task "${task.title}" has been reassigned`,
          { model: "Task", id: task._id }
        );
      }
    }

    if (
      data.status === TaskStatus.DONE &&
      oldValues.status !== TaskStatus.DONE
    ) {
      // Notify project members about completion
      const notifyUsers = project.members.filter((id: string) => id !== userId);
      await Promise.all(
        notifyUsers.map((memberId: string) =>
          this.notificationService.createNotification(
            memberId,
            NotificationType.TASK_COMPLETED,
            "Task completed",
            `Task "${task.title}" has been completed`,
            { model: "Task", id: task._id }
          )
        )
      );
    }

    return task;
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string, userId: string) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const project = task.project as any;
    const workspace = project.workspace as any;

    // Only task creator, assignee, or workspace admin can delete
    const canDelete =
      task.createdBy.toString() === userId ||
      task.assignedTo?.toString() === userId ||
      workspace.isAdmin(userId);

    if (!canDelete) {
      throw new AuthorizationError("Insufficient permissions to delete task");
    }

    // Store parent task ID before deletion
    const parentTaskId = task.parentTask?.toString();

    // Delete all subtasks first
    if (task.subtasks && task.subtasks.length > 0) {
      await Task.deleteMany({ _id: { $in: task.subtasks } });
    }

    // Remove this task from parent's subtasks array if it's a subtask
    if (parentTaskId) {
      await Task.findByIdAndUpdate(parentTaskId, {
        $pull: { subtasks: taskId },
      });
    }

    await Task.findByIdAndDelete(taskId);

    // Update parent task progress if this was a subtask
    if (parentTaskId) {
      await this.updateParentTaskProgress(parentTaskId);
    }

    return { message: "Task deleted successfully" };
  }

  /**
   * Add comment to task
   */
  async addComment(taskId: string, userId: string, content: string) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const project = task.project as any;
    const workspace = project.workspace as any;

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    const comment: TaskComment = {
      user: userId as any,
      content,
      createdAt: new Date(),
    };

    task.comments.push(comment);
    task.activities.push({
      user: userId as any,
      action: "commented",
      createdAt: new Date(),
    });

    await task.save();
    await task.populate("comments.user", "name email avatar");

    // Notify task assignee and creator (if different)
    const notifyUsers = [task.assignedTo, task.createdBy]
      .filter((id) => id && id.toString() !== userId)
      .map((id) => id!.toString());

    await Promise.all(
      [...new Set(notifyUsers)].map((memberId) =>
        this.notificationService.createNotification(
          memberId,
          NotificationType.COMMENT_ADDED,
          "New comment on task",
          `New comment on task: ${task.title}`,
          { model: "Task", id: task._id }
        )
      )
    );

    return task.comments[task.comments.length - 1];
  }

  /**
   * Get all accessible tasks for user (from all workspaces they're a member of)
   */
  async getAllAccessibleTasks(
    userId: string,
    pagination: PaginationParams = {},
    filters: FilterParams = {}
  ) {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;
    const { status, priority, dateFrom, dateTo, search, assignedTo } = filters;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // First, get all workspaces the user is a member of
    const workspaces = await Workspace.find({
      "members.user": userId,
    }).select("_id");

    const workspaceIds = workspaces.map((w) => w._id);

    // Then get all projects from those workspaces
    const projects = await Project.find({
      workspace: { $in: workspaceIds },
    }).select("_id");

    const projectIds = projects.map((p) => p._id);

    // Build query for tasks from accessible projects
    const query: any = {
      project: { $in: projectIds },
    };

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ],
      });
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const tasks = await Task.find(query)
      .populate({
        path: "project",
        select: "name slug workspace",
        populate: {
          path: "workspace",
          select: "name",
        },
      })
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("labels", "name color")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(query);

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
    };
  }

  /**
   * Get user tasks (only assigned to the user)
   */
  async getUserTasks(
    userId: string,
    pagination: PaginationParams = {},
    filters: FilterParams = {}
  ) {
    const {
      page = 1,
      limit = 20,
      sortBy = "dueDate",
      sortOrder = "asc",
    } = pagination;
    const { status, priority, dateFrom, dateTo, search } = filters;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Build query - only tasks assigned to the user
    const query: any = {
      assignedTo: new mongoose.Types.ObjectId(userId),
    };

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ],
      });
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (dateFrom || dateTo) {
      query.dueDate = {};
      if (dateFrom) query.dueDate.$gte = new Date(dateFrom);
      if (dateTo) query.dueDate.$lte = new Date(dateTo);
    }

    const tasks = await Task.find(query)
      .populate({
        path: "project",
        select: "name slug workspace",
        populate: {
          path: "workspace",
          select: "name",
        },
      })
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("project", "name workspace")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(query);

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
    };
  }

  /**
   * Get overdue tasks for user
   */
  async getOverdueTasks(userId: string) {
    const tasks = await Task.find({
      assignedTo: new mongoose.Types.ObjectId(userId),
      dueDate: { $lt: new Date() },
      status: { $nin: [TaskStatus.DONE, TaskStatus.CANCELLED] },
    })
      .populate("project", "name workspace")
      .sort({ dueDate: 1 });

    return tasks;
  }

  /**
   * Update parent task progress based on subtasks
   */
  async updateParentTaskProgress(parentTaskId: string) {
    const parentTask = await Task.findById(parentTaskId).populate("subtasks");
    if (!parentTask) return;

    const subtasks = parentTask.subtasks as any[];
    if (subtasks.length === 0) return;

    const completedSubtasks = subtasks.filter(
      (subtask) => subtask.status === TaskStatus.DONE
    );
    const progress = Math.round(
      (completedSubtasks.length / subtasks.length) * 100
    );

    // Update parent task completion percentage
    parentTask.completionPercentage = progress;

    // If all subtasks are completed, mark parent as completed
    if (progress === 100 && parentTask.status !== TaskStatus.DONE) {
      parentTask.status = TaskStatus.DONE;
      parentTask.isCompleted = true;
      parentTask.completedAt = new Date();
    } else if (progress < 100 && parentTask.status === TaskStatus.DONE) {
      // If parent was completed but now has incomplete subtasks, reopen it
      parentTask.status = TaskStatus.IN_PROGRESS;
      parentTask.isCompleted = false;
      parentTask.completedAt = undefined;
    }

    await parentTask.save();
  }

  /**
   * Helper method to determine status type from status
   */
  private getStatusTypeFromStatus(status: TaskStatus): TaskStatusType {
    switch (status) {
      case TaskStatus.BACKLOG:
      case TaskStatus.TODO:
        return TaskStatusType.UNSTARTED;
      case TaskStatus.IN_PROGRESS:
      case TaskStatus.IN_REVIEW:
      case TaskStatus.BLOCKED:
        return TaskStatusType.STARTED;
      case TaskStatus.DONE:
        return TaskStatusType.COMPLETED;
      case TaskStatus.CANCELLED:
        return TaskStatusType.CANCELLED;
      default:
        return TaskStatusType.UNSTARTED;
    }
  }

  /**
   * Add attachment to task
   */
  async addAttachment(taskId: string, userId: string, file: File) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const workspace = (task.project as any).workspace;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    // Upload file using FileUploadService
    const uploadResult = await this.fileUploadService.uploadFile(
      file,
      userId,
      file.name,
      file.type
    );

    const attachment = {
      name: uploadResult.originalName,
      filename: uploadResult.filename,
      originalName: uploadResult.originalName,
      url: uploadResult.url,
      type: uploadResult.mimeType,
      mimetype: uploadResult.mimeType,
      size: uploadResult.size,
      uploadedBy: userId,
      uploadedAt: new Date(),
    };

    task.attachments.push(attachment);

    // Add activity
    task.activities.push({
      user: userId,
      action: "added attachment",
      createdAt: new Date(),
    });

    await task.save();
    return attachment;
  }

  /**
   * Get task attachments
   */
  async getAttachments(taskId: string, userId: string) {
    const task = await Task.findById(taskId)
      .populate({
        path: "project",
        populate: { path: "workspace" },
      })
      .populate("attachments.uploadedBy", "name email avatar");

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const workspace = (task.project as any).workspace;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    return task.attachments;
  }

  /**
   * Get task comments
   */
  async getComments(taskId: string, userId: string) {
    const task = await Task.findById(taskId)
      .populate({
        path: "project",
        populate: { path: "workspace" },
      })
      .populate("comments.user", "name email avatar");

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const workspace = (task.project as any).workspace;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    return task.comments.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update task comment
   */
  async updateComment(
    taskId: string,
    commentId: string,
    userId: string,
    content: string
  ) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const workspace = (task.project as any).workspace;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    // Check if user owns the comment
    if (comment.user.toString() !== userId) {
      throw new AuthorizationError("You can only edit your own comments");
    }

    comment.content = content;
    comment.updatedAt = new Date();

    await task.save();

    // Add activity
    task.activities.push({
      user: new mongoose.Types.ObjectId(userId),
      action: "updated comment",
      createdAt: new Date(),
    } as any);

    await task.save();

    return comment;
  }

  /**
   * Delete task comment
   */
  async deleteComment(taskId: string, commentId: string, userId: string) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const workspace = (task.project as any).workspace;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    // Check if user owns the comment
    if (comment.user.toString() !== userId) {
      throw new AuthorizationError("You can only delete your own comments");
    }

    task.comments.pull(commentId);

    // Add activity
    task.activities.push({
      user: new mongoose.Types.ObjectId(userId),
      action: "deleted comment",
      createdAt: new Date(),
    } as any);

    await task.save();
  }

  /**
   * Get task activities
   */
  async getActivities(taskId: string, userId: string) {
    const task = await Task.findById(taskId)
      .populate({
        path: "project",
        populate: { path: "workspace" },
      })
      .populate("activities.user", "name email avatar");

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const workspace = (task.project as any).workspace;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    return task.activities.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Delete task attachment
   */
  async deleteAttachment(taskId: string, attachmentId: string, userId: string) {
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "workspace" },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const workspace = (task.project as any).workspace;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to task");
    }

    // Find and remove the attachment
    const attachmentIndex = task.attachments.findIndex(
      (att: any) => att._id.toString() === attachmentId
    );

    if (attachmentIndex === -1) {
      throw new NotFoundError("Attachment not found");
    }

    const attachment = task.attachments[attachmentIndex];
    task.attachments.splice(attachmentIndex, 1);

    // Add activity
    task.activities.push({
      user: new mongoose.Types.ObjectId(userId),
      action: "deleted attachment",
      field: "attachment",
      oldValue: attachment.filename,
      createdAt: new Date(),
    } as any);

    await task.save();

    return { message: "Attachment deleted successfully" };
  }
}
