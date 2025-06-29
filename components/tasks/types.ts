import type {
  TaskStatus,
  TaskStatusType,
  TaskPriority,
  TaskType,
} from "@/src/enums/task.enum";

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: {
    _id: string;
    name: string;
    workspace: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: TaskStatus;
  statusType: TaskStatusType;
  priority: TaskPriority;
  type: TaskType;
  labels: Label[];
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  activities: TaskActivity[];
  dependencies: string[];
  subtasks: Task[];
  parentTask?: string;
  isCompleted: boolean;
  completionPercentage: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  _id: string;
  name: string;
  color: string;
  description?: string;
  workspace: string;
  project?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TaskComment {
  _id: string;
  content: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivity {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  action: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  createdAt: string;
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  createdBy?: string;
  labels?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface TaskSort {
  field:
    | "title"
    | "status"
    | "priority"
    | "dueDate"
    | "createdAt"
    | "updatedAt";
  direction: "asc" | "desc";
}
