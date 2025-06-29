"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  User,
  Flag,
  MessageSquare,
  Paperclip,
  Edit,
  Plus,
  MoreHorizontal,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { useUpdateTaskMutation } from "@/src/store/api/taskApi";
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task } from "../types";
import { TaskComments } from "../sections/TaskComments";
import { TaskAttachments } from "../sections/TaskAttachments";
import { TaskActivities } from "../sections/TaskActivities";
import { TaskSubtasks } from "../sections/TaskSubtasks";
import { EditTaskForm } from "../forms/EditTaskForm";
import { CreateTaskDialog } from "./CreateTaskDialog";

interface TaskDetailDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: () => void;
  workspaceId: string;
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

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdate,
  workspaceId,
}: TaskDetailDialogProps) {
  const [updateTask] = useUpdateTaskMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateSubtask, setShowCreateSubtask] = useState(false);

  const handleCheckboxChange = async (checked: boolean) => {
    try {
      await updateTask({
        id: task._id,
        data: {
          isCompleted: checked,
          status: checked ? TaskStatus.DONE : TaskStatus.TODO,
          completionPercentage: checked ? 100 : 0,
        },
      }).unwrap();
      onTaskUpdate();
      toast.success(checked ? "Task completed" : "Task reopened");
    } catch (error) {
      toast.error("Failed to update task");
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

  const subtaskProgress =
    task.subtasks.length > 0
      ? Math.round(
          (task.subtasks.filter((st) => st.isCompleted).length /
            task.subtasks.length) *
            100
        )
      : 0;

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <EditTaskForm
            task={task}
            workspaceId={workspaceId}
            onSave={() => {
              setIsEditing(false);
              onTaskUpdate();
            }}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <Checkbox
                  checked={task.isCompleted}
                  onCheckedChange={handleCheckboxChange}
                  className="mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <div className="flex-1">
                  <DialogTitle
                    className={cn(
                      "text-xl font-semibold text-left",
                      task.isCompleted && "line-through text-gray-500"
                    )}
                  >
                    {task.title}
                  </DialogTitle>
                  {task.description && (
                    <p className="text-gray-600 mt-2">{task.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Task Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Badge
                variant="outline"
                className={cn("font-medium", statusColors[task.status])}
              >
                {task.status.replace("_", " ").toUpperCase()}
              </Badge>

              <div className="flex items-center space-x-1">
                <Flag
                  className={cn("w-4 h-4", priorityColors[task.priority])}
                />
                <span className="text-gray-600">
                  {task.priority.replace("_", " ").toLowerCase()}
                </span>
              </div>

              {task.assignedTo && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={task.assignedTo.avatar} />
                    <AvatarFallback className="text-xs">
                      {getInitials(task.assignedTo.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-gray-600">{task.assignedTo.name}</span>
                </div>
              )}

              {task.dueDate && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    Due {format(new Date(task.dueDate), "MMM dd, yyyy")}
                  </span>
                </div>
              )}

              {task.estimatedHours && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {task.estimatedHours}h estimated
                  </span>
                </div>
              )}
            </div>

            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {task.labels.map((label) => (
                  <Badge
                    key={label._id}
                    variant="outline"
                    className="text-xs"
                    style={{
                      backgroundColor: `${label.color}20`,
                      borderColor: label.color,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Progress for parent tasks with subtasks */}
            {task.subtasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    Subtask Progress
                  </span>
                  <span className="text-gray-600">
                    {task.subtasks.filter((st) => st.isCompleted).length} of{" "}
                    {task.subtasks.length} completed
                  </span>
                </div>
                <Progress value={subtaskProgress} className="h-2" />
              </div>
            )}
          </DialogHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger
                value="subtasks"
                className="flex items-center space-x-1"
              >
                <span>Subtasks</span>
                {task.subtasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {task.subtasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="flex items-center space-x-1"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comments</span>
                {task.comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {task.comments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="flex items-center space-x-1"
              >
                <Paperclip className="w-4 h-4" />
                <span>Files</span>
                {task.attachments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {task.attachments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex items-center space-x-1"
              >
                <Activity className="w-4 h-4" />
                <span>Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">
                      Task Details
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created by:</span>
                        <span className="font-medium">
                          {task.createdBy.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>
                          {format(
                            new Date(task.createdAt),
                            "MMM dd, yyyy 'at' h:mm a"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last updated:</span>
                        <span>
                          {format(
                            new Date(task.updatedAt),
                            "MMM dd, yyyy 'at' h:mm a"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="capitalize">{task.type}</span>
                      </div>
                      {task.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed:</span>
                          <span>
                            {format(
                              new Date(task.completedAt),
                              "MMM dd, yyyy 'at' h:mm a"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Progress</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Completion:</span>
                        <span className="font-medium">
                          {task.completionPercentage}%
                        </span>
                      </div>
                      <Progress
                        value={task.completionPercentage}
                        className="h-2"
                      />

                      {task.estimatedHours && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Time estimated:</span>
                          <span>{task.estimatedHours} hours</span>
                        </div>
                      )}

                      {task.actualHours && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Time spent:</span>
                          <span>{task.actualHours} hours</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="subtasks" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Subtasks</h3>
                  <Button size="sm" onClick={() => setShowCreateSubtask(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subtask
                  </Button>
                </div>
                <TaskSubtasks
                  parentTask={task}
                  onTaskUpdate={onTaskUpdate}
                  projectId={task.project._id}
                />
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-6">
              <TaskComments taskId={task._id} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-6">
              <TaskAttachments taskId={task._id} />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <TaskActivities taskId={task._id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create Subtask Dialog */}
      <CreateTaskDialog
        open={showCreateSubtask}
        onOpenChange={setShowCreateSubtask}
        projectId={task.project._id}
        workspaceId={workspaceId}
        parentTaskId={task._id}
        onTaskCreated={onTaskUpdate}
      />
    </>
  );
}
