"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useGetRoomMessagesQuery } from "@/src/store/api/chatApi";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { ReplyBar } from "./ReplyBar";
import { useSocket } from "./SocketProvider";
import {
  selectActiveRoom,
  selectRoomMessages,
  setMessages,
  appendMessages,
} from "@/src/store/slices/chatSlice";
import type { RootState } from "@/src/store";

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const { joinRoom, leaveRoom } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const dispatch = useDispatch();

  const activeRoom = useSelector(selectActiveRoom);
  const messages = useSelector(selectRoomMessages(roomId));

  // Skip RTK Query for pages > 1, use manual fetch
  const {
    data: messagesData,
    isLoading: isInitialLoading,
    error,
    refetch,
  } = useGetRoomMessagesQuery({ roomId, page: 1, limit: 50 }, { skip: false });

  // Join room when component mounts
  useEffect(() => {
    console.log(`🚪 [CHAT-WINDOW] Joining room: ${roomId}`);
    joinRoom(roomId);
    return () => {
      console.log(`🚪 [CHAT-WINDOW] Leaving room: ${roomId}`);
      leaveRoom(roomId);
    };
  }, [roomId, joinRoom, leaveRoom]);

  // Reset pagination when room changes
  useEffect(() => {
    console.log(
      `🔄 [CHAT-WINDOW] Room changed to: ${roomId}, resetting pagination`
    );
    setPage(1);
    setHasMore(true);
    // Clear messages for this room
    dispatch(setMessages({ roomId, messages: [] }));
  }, [roomId, dispatch]);

  // Load initial messages (page 1)
  useEffect(() => {
    if (messagesData?.messages) {
      console.log(
        `📥 [CHAT-WINDOW] Loading ${messagesData.messages.length} initial messages for room ${roomId}`
      );
      console.log(`📊 [CHAT-WINDOW] Pagination info:`, messagesData.pagination);

      dispatch(setMessages({ roomId, messages: messagesData.messages }));
      setHasMore(
        messagesData.pagination.page < messagesData.pagination.totalPages
      );

      console.log(
        `📄 [CHAT-WINDOW] Has more pages: ${
          messagesData.pagination.page < messagesData.pagination.totalPages
        }`
      );
    }
  }, [messagesData, roomId, dispatch]);

  // Manual fetch for additional pages
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;

    console.log(`📄 [CHAT-WINDOW] Loading more messages, page: ${page + 1}`);
    setIsLoadingMore(true);

    try {
      const response = await fetch(
        `/api/chat/rooms/${roomId}/messages?page=${page + 1}&limit=50`
      );
      const data = await response.json();

      if (data.success && data.data.messages.length > 0) {
        console.log(
          `📥 [CHAT-WINDOW] Loaded ${data.data.messages.length} more messages`
        );

        // Prepend older messages
        dispatch(appendMessages({ roomId, messages: data.data.messages }));
        setPage((prev) => prev + 1);
        setHasMore(data.data.pagination.page < data.data.pagination.totalPages);
      } else {
        console.log(`📄 [CHAT-WINDOW] No more messages to load`);
        setHasMore(false);
      }
    } catch (error) {
      console.error(`❌ [CHAT-WINDOW] Error loading more messages:`, error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive (only for initial load)
  useEffect(() => {
    if (page === 1 && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, page]);

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
    <div className="flex flex-1 flex-col h-full max-h-screen overflow-hidden">
      <ChatHeader room={activeRoom} />

      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            isLoading={isInitialLoading || isLoadingMore}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
          />
        </div>

        <div className="flex-shrink-0 border-t bg-background">
          <TypingIndicator roomId={roomId} />
          <ReplyBar />
          <div className="p-2 sm:p-3 lg:p-4">
            <MessageInput roomId={roomId} />
          </div>
        </div>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}
