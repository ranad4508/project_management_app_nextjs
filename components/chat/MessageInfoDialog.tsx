"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageReactions } from "./MessageReactions";
import { MessageAttachments } from "./MessageAttachments";
import { Shield, Clock, User, Hash, Reply as ReplyIcon } from "lucide-react";
import type { ChatMessage } from "@/src/types/chat.types";

interface MessageInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage;
}

const isPopulatedReplyTo = (replyTo: any): replyTo is ChatMessage => {
  return replyTo && typeof replyTo === "object" && replyTo._id && replyTo.content;
};

export function MessageInfoDialog({
  open,
  onOpenChange,
  message,
}: MessageInfoDialogProps) {
  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "PPP 'at' p");
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "p");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Message Info
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Sender Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Sender
              </h3>
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={message.sender?.avatar || "/placeholder.svg"} />
                  <AvatarFallback>
                    {message.sender?.name
                      ? message.sender.name.charAt(0).toUpperCase()
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {message.sender?.name || "Unknown User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {message.sender?.email || "No email available"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Timing Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timing
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent:</span>
                  <span className="font-medium">{formatDateTime(message.createdAt)}</span>
                </div>
                {message.editedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Edited:</span>
                    <span className="font-medium">{formatDateTime(message.editedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{formatTime(message.createdAt)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Message Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Message Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="secondary" className="text-xs">
                    {message.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                    {message._id}
                  </code>
                </div>
                {message.encryptedContent && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encrypted:</span>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-green-600" />
                      <span className="text-green-600 text-xs font-medium">Yes</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reply Information */}
            {message.replyTo && isPopulatedReplyTo(message.replyTo) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ReplyIcon className="h-4 w-4" />
                    Reply To
                  </h3>
                  <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={message.replyTo.sender?.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {message.replyTo.sender?.name
                            ? message.replyTo.sender.name.charAt(0).toUpperCase()
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">
                        {message.replyTo.sender?.name || "Unknown User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.replyTo.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {message.replyTo.content}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Message Content */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Content</h3>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    Attachments ({message.attachments.length})
                  </h3>
                  <MessageAttachments attachments={message.attachments} />
                </div>
              </>
            )}

            {/* Reactions */}
            {message.reactions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    Reactions ({message.reactions.length})
                  </h3>
                  <MessageReactions
                    reactions={message.reactions}
                    messageId={message._id}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
