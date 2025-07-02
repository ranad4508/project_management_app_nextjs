import { Notification } from "@/src/models/notification";
import { Workspace } from "@/src/models/workspace";
import {
  NotificationType,
  NotificationStatus,
} from "@/src/enums/notification.enum";
import { MemberRole } from "@/src/enums/user.enum";
import type { PaginationParams } from "@/src/types/api.types";

export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedTo?: { model: string; id: any }
  ) {
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      relatedTo,
      status: NotificationStatus.UNREAD,
    });

    await notification.save();
    return notification;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    pagination: PaginationParams = {},
    status?: NotificationStatus,
    type?: NotificationType
  ) {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort(sort as any)
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: userId,
      status: NotificationStatus.UNREAD,
    });

    return {
      notifications,
      unreadCount,
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
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
      { new: true }
    );

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    await Notification.updateMany(
      { user: userId, status: NotificationStatus.UNREAD },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      }
    );

    return { message: "All notifications marked as read" };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    return await Notification.countDocuments({
      user: userId,
      status: NotificationStatus.UNREAD,
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    return notification;
  }

  /**
   * Get dashboard activities (recent notifications for dashboard)
   */
  async getDashboardActivities(userId: string, limit: number = 10) {
    const activities = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("relatedTo.id", "name title")
      .lean();

    return activities;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    return { message: "Notification deleted" };
  }

  /**
   * Notify workspace admins
   */
  async notifyWorkspaceAdmins(
    workspaceId: string,
    title: string,
    message: string
  ) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return;

    const adminIds = workspace.members
      .filter((member: any) => member.role === MemberRole.ADMIN)
      .map((member: any) => member.user.toString());

    // Also include owner
    adminIds.push(workspace.owner.toString());

    const uniqueAdminIds = [...new Set(adminIds)];

    await Promise.all(
      uniqueAdminIds.map((adminId) =>
        this.createNotification(
          adminId as string,
          NotificationType.WORKSPACE_UPDATED,
          title,
          message,
          {
            model: "Workspace",
            id: workspaceId,
          }
        )
      )
    );
  }

  /**
   * Notify project members
   */
  async notifyProjectMembers(
    projectId: string,
    title: string,
    message: string,
    memberIds: string[]
  ) {
    await Promise.all(
      memberIds.map((memberId) =>
        this.createNotification(
          memberId,
          NotificationType.PROJECT_UPDATED,
          title,
          message,
          {
            model: "Project",
            id: projectId,
          }
        )
      )
    );
  }

  /**
   * Notify about task activities
   */
  async notifyTaskActivity(
    taskId: string,
    type: NotificationType,
    title: string,
    message: string,
    userIds: string[]
  ) {
    await Promise.all(
      userIds.map((userId) =>
        this.createNotification(userId, type, title, message, {
          model: "Task",
          id: taskId,
        })
      )
    );
  }

  /**
   * Notify about workspace activities
   */
  async notifyWorkspaceActivity(
    workspaceId: string,
    type: NotificationType,
    title: string,
    message: string,
    userIds: string[]
  ) {
    await Promise.all(
      userIds.map((userId) =>
        this.createNotification(userId, type, title, message, {
          model: "Workspace",
          id: workspaceId,
        })
      )
    );
  }

  /**
   * Notify about issue activities
   */
  async notifyIssueActivity(
    issueId: string,
    type: NotificationType,
    title: string,
    message: string,
    userIds: string[]
  ) {
    await Promise.all(
      userIds.map((userId) =>
        this.createNotification(userId, type, title, message, {
          model: "Issue",
          id: issueId,
        })
      )
    );
  }
}
