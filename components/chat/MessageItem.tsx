"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageReactions } from "./MessageReactions";
import { MessageAttachments } from "./MessageAttachments";
import { MessageInfoDialog } from "./MessageInfoDialog";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import {
  MoreHorizontal,
  Reply,
  Edit,
  Trash2,
  Info,
  Forward,
  Copy,
  ExternalLink,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setReplyToMessage } from "@/src/store/slices/chatSlice";
import {
  useEditMessageMutation,
  useDeleteMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  chatApi,
} from "@/src/store/api/chatApi";
import type { ChatMessage } from "@/src/types/chat.types";
import { toast } from "sonner";

// Utility functions for link detection and YouTube embedding
const isYouTubeUrl = (url: string): boolean => {
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
};

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

const isUrl = (text: string): boolean => {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
};

const renderMessageContent = (content: string) => {
  // Debug log for content rendering
  if (content.includes("hello")) {
    console.log("🎨 [renderMessageContent] Rendering content:", content);
  }

  // Split content by spaces to find URLs
  const words = content.split(/(\s+)/);

  return words.map((word, index) => {
    const trimmedWord = word.trim();

    if (isUrl(trimmedWord)) {
      return (
        <a
          key={index}
          href={trimmedWord}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline inline-flex items-center gap-1"
        >
          {trimmedWord}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }

    return word;
  });
};

interface MessageItemProps {
  message: ChatMessage;
  showAvatar: boolean;
  isEncrypted?: boolean;
  roomId: string;
}

export function MessageItem({
  message,
  showAvatar,
  isEncrypted = false,
  roomId,
}: MessageItemProps) {
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<
    "delete_for_me" | "unsend_for_everyone"
  >("delete_for_me");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const dispatch = useDispatch();

  const [editMessage] = useEditMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [addReactionMutation] = useAddReactionMutation();
  const [removeReactionMutation] = useRemoveReactionMutation();

  // Use NextAuth session instead of Redux auth state
  const { data: session } = useSession();
  const currentUser = session?.user;
  const isOwnMessage = currentUser?.id === message.sender?._id;

  // Sync editContent with message.content when message changes
  useEffect(() => {
    if (!isEditing) {
      setEditContent(message.content);
    }
  }, [message.content, isEditing]);

  // Debug log to verify the fix and content updates
  if (message.content.includes("hello") || message.isEdited) {
    console.log("🔧 [MessageItem] Debug for edited message:", {
      messageId: message._id,
      messageContent: message.content,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      editContent: editContent,
      isEditing: isEditing,
    });
  }

  const handleReaction = async (type: string) => {
    if (!currentUser?.id) {
      toast.error("Please log in to react to messages");
      return;
    }

    try {
      // Check if user already has a reaction on this message
      const userExistingReaction = message.reactions.find(
        (reaction) => reaction.user?._id === currentUser.id
      );

      if (userExistingReaction) {
        if (userExistingReaction.type === type) {
          // Same reaction - remove it
          await removeReactionMutation({
            messageId: message._id,
            reactionId: userExistingReaction._id,
            roomId,
          }).unwrap();

          return;
        } else {
          // Different reaction - remove old one first, then add new one
          await removeReactionMutation({
            messageId: message._id,
            reactionId: userExistingReaction._id,
            roomId,
          }).unwrap();
        }
      }

      // Add new reaction
      await addReactionMutation({
        messageId: message._id,
        type: type as any, // Cast to ReactionType
        roomId,
      }).unwrap();
    } catch (error) {
      console.error("Failed to update reaction:", error);
      toast.error("Failed to update reaction. Please try again.");
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleReply = () => {
    dispatch(setReplyToMessage(message));
  };

  const handleForward = () => {
    setShowForwardDialog(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() === "") {
      toast.error("Message cannot be empty");
      return;
    }

    console.log("🔧 [MessageItem] Starting edit:", {
      messageId: message._id,
      originalContent: message.content,
      newContent: editContent.trim(),
      roomId,
    });

    try {
      const result = await editMessage({
        messageId: message._id,
        content: editContent.trim(),
        roomId,
      }).unwrap();

      console.log("✅ [MessageItem] Edit successful:", result);
      setIsEditing(false);
      toast.success("Message edited successfully");
    } catch (error) {
      console.error("❌ [MessageItem] Edit failed:", error);
      toast.error("Failed to edit message. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMessage({
        messageId: message._id,
        roomId,
        deleteType,
      }).unwrap();
      setShowDeleteDialog(false);

      const successMessage =
        deleteType === "unsend_for_everyone"
          ? "Message unsent for everyone"
          : "Message deleted from your view";
      toast.success(successMessage);
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message. Please try again.");
    }
  };

  const formatMessageTime = (date: string | Date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours =
      (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return messageDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Type guard to check if replyTo is a populated message object
  const isPopulatedReplyTo = (
    replyTo: string | ChatMessage | undefined
  ): replyTo is ChatMessage => {
    return (
      typeof replyTo === "object" &&
      replyTo !== null &&
      "sender" in replyTo &&
      "content" in replyTo
    );
  };

  return (
    <div
      className={cn(
        "group flex space-x-2 sm:space-x-3 hover:bg-accent/50 rounded-lg p-1 sm:p-2 -mx-1 sm:-mx-2 transition-colors",
        !showAvatar && "mt-1"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
            <AvatarImage src={message.sender?.avatar || "/placeholder.svg"} />
            <AvatarFallback className="text-xs sm:text-sm">
              {message.sender?.name
                ? message.sender.name.charAt(0).toUpperCase()
                : "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-6 sm:w-8" />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0 max-w-full overflow-hidden relative">
        {showAvatar && (
          <div className="flex items-baseline space-x-1 sm:space-x-2 mb-1">
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
              {message.sender?.name || "Unknown User"}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatMessageTime(message.createdAt)}
            </span>

            {message.editedAt && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                edited
              </Badge>
            )}
          </div>
        )}

        {/* Reply indicator */}
        {message.replyTo && isPopulatedReplyTo(message.replyTo) && (
          <div className="mb-2 sm:mb-3 p-1 sm:p-2 bg-muted/50 rounded-md border-l-4 border-primary/50">
            <div className="flex items-start space-x-1 sm:space-x-2">
              <Reply className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1 mb-1">
                  <span className="text-xs font-medium text-primary">
                    {message.replyTo.sender?.name || "Unknown User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    replied to
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                  {message.replyTo.content}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message text with clickable links or edit input */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 text-xs sm:text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-foreground whitespace-pre-wrap break-words max-w-full overflow-wrap-anywhere">
            {renderMessageContent(message.content)}
            {message.isEdited && (
              <span className="text-xs text-muted-foreground ml-2">
                (edited)
              </span>
            )}
          </div>
        )}

        {/* YouTube video preview */}
        {(() => {
          const trimmedContent = message.content.trim();
          if (isYouTubeUrl(trimmedContent)) {
            const videoId = extractYouTubeId(trimmedContent);
            if (videoId) {
              return (
                <div className="mt-3 rounded-lg overflow-hidden border bg-gray-50 dark:bg-gray-800 max-w-md">
                  <div className="relative">
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                      alt="YouTube video thumbnail"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        // Fallback to medium quality thumbnail
                        const target = e.target as HTMLImageElement;
                        target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                      }}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
                      onClick={() => window.open(trimmedContent, "_blank")}
                    >
                      <div className="bg-red-600 hover:bg-red-700 rounded-full p-3 transition-colors">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-red-600 rounded p-1">
                        <Play className="h-3 w-3 text-white fill-white" />
                      </div>
                      <span className="text-sm font-medium">YouTube Video</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      Click to watch on YouTube
                    </p>
                  </div>
                </div>
              );
            }
          }
          return null;
        })()}

        {/* Reactions - positioned like Messenger (bottom-right of message bubble) */}
        {message.reactions.length > 0 && (
          <div className=" -bottom-2 right-2 z-10">
            <MessageReactions
              reactions={message.reactions}
              messageId={message._id}
              roomId={roomId}
            />
          </div>
        )}

        {/* Add margin bottom when reactions exist to prevent overlap */}
        {message.reactions.length > 0 && <div className="mb-3" />}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments attachments={message.attachments} />
        )}
      </div>

      {/* Quick reactions bar - Like Messenger */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
        <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:scale-125 transition-transform duration-150 rounded-full"
            onClick={() => handleReaction("like")}
            title="Like"
          >
            <span className="text-sm">👍</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:scale-125 transition-transform duration-150 rounded-full"
            onClick={() => handleReaction("love")}
            title="Love"
          >
            <span className="text-sm">❤️</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:scale-125 transition-transform duration-150 rounded-full"
            onClick={() => handleReaction("laugh")}
            title="Laugh"
          >
            <span className="text-sm">😂</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:scale-125 transition-transform duration-150 rounded-full"
            onClick={() => handleReaction("wow")}
            title="Wow"
          >
            <span className="text-sm">😮</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:scale-125 transition-transform duration-150 rounded-full"
            onClick={() => handleReaction("sad")}
            title="Sad"
          >
            <span className="text-sm">😢</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:scale-125 transition-transform duration-150 rounded-full"
            onClick={() => handleReaction("angry")}
            title="Angry"
          >
            <span className="text-sm">😠</span>
          </Button>

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleReply}>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleCopyText}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Text
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleForward}>
                <Forward className="mr-2 h-4 w-4" />
                Forward
              </DropdownMenuItem>

              {isOwnMessage && (
                <>
                  <div className="border-t my-1" />
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Message
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Message
                  </DropdownMenuItem>
                </>
              )}

              <div className="border-t my-1" />
              <DropdownMenuItem onClick={() => setShowMessageInfo(true)}>
                <Info className="mr-2 h-4 w-4" />
                Message Info
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Message Info Dialog */}
      <MessageInfoDialog
        open={showMessageInfo}
        onOpenChange={setShowMessageInfo}
        message={message}
        roomId={roomId}
      />

      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        message={message}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Choose how you want to delete this message:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="delete_for_me"
                name="deleteType"
                value="delete_for_me"
                checked={deleteType === "delete_for_me"}
                onChange={(e) =>
                  setDeleteType(e.target.value as "delete_for_me")
                }
                className="w-4 h-4"
              />
              <label htmlFor="delete_for_me" className="text-sm">
                <strong>Delete for me</strong> - Remove from your view only
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="unsend_for_everyone"
                name="deleteType"
                value="unsend_for_everyone"
                checked={deleteType === "unsend_for_everyone"}
                onChange={(e) =>
                  setDeleteType(e.target.value as "unsend_for_everyone")
                }
                className="w-4 h-4"
              />
              <label htmlFor="unsend_for_everyone" className="text-sm">
                <strong>Unsend for everyone</strong> - Remove for all
                participants
              </label>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {deleteType === "unsend_for_everyone"
                ? "Unsend Message"
                : "Delete for Me"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
