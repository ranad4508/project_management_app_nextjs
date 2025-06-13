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
  const { data: session } = useSession();
  const socketRef = useRef<any>(null);
  const { activeRoomId } = useSelector((state: RootState) => state.chat);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const [isConnected, setIsConnected] = useState(false);
  const [socketLoaded, setSocketLoaded] = useState(false);

  // Load socket.io-client dynamically
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("socket.io-client")
        .then((module) => {
          io = module.io;
          setSocketLoaded(true);
          console.log("✅ Socket.IO client loaded");
        })
        .catch((error) => {
          console.error("❌ Failed to load Socket.IO client:", error);
        });
    }
  }, []);

  useEffect(() => {
    if (!session?.user || !socketLoaded || !io) return;

    const connectSocket = () => {
      console.log("🔌 Attempting to connect to Socket.IO server...");

      try {
        // Get the auth token from session or localStorage
        const token =
          (session as any)?.accessToken || localStorage.getItem("token");

        if (!token) {
          console.error("❌ No authentication token available");
          return;
        }

        // Initialize socket connection
        const socket = io(window.location.origin, {
          transports: ["websocket", "polling"],
          timeout: 20000,
          forceNew: true,
          autoConnect: true,
          auth: {
            token: token,
          },
        });

        socketRef.current = socket;

        // Connection events
        socket.on("connect", () => {
          console.log("✅ Connected to chat server");
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
          console.log("❌ Disconnected from chat server:", reason);
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

            console.log(
              `🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              socket.connect();
            }, delay);
          }
        });

        socket.on("connect_error", (error: Error) => {
          console.error("❌ Socket connection error:", error.message);
          setIsConnected(false);
          dispatch(setConnected(false));

          // Fallback: try to reconnect after error
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts.current),
              30000
            );
            reconnectAttempts.current++;

            reconnectTimeoutRef.current = setTimeout(() => {
              socket.connect();
            }, delay);
          }
        });

        // Rest of the event handlers remain the same...
        // Message events
        socket.on("message:new", (message: ChatMessage) => {
          console.log("📨 New message received:", message);
          dispatch(addMessage(message));
        });

        socket.on("message:updated", (message: ChatMessage) => {
          dispatch(updateMessage(message));
        });

        socket.on("message:deleted", (messageId: string) => {
          if (activeRoomId) {
            dispatch(removeMessage({ roomId: activeRoomId, messageId }));
          }
        });

        // Reaction events
        socket.on(
          "reaction:added",
          (messageId: string, reaction: MessageReaction) => {
            dispatch(addReaction({ messageId, reaction }));
          }
        );

        socket.on(
          "reaction:removed",
          (messageId: string, reactionId: string) => {
            dispatch(removeReaction({ messageId, reactionId }));
          }
        );

        // Typing events
        socket.on("typing:start", (data: TypingIndicator) => {
          dispatch(addTypingUser(data));
        });

        socket.on("typing:stop", (data: TypingIndicator) => {
          dispatch(
            removeTypingUser({ roomId: data.roomId, userId: data.userId })
          );
        });

        // User presence events
        socket.on("user:online", (user: OnlineUser) => {
          dispatch(addOnlineUser(user));
        });

        socket.on("user:offline", (userId: string) => {
          dispatch(removeOnlineUser(userId));
        });

        // Error handling
        socket.on("error", (error: any) => {
          console.error("❌ Socket error:", error);
        });
      } catch (error) {
        console.error("❌ Failed to initialize socket:", error);
        setIsConnected(false);
        dispatch(setConnected(false));
      }
    };

    // Initial connection
    connectSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [session, dispatch, activeRoomId, socketLoaded]);

  const contextValue: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    sendMessage: (data) => {
      console.log("📤 Sending message via socket:", data);
      if (socketRef.current && isConnected) {
        socketRef.current.emit("message:send", data);
      } else {
        console.warn("⚠️ Socket not connected, message not sent");
      }
    },
    addReaction: (messageId, type) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("reaction:add", messageId, type);
      }
    },
    removeReaction: (messageId, reactionId) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("reaction:remove", messageId, reactionId);
      }
    },
    startTyping: (roomId) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("typing:start", roomId);
      }
    },
    stopTyping: (roomId) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("typing:stop", roomId);
      }
    },
    joinRoom: (roomId) => {
      console.log("🚪 Joining room:", roomId);
      if (socketRef.current && isConnected) {
        socketRef.current.emit("room:join", roomId);
      }
    },
    leaveRoom: (roomId) => {
      console.log("🚪 Leaving room:", roomId);
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
