"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Send, MessageSquare, Edit, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";
import {
  useGetTaskByIdQuery,
  useAddTaskCommentMutation,
  useUpdateTaskCommentMutation,
  useDeleteTaskCommentMutation,
} from "@/src/store/api/taskApi";
import { toast } from "sonner";

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const [addComment, { isLoading: isAddingComment }] =
    useAddTaskCommentMutation();
  const [updateComment, { isLoading: isUpdatingComment }] =
    useUpdateTaskCommentMutation();
  const [deleteComment, { isLoading: isDeletingComment }] =
    useDeleteTaskCommentMutation();

  const {
    data: taskResponse,
    isLoading,
    refetch,
  } = useGetTaskByIdQuery(taskId);

  const task = taskResponse?.data;
  const comments = task?.comments || [];

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment({
        taskId,
        content: newComment.trim(),
      }).unwrap();

      setNewComment("");
      refetch();
      toast.success("Comment added successfully");
    } catch (error) {
      toast.error("Failed to add comment");
      console.error("Failed to add comment:", error);
    }
  };

  const handleEditStart = (commentId: string, currentContent: string) => {
    setEditingComment(commentId);
    setEditContent(currentContent);
  };

  const handleEditSave = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateComment({
        taskId,
        commentId,
        content: editContent.trim(),
      }).unwrap();

      setEditingComment(null);
      setEditContent("");
      refetch();
      toast.success("Comment updated successfully");
    } catch (error) {
      toast.error("Failed to update comment");
      console.error("Failed to update comment:", error);
    }
  };

  const handleEditCancel = () => {
    setEditingComment(null);
    setEditContent("");
  };

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return;

    try {
      await deleteComment({
        taskId,
        commentId: commentToDelete,
      }).unwrap();

      setShowDeleteConfirm(false);
      setCommentToDelete(null);
      refetch();
      toast.success("Comment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete comment");
      console.error("Failed to delete comment:", error);
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Comment */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Add a comment</h4>
            <Textarea
              placeholder="Write your comment here..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isAddingComment}
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                {isAddingComment ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-gray-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">No comments yet</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Be the first to add a comment to this task.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment._id}>
              <CardContent className="p-4">
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.user.avatar} />
                    <AvatarFallback className="text-xs">
                      {getInitials(comment.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(
                            new Date(comment.createdAt),
                            "MMM dd, yyyy 'at' h:mm a"
                          )}
                        </span>
                        {comment.updatedAt &&
                          comment.updatedAt !== comment.createdAt && (
                            <span className="text-xs text-gray-400">
                              (edited)
                            </span>
                          )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleEditStart(comment._id, comment.content)
                          }
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(comment._id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {editingComment === comment._id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[80px]"
                          placeholder="Edit your comment..."
                        />
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditSave(comment._id)}
                            disabled={isUpdatingComment || !editContent.trim()}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEditCancel}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {comment.content}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteConfirm(false);
                setCommentToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeletingComment}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingComment ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
