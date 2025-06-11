"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import type { DecryptedMessage } from "@/src/types/chat.types";

interface MessageListProps {
  messages: DecryptedMessage[];
  isLoading: boolean;
  error: any;
  onRetry: () => void;
  userId: string;
  onReply: (messageId: string) => void;
  onAddReaction: (messageId: string, type: string, emoji?: string) => void;
  onRemoveReaction: (messageId: string, reactionType: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

export default function MessageList({
  messages,
  isLoading,
  error,
  onRetry,
  userId,
  onReply,
  onAddReaction,
  onRemoveReaction,
  onDeleteMessage,
}: MessageListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col">
        <p className="text-red-500 mb-2">Failed to load messages</p>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`mb-4 ${
            msg.sender.id === userId ? "text-right" : "text-left"
          }`}
        >
          <div
            className={`inline-block p-2 rounded-lg ${
              msg.sender.id === userId ? "bg-blue-100" : "bg-gray-100"
            }`}
          >
            <div className="font-semibold">{msg.sender.name}</div>
            <div>{msg.content}</div>
            {msg.attachments?.map((att, idx) => (
              <a
                key={idx}
                href={att.fileUrl}
                className="text-blue-600 underline"
              >
                {att.fileName}
              </a>
            ))}
            <div className="text-xs text-gray-500">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant="ghost" onClick={() => onReply(msg.id)}>
                Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAddReaction(msg.id, "like")}
              >
                👍
              </Button>
              {msg.reactions
                .filter((r) => r.user === userId)
                .map((r) => (
                  <Button
                    key={r.type}
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveReaction(msg.id, r.type)}
                  >
                    {r.emoji || r.type}
                  </Button>
                ))}
              {msg.sender.id === userId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteMessage(msg.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
