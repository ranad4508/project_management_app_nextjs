"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
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
import { useSocket } from "./SocketProvider";
import { MoreHorizontal, Reply, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/src/types/chat.types";
import type { RootState } from "@/src/store";

interface MessageItemProps {
  message: ChatMessage;
  showAvatar: boolean;
}

export function MessageItem({ message, showAvatar }: MessageItemProps) {
  const { addReaction } = useSocket();
  const [showReactions, setShowReactions] = useState(false);

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isOwnMessage = currentUser?.id === message.sender._id;

  const handleReaction = (type: string) => {
    addReaction(message._id, type);
    setShowReactions(false);
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

  return (
    <div
      className={cn(
        "group flex space-x-3 hover:bg-accent/50 rounded-lg p-2 -mx-2 transition-colors",
        !showAvatar && "mt-1"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.sender.avatar || "/placeholder.svg"} />
            <AvatarFallback>
              {message.sender.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {message.sender.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatMessageTime(message.createdAt)}
            </span>
            {message.editedAt && (
              <Badge variant="secondary" className="text-xs">
                edited
              </Badge>
            )}
          </div>
        )}

        {/* Reply indicator */}
        {message.replyTo && typeof message.replyTo === "object" && (
          <div className="mb-2 pl-3 border-l-2 border-muted">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">{message.replyTo.sender.name}</span>
              <span className="ml-2">{message.replyTo.content}</span>
            </div>
          </div>
        )}

        {/* Message text */}
        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments attachments={message.attachments} />
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <MessageReactions
            reactions={message.reactions}
            messageId={message._id}
          />
        )}
      </div>

      {/* Message actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1">
          {/* Quick reactions */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => handleReaction("like")}
          >
            👍
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => handleReaction("love")}
          >
            ❤️
          </Button>

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </DropdownMenuItem>

              {isOwnMessage && (
                <>
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
