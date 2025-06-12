"use client";

import { useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageItem } from "./MessageItem";
import { Loader2, AlertCircle } from "lucide-react";
import type { ChatMessage } from "@/src/types/chat.types";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: any;
  onLoadMore: () => void;
}

export function MessageList({
  messages,
  isLoading,
  error,
  onLoadMore,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h3 className="mt-2 text-sm font-semibold">
            Failed to load messages
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
      <div className="space-y-4 py-4">
        {/* Load more button */}
        {hasMore && messages.length > 0 && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more messages"
              )}
            </Button>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const previousMessage = messages[index - 1];
          const showAvatar =
            !previousMessage ||
            previousMessage.sender._id !== message.sender._id ||
            new Date(message.createdAt).getTime() -
              new Date(previousMessage.createdAt).getTime() >
              300000; // 5 minutes

          return (
            <MessageItem
              key={message._id}
              message={message}
              showAvatar={showAvatar}
            />
          );
        })}

        {/* Loading indicator */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold">No messages yet</h3>
              <p className="text-sm text-muted-foreground">
                Be the first to send a message in this room
              </p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
