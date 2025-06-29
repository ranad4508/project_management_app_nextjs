import type {
  TaskStatus,
  TaskStatusType,
  TaskPriority,
  TaskType,
} from "@/src/enums/task.enum";
import type { Types } from "mongoose";

export interface CreateTaskData {
  title: string;
  description?: string;
  projectId: string;
  assignedTo?: string;
  status?: TaskStatus;
  statusType?: TaskStatusType;
  priority?: TaskPriority;
  type?: TaskType;
  dueDate?: Date;
  tags?: string[];
  labels?: string[]; // Array of label IDs
  estimatedHours?: number;
  parentTask?: string; // For subtasks
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  assignedTo?: string;
  status?: TaskStatus;
  statusType?: TaskStatusType;
  priority?: TaskPriority;
  type?: TaskType;
  dueDate?: Date;
  tags?: string[];
  labels?: string[]; // Array of label IDs
  estimatedHours?: number;
  actualHours?: number;
  isCompleted?: boolean;
  completionPercentage?: number;
}

export interface TaskComment {
  user: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TaskAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface TaskActivity {
  user: Types.ObjectId;
  action: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  createdAt: Date;
}
