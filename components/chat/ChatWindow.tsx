"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useGetRoomMessagesQuery } from "@/src/store/api/chatApi";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { useSocket } from "./SocketProvider";
import {
  selectActiveRoom,
  selectRoomMessages,
} from "@/src/store/slices/chatSlice";
import type { RootState } from "@/src/store";

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const { joinRoom, leaveRoom } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);

  const activeRoom = useSelector(selectActiveRoom);
  const messages = useSelector(selectRoomMessages(roomId));

  const {
    data: messagesData,
    isLoading,
    error,
  } = useGetRoomMessagesQuery({ roomId, page, limit: 50 });

  // Join room when component mounts
  useEffect(() => {
    joinRoom(roomId);
    return () => leaveRoom(roomId);
  }, [roomId, joinRoom, leaveRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!activeRoom) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Room not found</h3>
          <p className="text-sm text-muted-foreground">
            The selected room could not be loaded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <ChatHeader room={activeRoom} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          error={error}
          onLoadMore={() => setPage((prev) => prev + 1)}
        />

        <TypingIndicator roomId={roomId} />

        <MessageInput roomId={roomId} />
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}
