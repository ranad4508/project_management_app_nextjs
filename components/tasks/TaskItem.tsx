"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  MoreHorizontal,
  Paperclip,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  User,
  Flag,
  CheckSquare,
} from "lucide-react";
import {
  useUpdateTaskMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
} from "@/src/store/api/taskApi";
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Task } from "./types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TaskItemProps {
  task: Task;
  onClick: () => void;
  onUpdate: () => void;
  onEdit?: () => void;
  projectId: string;
  isParent?: boolean;
  isSubtask?: boolean;
  isExpanded?: boolean;
  onToggleExpansion?: () => void;
}

const statusColors = {
  [TaskStatus.BACKLOG]: "bg-gray-100 text-gray-700 border-gray-200",
  [TaskStatus.TODO]: "bg-blue-100 text-blue-700 border-blue-200",
  [TaskStatus.IN_PROGRESS]: "bg-yellow-100 text-yellow-700 border-yellow-200",
  [TaskStatus.IN_REVIEW]: "bg-purple-100 text-purple-700 border-purple-200",
  [TaskStatus.DONE]: "bg-green-100 text-green-700 border-green-200",
  [TaskStatus.CANCELLED]: "bg-red-100 text-red-700 border-red-200",
  [TaskStatus.BLOCKED]: "bg-orange-100 text-orange-700 border-orange-200",
};

const priorityColors = {
  [TaskPriority.NO_PRIORITY]: "text-gray-400",
  [TaskPriority.LOW]: "text-green-500",
  [TaskPriority.MEDIUM]: "text-yellow-500",
  [TaskPriority.HIGH]: "text-orange-500",
  [TaskPriority.URGENT]: "text-red-500",
  [TaskPriority.CRITICAL]: "text-red-700",
};

const priorityLabels = {
  [TaskPriority.NO_PRIORITY]: "No Priority",
  [TaskPriority.LOW]: "Low",
  [TaskPriority.MEDIUM]: "Medium",
  [TaskPriority.HIGH]: "High",
  [TaskPriority.URGENT]: "Urgent",
  [TaskPriority.CRITICAL]: "Critical",
};

