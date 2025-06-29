import {
  Circle,
  Clock,
  Play,
  Eye,
  CheckCircle,
  X,
  AlertTriangle,
  Flag,
  AlertCircle,
} from "lucide-react";
import {
  TaskStatus,
  TaskStatusType,
  TaskPriority,
} from "@/src/enums/task.enum";

export const getStatusConfig = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.BACKLOG:
      return {
        icon: Circle,
        color: "text-gray-500",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-300",
        label: "Backlog",
        className: "bg-gray-100 text-gray-800 border-gray-300",
      };
    case TaskStatus.TODO:
      return {
        icon: Circle,
        color: "text-blue-500",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-300",
        label: "To Do",
        className: "bg-blue-100 text-blue-800 border-blue-300",
      };
    case TaskStatus.IN_PROGRESS:
      return {
        icon: Play,
        color: "text-yellow-500",
        bgColor: "bg-yellow-100",
        borderColor: "border-yellow-300",
        label: "In Progress",
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    case TaskStatus.IN_REVIEW:
      return {
        icon: Eye,
        color: "text-purple-500",
        bgColor: "bg-purple-100",
        borderColor: "border-purple-300",
        label: "In Review",
        className: "bg-purple-100 text-purple-800 border-purple-300",
      };
    case TaskStatus.DONE:
      return {
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-100",
        borderColor: "border-green-300",
        label: "Done",
        className: "bg-green-100 text-green-800 border-green-300",
      };
    case TaskStatus.CANCELLED:
      return {
        icon: X,
        color: "text-red-500",
        bgColor: "bg-red-100",
        borderColor: "border-red-300",
        label: "Cancelled",
        className: "bg-red-100 text-red-800 border-red-300",
      };
    case TaskStatus.BLOCKED:
      return {
        icon: AlertTriangle,
        color: "text-orange-500",
        bgColor: "bg-orange-100",
        borderColor: "border-orange-300",
        label: "Blocked",
        className: "bg-orange-100 text-orange-800 border-orange-300",
      };
    default:
      return {
        icon: Circle,
        color: "text-gray-500",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-300",
        label: "Unknown",
        className: "bg-gray-100 text-gray-800 border-gray-300",
      };
  }
};

export const getPriorityConfig = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.CRITICAL:
      return {
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-500",
        label: "Critical",
        className: "bg-red-500 text-white",
      };
    case TaskPriority.URGENT:
      return {
        icon: Flag,
        color: "text-red-500",
        bgColor: "bg-red-400",
        label: "Urgent",
        className: "bg-red-400 text-white",
      };
    case TaskPriority.HIGH:
      return {
        icon: Flag,
        color: "text-orange-500",
        bgColor: "bg-orange-500",
        label: "High",
        className: "bg-orange-500 text-white",
      };
    case TaskPriority.MEDIUM:
      return {
        icon: Flag,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500",
        label: "Medium",
        className: "bg-yellow-500 text-white",
      };
    case TaskPriority.LOW:
      return {
        icon: Flag,
        color: "text-green-500",
        bgColor: "bg-green-500",
        label: "Low",
        className: "bg-green-500 text-white",
      };
    case TaskPriority.NO_PRIORITY:
      return {
        icon: Flag,
        color: "text-gray-500",
        bgColor: "bg-gray-400",
        label: "No Priority",
        className: "bg-gray-400 text-white",
      };
    default:
      return {
        icon: Flag,
        color: "text-gray-500",
        bgColor: "bg-gray-400",
        label: "Unknown",
        className: "bg-gray-400 text-white",
      };
  }
};

export const getStatusTypeConfig = (statusType: TaskStatusType) => {
  switch (statusType) {
    case TaskStatusType.UNSTARTED:
      return {
        icon: Circle,
        color: "text-gray-500",
        label: "Unstarted",
        className: "bg-gray-100 text-gray-800",
      };
    case TaskStatusType.STARTED:
      return {
        icon: Play,
        color: "text-blue-500",
        label: "Started",
        className: "bg-blue-100 text-blue-800",
      };
    case TaskStatusType.COMPLETED:
      return {
        icon: CheckCircle,
        color: "text-green-500",
        label: "Completed",
        className: "bg-green-100 text-green-800",
      };
    case TaskStatusType.CANCELLED:
      return {
        icon: X,
        color: "text-red-500",
        label: "Cancelled",
        className: "bg-red-100 text-red-800",
      };
    default:
      return {
        icon: Circle,
        color: "text-gray-500",
        label: "Unknown",
        className: "bg-gray-100 text-gray-800",
      };
  }
};

export const validateTaskDates = (startDate?: Date, dueDate?: Date) => {
  const errors: string[] = [];
  const now = new Date();

  if (startDate && startDate < now) {
    errors.push("Start date cannot be in the past");
  }

  if (dueDate && dueDate < now) {
    errors.push("Due date cannot be in the past");
  }

  if (startDate && dueDate && startDate > dueDate) {
    errors.push("Start date cannot be after due date");
  }

  return errors;
};

export const getTaskProgress = (task: any) => {
  // Calculate based on subtasks if available (priority over other methods)
  if (task.subtasks && task.subtasks.length > 0) {
    const completedSubtasks = task.subtasks.filter(
      (subtask: any) =>
        subtask.isCompleted || subtask.status === TaskStatus.DONE
    ).length;
    return Math.round((completedSubtasks / task.subtasks.length) * 100);
  }

  // If no subtasks, check if task is completed
  if (task.status === TaskStatus.DONE || task.isCompleted) {
    return 100;
  }

  // Use manual completion percentage if set
  if (task.completionPercentage) {
    return task.completionPercentage;
  }

  return 0;
};
