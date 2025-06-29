"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { CreateTaskDialog } from "../dialogs/CreateTaskDialog";
import type { Task } from "../types";
import {
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "@/src/store/api/taskApi";
import { toast } from "sonner";
import { TaskStatus } from "@/src/enums/task.enum";

interface TaskSubtasksProps {
  parentTask: Task;
  onTaskUpdate: () => void;
  projectId: string;
}

export function TaskSubtasks({
  parentTask,
  onTaskUpdate,
  projectId,
}: TaskSubtasksProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null);

  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const subtasks = parentTask.subtasks || [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.isCompleted);
  const progress =
    subtasks.length > 0
      ? Math.round((completedSubtasks.length / subtasks.length) * 100)
      : 0;

  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    try {
      // Update the subtask - backend will automatically update parent task progress
      await updateTask({
        id: subtaskId,
        data: {
          isCompleted: completed,
          status: completed ? TaskStatus.DONE : TaskStatus.TODO,
          completionPercentage: completed ? 100 : 0,
        },
      }).unwrap();

      // Small delay to ensure backend has processed the parent task update
      setTimeout(() => {
        onTaskUpdate();
      }, 100);

      toast.success(completed ? "Subtask completed" : "Subtask reopened");
    } catch (error) {
      console.error("Failed to update subtask:", error);
      toast.error("Failed to update subtask");
    }
  };

  // Effect to handle parent task completion - auto-complete all subtasks
  React.useEffect(() => {
    if (
      parentTask.isCompleted &&
      subtasks.some((subtask) => !subtask.isCompleted)
    ) {
      // If parent task is completed but some subtasks are not, complete all subtasks
      const incompleteSubtasks = subtasks.filter(
        (subtask) => !subtask.isCompleted
      );

      const completeAllSubtasks = async () => {
        try {
          await Promise.all(
            incompleteSubtasks.map((subtask) =>
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

          onTaskUpdate();
          toast.success("All subtasks completed automatically");
        } catch (error) {
          console.error("Failed to auto-complete subtasks:", error);
          toast.error("Failed to auto-complete some subtasks");
        }
      };

      if (incompleteSubtasks.length > 0) {
        completeAllSubtasks();
      }
    }
  }, [parentTask.isCompleted, subtasks, updateTask, onTaskUpdate]);

  const handleEditStart = (subtask: Task) => {
    setEditingSubtask(subtask._id);
    setEditTitle(subtask.title);
  };

  const handleEditSave = async (subtaskId: string) => {
    if (!editTitle.trim()) {
      toast.error("Subtask title cannot be empty");
      return;
    }

    try {
      await updateTask({
        id: subtaskId,
        data: { title: editTitle.trim() },
      }).unwrap();

      setEditingSubtask(null);
      setEditTitle("");
      onTaskUpdate();
      toast.success("Subtask updated successfully");
    } catch (error) {
      toast.error("Failed to update subtask");
    }
  };

  const handleEditCancel = () => {
    setEditingSubtask(null);
    setEditTitle("");
  };

  const handleDeleteClick = (subtaskId: string) => {
    setSubtaskToDelete(subtaskId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!subtaskToDelete) return;

    try {
      await deleteTask(subtaskToDelete).unwrap();
      setShowDeleteConfirm(false);
      setSubtaskToDelete(null);
      onTaskUpdate();
      toast.success("Subtask deleted successfully");
    } catch (error) {
      toast.error("Failed to delete subtask");
    }
  };

  // Remove the early return for empty subtasks - we want to show the add button

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subtasks</CardTitle>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Subtask
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subtasks List */}
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <div
              key={subtask._id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Checkbox
                checked={subtask.isCompleted}
                onCheckedChange={(checked) =>
                  handleSubtaskToggle(subtask._id, checked as boolean)
                }
              />

              {editingSubtask === subtask._id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleEditSave(subtask._id);
                      } else if (e.key === "Escape") {
                        handleEditCancel();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditSave(subtask._id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span
                    className={`${
                      subtask.isCompleted
                        ? "line-through text-gray-500"
                        : "text-gray-900"
                    }`}
                  >
                    {subtask.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditStart(subtask)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClick(subtask._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {subtasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No subtasks yet. Click "Add Subtask" to create one.
            </div>
          )}
        </div>
      </CardContent>

      {/* Create Subtask Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId}
        parentTaskId={parentTask._id}
        workspaceId={parentTask.project.workspace}
        onTaskCreated={onTaskUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subtask</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subtask? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteConfirm(false);
                setSubtaskToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
