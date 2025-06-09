export enum NotificationType {
  TASK_ASSIGNED = "task_assigned",
  TASK_UPDATED = "task_updated",
  TASK_COMPLETED = "task_completed",
  COMMENT_ADDED = "comment_added",
  MENTION = "mention",
  DUE_DATE_REMINDER = "due_date_reminder",
  INVITATION = "invitation",
  WORKSPACE_UPDATED = "workspace_updated",
  PROJECT_UPDATED = "project_updated",
  SYSTEM = "system",
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
  ARCHIVED = "archived",
}
