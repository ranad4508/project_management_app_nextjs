"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only connect if user is authenticated
    if (status === "authenticated" && session?.user?.id) {
      const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
        auth: {
          userId: session.user.id,
        },
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      });

      // Connection event handlers
      socketInstance.on("connect", () => {
        console.log("Socket connected:", socketInstance.id);
        setIsConnected(true);
        setConnectionError(null);
        
        // Join user-specific room
        socketInstance.emit("join:user", session.user.id);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setIsConnected(false);
        
        if (reason === "io server disconnect") {
          // Server disconnected, try to reconnect
          socketInstance.connect();
        }
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      socketInstance.on("reconnect", (attemptNumber) => {
        console.log("Socket reconnected after", attemptNumber, "attempts");
        setIsConnected(true);
        setConnectionError(null);
        toast.success("Connection restored");
      });

      socketInstance.on("reconnect_error", (error) => {
        console.error("Socket reconnection error:", error);
        setConnectionError(error.message);
      });

      // Global error handler
      socketInstance.on("error", (error) => {
        console.error("Socket error:", error);
        toast.error("Connection error: " + error.message);
      });

      setSocket(socketInstance);

      // Cleanup on unmount
      return () => {
        console.log("Cleaning up socket connection");
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      };
    } else if (status === "unauthenticated") {
      // User is not authenticated, disconnect socket if exists
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      }
    }
  }, [session?.user?.id, status]);

  // Auto-reconnect logic
  useEffect(() => {
    if (socket && !isConnected && !connectionError) {
      const reconnectInterval = setInterval(() => {
        if (!socket.connected) {
          console.log("Attempting to reconnect socket...");
          socket.connect();
        }
      }, 5000);

      return () => clearInterval(reconnectInterval);
    }
  }, [socket, isConnected, connectionError]);

  const value = {
    socket,
    isConnected,
    connectionError,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
