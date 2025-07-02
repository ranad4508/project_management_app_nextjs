"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SendMessageData,
  TypingIndicator,
  MessageReaction,
  ReactionType,
} from "@/src/types/chat.types";
import type { User } from "@/src/types/workspace.types";

export function useSocket() {
  const { data: session, status } = useSession();

  const [isConnected, setIsConnected] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);

  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setJoinedRooms([]);
  }, []);

  const initializeSocket = useCallback(() => {
    if (!session?.user || status !== "authenticated") return;
    if (socketRef.current?.connected) return; // Already connected

    cleanup();

    // Match this path exactly to your server setup:
    const socket = io(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      {
        path: "/api/socket/io", // <-- Match your server's path here
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        transports: ["websocket", "polling"],
        auth: {
          userId: session.user.id,
        },
      }
    );

    socket.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
      setJoinedRooms([]);

      if (reason === "io server disconnect") {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (session?.user && status === "authenticated") {
            socket.connect();
          }
        }, 2000);
      }
    });

    // Server emits "rooms:joined" (plural) per your backend code — listen accordingly
    socket.on("rooms:joined", (roomIds: string[]) => {
      console.log("Rooms joined:", roomIds);
      setJoinedRooms(roomIds);
    });

    // If your backend emits these events (optional)
    socket.on("room:joined", (roomId: string, user: User) => {
      console.log("Room joined event:", roomId, user);
      setJoinedRooms((prev) =>
        prev.includes(roomId) ? prev : [...prev, roomId]
      );
    });

    socket.on("room:left", (roomId: string, userId: string) => {
      console.log("Room left:", roomId, userId);
      setJoinedRooms((prev) => prev.filter((id) => id !== roomId));
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);

      if (session?.user && status === "authenticated") {
        reconnectTimeoutRef.current = setTimeout(() => {
          socket.connect();
        }, 3000);
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
    });

    socket.on("reconnect_error", (err) => {
      console.error("Socket reconnection error:", err);
    });

    socketRef.current = socket;
  }, [session, status, cleanup]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" && session?.user) {
      initializeSocket();
    } else {
      cleanup();
    }

    return cleanup;
  }, [session, status, initializeSocket, cleanup]);

  // Send a message with SendMessageData type
  const sendMessage = useCallback(
    (payload: SendMessageData) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("message:send", payload);
      } else {
        console.warn("Cannot send message: Socket not connected");
      }
    },
    [isConnected]
  );

  // Start typing — emit full TypingIndicator object (not just roomId)
  const startTyping = useCallback(
    (payload: TypingIndicator) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("typing:start", payload as any);
      }
    },
    [isConnected]
  );

  // Stop typing — emit full TypingIndicator object
  const stopTyping = useCallback(
    (payload: TypingIndicator) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("typing:stop", payload as any);
      }
    },
    [isConnected]
  );

  // Mark message as read
  const markMessageAsRead = useCallback(
    (roomId: string, messageId: string) => {
      if (socketRef.current?.connected && isConnected && session?.user?.id) {
        socketRef.current.emit("message:read", {
          roomId,
          messageId,
          userId: session.user.id,
        });
      }
    },
    [isConnected, session?.user?.id]
  );

  // Send reaction — emit full MessageReaction payload object
  const sendReaction = useCallback(
    (messageId: string, type: ReactionType) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("reaction:add", messageId, type);
      } else {
        console.warn("Cannot send reaction: Socket not connected");
      }
    },
    [isConnected]
  );

  // Remove reaction — emit full MessageReaction payload object
  const removeReaction = useCallback(
    (messageId: string, reactionId: string) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("reaction:remove", messageId, reactionId);
      }
    },
    [isConnected]
  );

  // Join a room
  const joinRoom = useCallback(
    (roomId: string) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("room:join", roomId);
        console.log("Joining room:", roomId);
      } else {
        console.warn("Cannot join room: Socket not connected");
      }
    },
    [isConnected]
  );

  // Leave a room
  const leaveRoom = useCallback(
    (roomId: string) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("room:leave", roomId);
        console.log("Leaving room:", roomId);
      }
    },
    [isConnected]
  );

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (session?.user && status === "authenticated") {
      cleanup();
      setTimeout(initializeSocket, 100);
    }
  }, [session, status, cleanup, initializeSocket]);

  return {
    isConnected,
    joinedRooms,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    sendReaction,
    removeReaction,
    joinRoom,
    leaveRoom,
    reconnect,
    socket: socketRef.current,
  };
}
