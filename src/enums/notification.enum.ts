export enum NotificationType {
  TASK_ASSIGNED = "task_assigned",
  TASK_UPDATED = "task_updated",
  TASK_COMPLETED = "task_completed",
  TASK_CREATED = "task_created",
  TASK_DELETED = "task_deleted",
  COMMENT_ADDED = "comment_added",
  MENTION = "mention",
  DUE_DATE_REMINDER = "due_date_reminder",
  INVITATION = "invitation",
  WORKSPACE_CREATED = "workspace_created",
  WORKSPACE_UPDATED = "workspace_updated",
  WORKSPACE_DELETED = "workspace_deleted",
  PROJECT_CREATED = "project_created",
  PROJECT_UPDATED = "project_updated",
  PROJECT_DELETED = "project_deleted",
  ISSUE_CREATED = "issue_created",
  ISSUE_UPDATED = "issue_updated",
  ISSUE_ASSIGNED = "issue_assigned",
  ISSUE_RESOLVED = "issue_resolved",
  ISSUE_CLOSED = "issue_closed",
  SYSTEM = "system",
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
  ARCHIVED = "archived",
}
