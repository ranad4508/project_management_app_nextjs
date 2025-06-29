"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { TaskItem } from "./TaskItem";
import type { Task } from "./types";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  error: any;
  onTaskClick: (task: Task) => void;
  onTaskUpdate: () => void;
  onTaskEdit?: (task: Task) => void;
  projectId: string;
}

export function TaskList({
  tasks,
  isLoading,
  error,
  onTaskClick,
  onTaskUpdate,
  onTaskEdit,
  projectId,
}: TaskListProps) {
  // State to track which parent tasks are expanded (default to expanded)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    new Set(tasks.filter((task) => !task.parentTask).map((task) => task._id))
  );

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-5 w-5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load tasks. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                No tasks yet
              </h3>
              <p className="text-gray-600 mt-1">
                Create your first task to get started with project management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group tasks by parent/subtask relationship
  const parentTasks = tasks.filter((task) => !task.parentTask);
  const subtasksByParent = tasks.reduce((acc, task) => {
    if (task.parentTask) {
      if (!acc[task.parentTask]) {
        acc[task.parentTask] = [];
      }
      acc[task.parentTask].push(task);
    }
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          {parentTasks.map((task) => {
            const hasSubtasks = !!subtasksByParent[task._id]?.length;
            const isTaskExpanded = expandedTasks.has(task._id);

            return (
              <div key={task._id} className="space-y-1">
                <TaskItem
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onUpdate={onTaskUpdate}
                  onEdit={onTaskEdit ? () => onTaskEdit(task) : undefined}
                  projectId={projectId}
                  isParent={hasSubtasks}
                  isExpanded={isTaskExpanded}
                  onToggleExpansion={() => toggleTaskExpansion(task._id)}
                />

                {/* Render subtasks only if expanded */}
                {hasSubtasks && isTaskExpanded && (
                  <>
                    {subtasksByParent[task._id]?.map((subtask) => (
                      <div key={subtask._id} className="ml-8">
                        <TaskItem
                          task={subtask}
                          onClick={() => onTaskClick(subtask)}
                          onUpdate={onTaskUpdate}
                          onEdit={
                            onTaskEdit ? () => onTaskEdit(subtask) : undefined
                          }
                          projectId={projectId}
                          isSubtask={true}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
