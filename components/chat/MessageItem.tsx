"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageReactions } from "./MessageReactions";
import { MessageAttachments } from "./MessageAttachments";
import { MessageInfoDialog } from "./MessageInfoDialog";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { useSocket } from "./SocketProvider";
import {
  MoreHorizontal,
  Reply,
  Edit,
  Trash2,
  Info,
  Forward,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setReplyToMessage } from "@/src/store/slices/chatSlice";
import type { ChatMessage } from "@/src/types/chat.types";
import type { RootState } from "@/src/store";

interface MessageItemProps {
  message: ChatMessage;
  showAvatar: boolean;
  isEncrypted?: boolean;
}

export function MessageItem({
  message,
  showAvatar,
  isEncrypted = false,
}: MessageItemProps) {
  const { addReaction } = useSocket();
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const dispatch = useDispatch();

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isOwnMessage = currentUser?.id === message.sender?._id;

  const handleReaction = (type: string) => {
    addReaction(message._id, type);
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
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
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

        {/* Message text */}
        <div className="text-xs sm:text-sm text-foreground whitespace-pre-wrap break-words max-w-full overflow-wrap-anywhere">
          {message.content}
        </div>

        {/* Reactions - moved to be directly below text */}
        {message.reactions.length > 0 && (
          <MessageReactions
            reactions={message.reactions}
            messageId={message._id}
          />
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments attachments={message.attachments} />
        )}
      </div>

      {/* Message actions - Hidden on mobile, shown on hover on desktop */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
        <div className="flex items-center space-x-0.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
          {/* Quick reactions */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            onClick={() => handleReaction("like")}
            title="Like"
          >
            <span className="text-xs sm:text-sm">👍</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            onClick={() => handleReaction("love")}
            title="Love"
          >
            <span className="text-xs sm:text-sm">❤️</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            onClick={() => handleReaction("laugh")}
            title="Laugh"
          >
            <span className="text-xs sm:text-sm">😂</span>
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
                  <DropdownMenuItem
                    onClick={() => console.log("Edit message:", message._id)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Message
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Delete message:", message._id)}
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
      />

      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        message={message}
      />
    </div>
  );
}
