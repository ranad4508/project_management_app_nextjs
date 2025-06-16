"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import {
  setConnected,
  addMessage,
  updateMessage,
  removeMessage,
  addReaction,
  removeReaction,
  addOnlineUser,
  removeOnlineUser,
  addTypingUser,
  removeTypingUser,
} from "@/src/store/slices/chatSlice";
import type { RootState } from "@/src/store";
import type {
  ChatMessage,
  MessageReaction,
  TypingIndicator,
  OnlineUser,
} from "@/src/types/chat.types";

// Dynamic import for socket.io-client to avoid SSR issues
let io: any = null;

interface SocketContextType {
  socket: any | null;
  isConnected: boolean;
  sendMessage: (data: any) => void;
  addReaction: (messageId: string, type: string) => void;
  removeReaction: (messageId: string, reactionId: string) => void;
  startTyping: (roomId: string) => void;
  stopTyping: (roomId: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
  addReaction: () => {},
  removeReaction: () => {},
  startTyping: () => {},
  stopTyping: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
  workspaceId: string;
}

export function SocketProvider({ children, workspaceId }: SocketProviderProps) {
  const dispatch = useDispatch();
  const { data: session, status } = useSession();
  const socketRef = useRef<any>(null);
  const { activeRoomId } = useSelector((state: RootState) => state.chat);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const [isConnected, setIsConnected] = useState(false);
  const [socketLoaded, setSocketLoaded] = useState(false);

  // Enhanced logging for socket debugging
  const socketLog = (message: string, data?: any) => {
    console.log(`🔌 [SocketProvider] ${message}`, data || "");
  };

  // Load socket.io-client dynamically
  useEffect(() => {
    if (typeof window !== "undefined") {
      socketLog("Loading Socket.IO client...");
      import("socket.io-client")
        .then((module) => {
          io = module.io;
          setSocketLoaded(true);
          socketLog("✅ Socket.IO client loaded successfully");
        })
        .catch((error) => {
          socketLog("❌ Failed to load Socket.IO client:", error);
        });
    }
  }, []);

  useEffect(() => {
    socketLog("Session status:", status);
    socketLog("Session data:", session);
    socketLog("Socket loaded:", socketLoaded);
    socketLog("Workspace ID:", workspaceId);

    if (status === "loading") {
      socketLog("⏳ Session is loading...");
      return;
    }

    if (!session?.user?.id) {
      socketLog("❌ No session or user ID available");
      return;
    }

    if (!socketLoaded || !io) {
      socketLog("❌ Socket.IO not loaded yet");
      return;
    }

    const connectSocket = () => {
      socketLog("🔌 Attempting to connect to Socket.IO server...");
      socketLog("👤 User ID:", session.user.id);
      socketLog("🏢 Workspace ID:", workspaceId);

      try {
        // Use user ID for authentication instead of token
        const userId = session.user.id;

        // Initialize socket connection
        const socket = io(window.location.origin, {
          path: "/api/socket/io",
          transports: ["websocket", "polling"],
          timeout: 20000,
          forceNew: true,
          autoConnect: true,
          auth: {
            userId: userId, // Use userId instead of token
            workspaceId: workspaceId,
          },
        });

        socketRef.current = socket;

        // Connection events
        socket.on("connect", () => {
          socketLog("✅ Connected to chat server");
          console.log("✅ Socket connected to the chat server: SocketProvider");
          socketLog("🆔 Socket ID:", socket.id);
          socketLog("🔗 Transport:", socket.io.engine.transport.name);
          setIsConnected(true);
          dispatch(setConnected(true));
          reconnectAttempts.current = 0;

          // Clear any reconnection timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        });

        socket.on("disconnect", (reason: string) => {
          socketLog("❌ Disconnected from chat server:", reason);
          setIsConnected(false);
          dispatch(setConnected(false));

          // Auto-reconnect with exponential backoff
          if (
            reason !== "io client disconnect" &&
            reconnectAttempts.current < maxReconnectAttempts
          ) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts.current),
              30000
            );
            reconnectAttempts.current++;

            socketLog(
              `🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              socketLog("🔄 Attempting reconnection...");
              socket.connect();
            }, delay);
          } else {
            socketLog(
              "❌ Max reconnection attempts reached or manual disconnect"
            );
          }
        });

        socket.on("connect_error", (error: Error) => {
          socketLog("❌ Socket connection error:", error.message);
          socketLog("❌ Error details:", error);
          setIsConnected(false);
          dispatch(setConnected(false));

          // Fallback: try to reconnect after error
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts.current),
              30000
            );
            reconnectAttempts.current++;

            socketLog(`🔄 Retrying connection in ${delay}ms due to error`);

            reconnectTimeoutRef.current = setTimeout(() => {
              socketLog("🔄 Attempting reconnection after error...");
              socket.connect();
            }, delay);
          }
        });

        // Message events
        socket.on("message:new", (message: ChatMessage) => {
          socketLog("📨 New message received:", message);
          dispatch(addMessage(message));
        });

        socket.on("message:updated", (message: ChatMessage) => {
          socketLog("📝 Message updated:", message);
          dispatch(updateMessage(message));
        });

        socket.on("message:deleted", (messageId: string) => {
          socketLog("🗑️ Message deleted:", messageId);
          if (activeRoomId) {
            dispatch(removeMessage({ roomId: activeRoomId, messageId }));
          }
        });

        // Reaction events
        socket.on(
          "reaction:added",
          (messageId: string, reaction: MessageReaction) => {
            socketLog("👍 Reaction added:", { messageId, reaction });
            dispatch(addReaction({ messageId, reaction }));
          }
        );

        socket.on(
          "reaction:removed",
          (messageId: string, reactionId: string) => {
            socketLog("👎 Reaction removed:", { messageId, reactionId });
            dispatch(removeReaction({ messageId, reactionId }));
          }
        );

        // Typing events
        socket.on("typing:start", (data: TypingIndicator) => {
          socketLog("⌨️ User started typing:", data);
          dispatch(addTypingUser(data));
        });

        socket.on("typing:stop", (data: TypingIndicator) => {
          socketLog("⌨️ User stopped typing:", data);
          dispatch(
            removeTypingUser({ roomId: data.roomId, userId: data.userId })
          );
        });

        // User presence events
        socket.on("user:online", (user: OnlineUser) => {
          socketLog("🟢 User came online:", user);
          dispatch(addOnlineUser(user));
        });

        socket.on("user:offline", (userId: string) => {
          socketLog("🔴 User went offline:", userId);
          dispatch(removeOnlineUser(userId));
        });

        // Error handling
        socket.on("error", (error: any) => {
          socketLog("❌ Socket error:", error);
        });

        // Debug events
        socket.on("ping", () => {
          socketLog("🏓 Ping received");
        });

        socket.on("pong", (latency: number) => {
          socketLog("🏓 Pong received, latency:", latency + "ms");
        });
      } catch (error) {
        socketLog("❌ Failed to initialize socket:", error);
        setIsConnected(false);
        dispatch(setConnected(false));
      }
    };

    // Initial connection
    connectSocket();

    return () => {
      socketLog("🧹 Cleaning up socket connection...");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [
    session?.user?.id,
    status,
    dispatch,
    activeRoomId,
    socketLoaded,
    workspaceId,
  ]);

  const contextValue: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    sendMessage: (data) => {
      socketLog("📤 Sending message via socket:", data);
      if (socketRef.current && isConnected) {
        socketRef.current.emit("message:send", data);
      } else {
        socketLog("⚠️ Socket not connected, message not sent");
      }
    },
    addReaction: (messageId, type) => {
      socketLog("👍 Adding reaction:", { messageId, type });
      if (socketRef.current && isConnected && activeRoomId) {
        socketRef.current.emit("reaction:add", {
          messageId,
          type,
          roomId: activeRoomId,
        });
      }
    },
    removeReaction: (messageId, reactionId) => {
      socketLog("👎 Removing reaction:", { messageId, reactionId });
      if (socketRef.current && isConnected && activeRoomId) {
        socketRef.current.emit("reaction:remove", {
          messageId,
          reactionId,
          roomId: activeRoomId,
        });
      }
    },
    startTyping: (roomId) => {
      if (socketRef.current && isConnected && session?.user?.id) {
        socketRef.current.emit("typing:start", {
          roomId,
          userId: session.user.id,
        });
      }
    },
    stopTyping: (roomId) => {
      if (socketRef.current && isConnected && session?.user?.id) {
        socketRef.current.emit("typing:stop", {
          roomId,
          userId: session.user.id,
        });
      }
    },
    joinRoom: (roomId) => {
      socketLog("🚪 Joining room:", roomId);
      if (socketRef.current && isConnected) {
        socketRef.current.emit("room:join", roomId);
      }
    },
    leaveRoom: (roomId) => {
      socketLog("🚪 Leaving room:", roomId);
      if (socketRef.current && isConnected) {
        socketRef.current.emit("room:leave", roomId);
      }
    },
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}
