export enum TaskStatus {
  BACKLOG = "backlog",
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  IN_REVIEW = "in_review",
  DONE = "done",
  CANCELLED = "cancelled",
  BLOCKED = "blocked",
}

export enum TaskStatusType {
  UNSTARTED = "unstarted",
  STARTED = "started",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum TaskPriority {
  NO_PRIORITY = "no_priority",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
  CRITICAL = "critical",
}

export enum TaskType {
  TASK = "task",
  BUG = "bug",
  FEATURE = "feature",
  IMPROVEMENT = "improvement",
  ISSUE = "issue",
}
