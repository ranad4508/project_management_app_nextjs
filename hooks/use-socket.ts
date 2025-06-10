"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import type {
  SocketMessagePayload,
  SocketReactionPayload,
} from "@/src/types/chat.types";

export function useSocket() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Initialize socket connection
    const socket = io(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      {
        withCredentials: true,
      }
    );

    // Set up event listeners
    socket.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("rooms:joined", (rooms: string[]) => {
      console.log("Joined rooms:", rooms);
      setJoinedRooms(rooms);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);
    });

    socketRef.current = socket;

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session]);

  // Send a message
  const sendMessage = useCallback(
    (payload: SocketMessagePayload) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("message:send", payload);
      }
    },
    [isConnected]
  );

  // Start typing indicator
  const startTyping = useCallback(
    (roomId: string) => {
      if (socketRef.current && isConnected && session?.user) {
        socketRef.current.emit("typing:start", {
          roomId,
          userId: session.user.id,
          userName: session.user.name || "User",
          isTyping: true,
        });
      }
    },
    [isConnected, session]
  );

  // Stop typing indicator
  const stopTyping = useCallback(
    (roomId: string) => {
      if (socketRef.current && isConnected && session?.user) {
        socketRef.current.emit("typing:stop", {
          roomId,
          userId: session.user.id,
          userName: session.user.name || "User",
          isTyping: false,
        });
      }
    },
    [isConnected, session]
  );

  // Mark message as read
  const markMessageAsRead = useCallback(
    (roomId: string, messageId: string) => {
      if (socketRef.current && isConnected && session?.user) {
        socketRef.current.emit("message:read", {
          roomId,
          messageId,
          userId: session.user.id,
        });
      }
    },
    [isConnected, session]
  );

  // Send reaction
  const sendReaction = useCallback(
    (payload: SocketReactionPayload) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("message:reaction", payload);
      }
    },
    [isConnected]
  );

  // Join a room
  const joinRoom = useCallback(
    (roomId: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("room:join", { roomId });
      }
    },
    [isConnected]
  );

  // Leave a room
  const leaveRoom = useCallback(
    (roomId: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("room:leave", { roomId });
      }
    },
    [isConnected]
  );

  return {
    isConnected,
    joinedRooms,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    sendReaction,
    joinRoom,
    leaveRoom,
    socket: socketRef.current,
  };
}
