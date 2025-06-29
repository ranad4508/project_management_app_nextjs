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

      // Keep messages in newest-first order (as returned from database)
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

        // Reverse older messages to maintain chronological order (oldest first)
        const orderedOlderMessages = [...data.data.messages].reverse();
        // Prepend older messages
        dispatch(appendMessages({ roomId, messages: orderedOlderMessages }));
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

  // Auto-scroll to top when messages load (since newest messages are first)
  useEffect(() => {
    if (messages.length > 0) {
      // Use multiple timeouts to ensure scroll happens after DOM updates
      const scrollToTop = () => {
        // Scroll to top to show newest messages
        const scrollArea = document.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollArea) {
          scrollArea.scrollTo({
            top: 0,
            behavior: page === 1 ? "instant" : "smooth",
          });
        }
      };

      // Try multiple times to ensure it works
      setTimeout(scrollToTop, 50);
      setTimeout(scrollToTop, 150);
      setTimeout(scrollToTop, 300);
    }
  }, [messages.length, page]);

  // Scroll to top when room changes (to show latest messages)
  useEffect(() => {
    if (messages.length > 0) {
      const scrollToTop = () => {
        const scrollArea = document.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollArea) {
          scrollArea.scrollTo({
            top: 0,
            behavior: "instant",
          });
        }
      };

      setTimeout(scrollToTop, 100);
      setTimeout(scrollToTop, 300);
      setTimeout(scrollToTop, 500);
    }
  }, [roomId]);

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
            roomId={activeRoom._id}
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
    </div>
  );
}