export function TaskItem({
  task,
  onClick,
  onUpdate,
  onEdit,
  projectId,
  isParent = false,
  isSubtask = false,
  isExpanded = true,
  onToggleExpansion,
}: TaskItemProps) {
  const [updateTask] = useUpdateTaskMutation();
  const [createTask] = useCreateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDuplicateTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const duplicateData = {
        title: `${task.title} (Copy)`,
        description: task.description,
        projectId: projectId,
        status: TaskStatus.TODO,
        priority: task.priority,
        type: task.type,
        estimatedHours: task.estimatedHours,
        labels: task.labels?.map((l: any) => l._id) || [],
      };

      await createTask(duplicateData).unwrap();
      toast.success("Task duplicated successfully");
      onUpdate();
    } catch (error) {
      console.error("Failed to duplicate task:", error);
      toast.error("Failed to duplicate task");
    }
  };

  const handleDeleteTask = async () => {
    try {
      await deleteTask(task._id).unwrap();
      toast.success("Task deleted successfully");
      setShowDeleteDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleCheckboxChange = async (checked: boolean) => {
    try {
      // Update the main task
      await updateTask({
        id: task._id,
        data: {
          isCompleted: checked,
          status: checked ? TaskStatus.DONE : TaskStatus.TODO,
          completionPercentage: checked ? 100 : 0,
        },
      }).unwrap();

      // If task is being completed and has subtasks, complete all subtasks
      if (checked && task.subtasks && task.subtasks.length > 0) {
        const incompleteSubtasks = task.subtasks.filter(
          (subtask: any) => !subtask.isCompleted
        );

        if (incompleteSubtasks.length > 0) {
          await Promise.all(
            incompleteSubtasks.map((subtask: any) =>
              updateTask({
                id: subtask._id,
                data: {
                  isCompleted: true,
                  status: TaskStatus.DONE,
                  completionPercentage: 100,
                },
              }).unwrap()
            )
          );
        }
      }

      // Defer the update to avoid setState during render and allow backend to process
      setTimeout(() => onUpdate(), 100);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDueDateStatus = () => {
    if (!task.dueDate) return null;

    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const diffInDays = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays < 0) {
      return {
        type: "overdue",
        message: `Overdue by ${Math.abs(diffInDays)} day(s)`,
        color: "text-red-600",
      };
    } else if (diffInDays === 0) {
      return { type: "today", message: "Due today", color: "text-orange-600" };
    } else if (diffInDays === 1) {
      return {
        type: "tomorrow",
        message: "Due tomorrow",
        color: "text-yellow-600",
      };
    } else if (diffInDays <= 3) {
      return {
        type: "soon",
        message: `Due in ${diffInDays} days`,
        color: "text-yellow-600",
      };
    } else if (diffInDays <= 7) {
      return {
        type: "week",
        message: `Due in ${diffInDays} days`,
        color: "text-blue-600",
      };
    }

    return null;
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <div
      className={cn(
        "group flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:bg-gray-50 hover:border-gray-300",
        task.isCompleted && "opacity-75",
        isSubtask && "bg-gray-25 border-gray-100"
      )}
    >
      {/* Expand/Collapse for parent tasks */}
      {isParent && (
        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-auto w-auto"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpansion?.();
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </Button>
      )}

      {/* Checkbox */}
      <Checkbox
        checked={task.isCompleted}
        onCheckedChange={handleCheckboxChange}
        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
      />

      {/* Priority Indicator */}
      <div className="flex items-center">
        <Flag className={cn("w-4 h-4", priorityColors[task.priority])} />
      </div>

      {/* Task Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center space-x-3">
          <h4
            className={cn(
              "text-sm font-medium text-gray-900 truncate",
              task.isCompleted && "line-through text-gray-500"
            )}
          >
            {task.title}
          </h4>

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex items-center space-x-1">
              {task.labels.slice(0, 3).map((label) => (
                <Badge
                  key={label._id}
                  variant="outline"
                  className="text-xs px-2 py-0"
                  style={{
                    backgroundColor: `${label.color}20`,
                    borderColor: label.color,
                    color: label.color,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
              {task.labels.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  +{task.labels.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Task Meta */}
        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
          {task.description && (
            <span className="truncate max-w-xs">{task.description}</span>
          )}

          {task.dueDate && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(task.dueDate), "MMM dd")}</span>
            </div>
          )}

          {task.estimatedHours && (
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}

          {task.attachments.length > 0 && (
            <div className="flex items-center space-x-1">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="flex items-center space-x-1">
              <CheckSquare className="w-3 h-3" />
              <span>
                {task.subtasks.filter((subtask) => subtask.isCompleted).length}/
                {task.subtasks.length}
              </span>
            </div>
          )}

          {task.comments.length > 0 && (
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>

        {/* Due Date Warning */}
        {dueDateStatus && (
          <div className={`mt-2 text-xs font-medium ${dueDateStatus.color}`}>
            {dueDateStatus.message}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <Badge
        variant="outline"
        className={cn("text-xs font-medium", statusColors[task.status])}
      >
        {task.status.replace("_", " ").toUpperCase()}
      </Badge>

      {/* Priority Badge */}
      <Badge variant="outline" className="text-xs">
        {priorityLabels[task.priority]}
      </Badge>

      {/* Assignee Avatar */}
      {task.assignedTo ? (
        <Avatar className="w-6 h-6">
          <AvatarImage src={task.assignedTo.avatar} />
          <AvatarFallback className="text-xs">
            {getInitials(task.assignedTo.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
          <User className="w-3 h-3 text-gray-400" />
        </div>
      )}

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onClick}>View Details</DropdownMenuItem>
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>Edit Task</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleDuplicateTask}>
            Duplicate
          </DropdownMenuItem>
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-red-600"
                onSelect={(e) => e.preventDefault()}
              >
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{task.title}"? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTask}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Task
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
