"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Loader2,
  Users,
  Hash,
  Lock,
} from "lucide-react";
import {
  useGetChatRoomMessagesQuery,
  useSendMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useDeleteMessageMutation,
  useMarkMessageAsReadMutation,
} from "@/src/store/api/chatApi";
import { useSocket } from "@/hooks/use-socket";
import { DecryptedMessage } from "@/src/types/chat.types";

interface ChatInterfaceProps {
  roomId: string;
  sessionKey?: string;
  workspaceId: string;
}

interface MessageItemProps {
  message: DecryptedMessage;
  currentUserId?: string;
  onReaction: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onMarkRead: (messageId: string) => void;
}

const MessageItem = ({
  message,
  currentUserId,
  onReaction,
  onDelete,
  onMarkRead,
}: MessageItemProps) => {
  const isOwnMessage = message.sender?.id === currentUserId;
  const [showActions, setShowActions] = useState(false);

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`flex ${
        isOwnMessage ? "justify-end" : "justify-start"
      } mb-4 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : "order-1"}`}>
        {!isOwnMessage && (
          <div className="flex items-center mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-2">
              {message.sender?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {message.sender?.name || "Unknown User"}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}

        <div
          className={`
            px-4 py-2 rounded-lg shadow-sm
            ${
              isOwnMessage
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-900 border border-gray-200"
            }
          `}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {isOwnMessage && (
            <div className="text-xs opacity-70 mt-1 text-right">
              {formatTime(message.createdAt)}
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((reaction, index) => (
              <button
                key={index}
                onClick={() => onReaction(message.id, reaction.emoji || "👍")}
                className="px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-colors"
              >
                {reaction.emoji}{" "}
                {
                  message.reactions?.filter((r) => r.emoji === reaction.emoji)
                    .length
                }
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Actions */}
      {showActions && (
        <div
          className={`
            flex items-center space-x-1 mx-2 opacity-0 group-hover:opacity-100 transition-opacity
            ${isOwnMessage ? "order-1" : "order-3"}
          `}
        >
          <button
            onClick={() => onReaction(message.id, "👍")}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Add reaction"
          >
            <Smile className="w-4 h-4 text-gray-500" />
          </button>

          {isOwnMessage && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Delete message"
            >
              <MoreVertical className="w-4 text-gray-500" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function ChatInterface({
  roomId,
  sessionKey,
  workspaceId,
}: ChatInterfaceProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    isConnected,
    socket,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
  } = useSocket();

  // Queries and mutations
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useGetChatRoomMessagesQuery(
    { roomId, pagination: { limit: 50, sortOrder: "asc" }, sessionKey },
    {
      skip: !roomId || !sessionKey || !isConnected,
      refetchOnMountOrArgChange: true,
    }
  );

  const [sendMessageMutation, { isLoading: isSending }] =
    useSendMessageMutation();
  const [addReaction] = useAddReactionMutation();
  const [removeReaction] = useRemoveReactionMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [markAsRead] = useMarkMessageAsReadMutation();

  // Socket integration
  useEffect(() => {
    if (!socket || !roomId || !isConnected) return;

    joinRoom(roomId);

    const handleMessageReceived = (payload: {
      roomId: string;
      message: DecryptedMessage;
    }) => {
      if (payload.roomId === roomId) {
        refetchMessages();
        markMessageAsRead(roomId, payload.message.id);
      }
    };

    const handleTypingStarted = (payload: {
      roomId: string;
      userId: string;
      userName: string;
    }) => {
      if (payload.roomId === roomId && payload.userId !== session?.user?.id) {
        setTypingUsers((prev) => [...new Set([...prev, payload.userName])]);
      }
    };

    const handleTypingStopped = (payload: {
      roomId: string;
      userId: string;
      userName: string;
    }) => {
      if (payload.roomId === roomId) {
        setTypingUsers((prev) =>
          prev.filter((name) => name !== payload.userName)
        );
      }
    };

    socket.on("message:received", handleMessageReceived);
    socket.on("typing:started", handleTypingStarted);
    socket.on("typing:stopped", handleTypingStopped);

    return () => {
      socket.off("message:received", handleMessageReceived);
      socket.off("typing:started", handleTypingStarted);
      socket.off("typing:stopped", handleTypingStopped);
      leaveRoom(roomId);
    };
  }, [
    socket,
    roomId,
    isConnected,
    refetchMessages,
    markMessageAsRead,
    session,
  ]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Mark unread messages as read
  useEffect(() => {
    if (
      messagesData?.messages &&
      session?.user?.id &&
      sessionKey &&
      isConnected
    ) {
      const unreadMessages = messagesData.messages.filter(
        (msg) => !msg.readBy?.some((read) => read.user === session.user.id)
      );
      unreadMessages.forEach((msg) => {
        markAsRead({ messageId: msg.id, roomId, sessionKey }).catch(() => {});
        markMessageAsRead(roomId, msg.id);
      });
    }
  }, [
    messagesData,
    session?.user?.id,
    sessionKey,
    markAsRead,
    markMessageAsRead,
    isConnected,
  ]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending || !sessionKey || !isConnected) {
      toast.error("Cannot send message: Check connection or session");
      return;
    }

    const messageToSend = message.trim();
    setMessage("");
    setIsTyping(false);

    try {
      const newMessage = await sendMessageMutation({
        roomId,
        content: messageToSend,
        messageType: "text",
        sessionKey,
      }).unwrap();
      sendMessage({ roomId, message: newMessage });
      refetchMessages();
    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast.error(error?.data?.error || "Failed to send message");
      setMessage(messageToSend);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handleTyping = () => {
    if (!isConnected || !roomId) return;
    if (!isTyping && message.length > 0) {
      setIsTyping(true);
      startTyping(roomId);
    } else if (isTyping && message.length === 0) {
      setIsTyping(false);
      stopTyping(roomId);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!sessionKey || !isConnected) {
      toast.error("Cannot add reaction: Not connected");
      return;
    }

    try {
      const existingMessage = messagesData?.messages.find(
        (m) => m.id === messageId
      );
      const existingReaction = existingMessage?.reactions?.find(
        (r) => r.emoji === emoji && r.user === session?.user?.id
      );

      if (existingReaction) {
        await removeReaction({
          messageId,
          reactionType: emoji,
          roomId,
          sessionKey,
        }).unwrap();
      } else {
        await addReaction({
          messageId,
          type: "emoji",
          emoji,
          roomId,
          sessionKey,
        }).unwrap();
      }
      refetchMessages();
    } catch (error: any) {
      console.error("Failed to handle reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!sessionKey || !isConnected) {
      toast.error("Cannot delete message: Not connected");
      return;
    }

    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      await deleteMessage({ messageId, roomId, sessionKey }).unwrap();
      toast.success("Message deleted");
      refetchMessages();
    } catch (error: any) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleMarkRead = async (messageId: string) => {
    if (!sessionKey || !isConnected) return;

    try {
      await markAsRead({ messageId, roomId, sessionKey }).unwrap();
    } catch (error: any) {
      console.error("Failed to mark message as read:", error);
    }
  };

  if (isLoadingMessages) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  const messages = messagesData?.messages || [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center">
          <div className="flex items-center mr-3">
            <Hash className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chat Room</h2>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {messages.length} messages
          </span>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="p-2 text-sm text-gray-600">
          {`${typingUsers.join(", ")} ${
            typingUsers.length > 1 ? "are" : "is"
          } typing...`}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <Hash className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No messages yet
              </h3>
              <p className="text-gray-600">
                Be the first to send a message in this room!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                currentUserId={session?.user?.id}
                onReaction={handleReaction}
                onDelete={handleDelete}
                onMarkRead={handleMarkRead}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Message this room..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none max-h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={isSending || !isConnected}
            />
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Attach file"
              disabled={!isConnected}
            >
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Add emoji"
              disabled={!isConnected}
            >
              <Smile className="w-5 h-5 text-gray-500" />
            </button>
            <button
              type="submit"
              disabled={!message.trim() || isSending || !isConnected}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
        {isTyping && (
          <div className="text-xs text-gray-500 mt-1">
            Press Enter to send, Shift+Enter for new line
          </div>
        )}
      </div>
    </div>
  );
}
