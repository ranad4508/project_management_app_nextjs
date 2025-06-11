"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import type {
  SocketMessagePayload,
  SocketReactionPayload,
} from "@/src/types/chat.types";

export function useSocket() {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
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

    cleanup(); // Clean up any existing connection

    // Initialize socket connection
    const socket = io(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      {
        path: "/api/socketio",
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        transports: ["websocket", "polling"],
        query: {
          userId: session.user.id,
        },
      }
    );

    // Set up event listeners
    socket.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);

      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
      setJoinedRooms([]);

      // Attempt to reconnect if disconnection wasn't intentional
      if (reason === "io server disconnect") {
        // Server disconnected, attempt to reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (session?.user && status === "authenticated") {
            socket.connect();
          }
        }, 2000);
      }
    });

    socket.on("rooms:joined", (rooms: string[]) => {
      console.log("Joined rooms:", rooms);
      setJoinedRooms(rooms);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);

      // Retry connection after delay if user is still authenticated
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
    if (status === "loading") return; // Wait for session to load

    if (status === "authenticated" && session?.user) {
      initializeSocket();
    } else {
      cleanup();
    }

    // Cleanup on unmount or when dependencies change
    return cleanup;
  }, [session, status, initializeSocket, cleanup]);

  // Send a message
  const sendMessage = useCallback(
    (payload: SocketMessagePayload) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("message:send", payload);
      } else {
        console.warn("Cannot send message: Socket not connected");
      }
    },
    [isConnected]
  );

  // Start typing indicator
  const startTyping = useCallback(
    (roomId: string) => {
      if (socketRef.current?.connected && isConnected && session?.user) {
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
      if (socketRef.current?.connected && isConnected && session?.user) {
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
      if (socketRef.current?.connected && isConnected && session?.user) {
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
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("message:reaction", payload);
      } else {
        console.warn("Cannot send reaction: Socket not connected");
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

  // Manual reconnect function
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
    joinRoom,
    leaveRoom,
    reconnect,
    socket: socketRef.current,
  };
}
