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

    // Convert File objects to metadata format for Socket.IO
    const processedAttachments = await Promise.all(
      attachedFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const data = Array.from(new Uint8Array(arrayBuffer));

        console.log("📎 Processing file with metadata:", {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        return {
          data,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        };
      })
    );

    const messageData = {
      roomId,
      content: message.trim() || "📎 File attachment",
      type: attachedFiles.length > 0 ? MessageType.FILE : MessageType.TEXT,
      attachments: processedAttachments,
      replyTo: replyToMessage?._id,
    };

    try {
      console.log("📤 Message sent:", {
        roomId: messageData.roomId,
        content: messageData.content,
        type: messageData.type,
        attachments: messageData.attachments.map((att) => ({
          name: att.name,
          type: att.type,
          size: att.size,
          lastModified: att.lastModified,
          data: `[Array of ${att.data.length} bytes]`,
        })),
      });

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
        <div className="mb-2 flex flex-wrap gap-1 sm:gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-1 sm:space-x-2 rounded-lg bg-muted p-1 sm:p-2"
            >
              <span className="text-xs sm:text-sm truncate max-w-20 sm:max-w-32">
                {file.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(index)}
                className="h-3 w-3 sm:h-4 sm:w-4 p-0"
              >
                <X className="h-2 w-2 sm:h-3 sm:w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end space-x-1 sm:space-x-2"
      >
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[36px] sm:min-h-[40px] max-h-24 sm:max-h-32 resize-none text-sm sm:text-base"
            rows={1}
          />
        </div>

        <div className="flex items-center space-x-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            onClick={() => setShowFileUpload(true)}
          >
            <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          <div className="hidden sm:block">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={
              (!message.trim() && attachedFiles.length === 0) || isLoading
            }
            className={cn(
              "h-7 w-7 sm:h-8 sm:w-8 p-0",
              (message.trim() || attachedFiles.length > 0) &&
                "bg-primary text-primary-foreground"
            )}
          >
            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </form>

      {/* File Upload Dialog */}
      <FileUploadDialog
        open={showFileUpload}
        onOpenChange={setShowFileUpload}
        onFilesSelect={handleFilesSelect}
        maxFileSize={100 * 1024 * 1024} // 100MB (WhatsApp-like)
        allowedTypes={[]} // Accept ALL file types like WhatsApp
        multiple={true}
      />
    </div>
  );
}
