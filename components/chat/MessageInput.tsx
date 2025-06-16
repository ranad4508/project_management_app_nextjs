"use client";

import type React from "react";

import { useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "./EmojiPicker";
import { FileUploadDialog } from "./FileUploadDialog";
import { useSocket } from "./SocketProvider";
import { useSendMessageMutation } from "@/src/store/api/chatApi";
import { setReplyToMessage } from "@/src/store/slices/chatSlice";
import { Send, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RootState } from "@/src/store";
import { MessageType } from "@/src/types/chat.types";

interface MessageInputProps {
  roomId: string;
}

export function MessageInput({ roomId }: MessageInputProps) {
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    startTyping,
    stopTyping,
    sendMessage: sendSocketMessage,
    isConnected,
  } = useSocket();
  const { replyToMessage } = useSelector((state: RootState) => state.chat);

  const [sendMessage, { isLoading }] = useSendMessageMutation();

  const handleTyping = useCallback(() => {
    if (!isTyping && isConnected) {
      setIsTyping(true);
      startTyping(roomId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (isConnected) {
        stopTyping(roomId);
      }
    }, 1000);
  }, [isTyping, roomId, startTyping, stopTyping, isConnected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!message.trim() && attachedFiles.length === 0) || isLoading) return;

    const messageData = {
      roomId,
      content: message.trim() || "📎 File attachment",
      type: attachedFiles.length > 0 ? MessageType.FILE : MessageType.TEXT,
      attachments: attachedFiles,
      replyTo: replyToMessage?._id,
    };

    try {
      console.log("📤 Sending message:", messageData);

      // Try socket first if connected, fallback to API
      if (isConnected) {
        sendSocketMessage(messageData);
      } else {
        console.log("📡 Socket not connected, using API fallback");
        await sendMessage(messageData).unwrap();
      }

      // Clear form
      setMessage("");
      setAttachedFiles([]);
      setIsTyping(false);
      if (isConnected) {
        stopTyping(roomId);
      }
      dispatch(setReplyToMessage(null));

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Focus back to textarea
      textareaRef.current?.focus();
    } catch (error) {
      console.error("❌ Failed to send message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setMessage((prev) => prev + emoji);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t bg-background p-4">
      {/* Connection status */}
      {!isConnected && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ Chat server disconnected. Messages will be sent via API.
        </div>
      )}

      {/* File attachments preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 rounded-lg bg-muted p-2"
            >
              <span className="text-sm truncate max-w-32">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(index)}
                className="h-4 w-4 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-32 resize-none"
            rows={1}
          />
        </div>

        <div className="flex items-center space-x-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowFileUpload(true)}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <EmojiPicker onEmojiSelect={handleEmojiSelect} />

          <Button
            type="submit"
            size="sm"
            disabled={
              (!message.trim() && attachedFiles.length === 0) || isLoading
            }
            className={cn(
              "h-8 w-8 p-0",
              (message.trim() || attachedFiles.length > 0) &&
                "bg-primary text-primary-foreground"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* File Upload Dialog */}
      <FileUploadDialog
        open={showFileUpload}
        onOpenChange={setShowFileUpload}
        onFilesSelect={handleFilesSelect}
        maxFileSize={10 * 1024 * 1024} // 10MB
        allowedTypes={[
          "image/*",
          "application/pdf",
          "text/*",
          "video/*",
          "audio/*",
        ]}
        multiple={true}
      />
    </div>
  );
}
