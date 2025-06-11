"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X } from "lucide-react";

interface MessageInputProps {
  isSending: boolean;
  onSend: (data: {
    content: string;
    attachments?: Array<{
      fileName: string;
      fileType: string;
      fileUrl: string;
      fileSize: number;
    }>;
    replyTo?: string;
  }) => void;
  replyTo: string | null;
  onCancelReply: () => void;
  onTyping: (isTyping: boolean) => void;
}

export default function MessageInput({
  isSending,
  onSend,
  replyTo,
  onCancelReply,
  onTyping,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping(false);
    };
  }, [onTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSend({ content, replyTo: replyTo || undefined });
    setContent("");
    if (replyTo) onCancelReply();
    onTyping(false);
  };

  return (
    <div className="p-4 border-t">
      {replyTo && (
        <div className="flex items-center mb-2">
          <span className="text-sm text-gray-600">Replying to message</span>
          <Button size="sm" variant="ghost" onClick={onCancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          disabled={isSending}
        />
        <Button type="submit" disabled={isSending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
