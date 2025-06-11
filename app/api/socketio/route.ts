import { NextRequest } from "next/server";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Extend the global object to store the socket server
declare global {
  var socketio: SocketIOServer | undefined;
}

// Store active connections and room memberships
const activeConnections = new Map<string, any>();
const userRooms = new Map<string, Set<string>>();

export async function GET(req: NextRequest) {
  if (!global.socketio) {
    console.log("Initializing Socket.IO server...");

    // Create HTTP server instance (this is a workaround for Next.js)
    const res = new Response();
    const httpServer = (res as any).socket?.server;

    if (!httpServer) {
      return new Response("Socket.IO server not available", { status: 500 });
    }

    // Initialize Socket.IO server
    global.socketio = new SocketIOServer(httpServer, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    // Socket connection handler
    global.socketio.on("connection", async (socket) => {
      console.log("Client connected:", socket.id);

      // Get user session (you might need to implement custom session handling)
      const userId = socket.handshake.query.userId as string;

      if (!userId) {
        console.log("No user ID provided, disconnecting socket");
        socket.disconnect();
        return;
      }

      // Store connection
      activeConnections.set(socket.id, {
        userId,
        socketId: socket.id,
        connectedAt: new Date(),
      });

      // Initialize user rooms set
      if (!userRooms.has(userId)) {
        userRooms.set(userId, new Set());
      }

      // Handle room joining
      socket.on("room:join", (roomId: string) => {
        if (!roomId) return;

        console.log(`User ${userId} joining room ${roomId}`);
        socket.join(roomId);

        // Add room to user's room set
        const rooms = userRooms.get(userId) || new Set();
        rooms.add(roomId);
        userRooms.set(userId, rooms);

        // Emit updated room list to user
        socket.emit("rooms:joined", Array.from(rooms));

        // Notify others in the room
        socket.to(roomId).emit("user:joined", {
          userId,
          roomId,
          timestamp: new Date(),
        });
      });

      // Handle room leaving
      socket.on("room:leave", (roomId: string) => {
        if (!roomId) return;

        console.log(`User ${userId} leaving room ${roomId}`);
        socket.leave(roomId);

        // Remove room from user's room set
        const rooms = userRooms.get(userId) || new Set();
        rooms.delete(roomId);
        userRooms.set(userId, rooms);

        // Emit updated room list to user
        socket.emit("rooms:joined", Array.from(rooms));

        // Notify others in the room
        socket.to(roomId).emit("user:left", {
          userId,
          roomId,
          timestamp: new Date(),
        });
      });

      // Handle message sending
      socket.on("message:send", (payload: any) => {
        const { roomId, message } = payload;
        if (!roomId || !message) return;

        console.log(`Message sent to room ${roomId}:`, message.id);

        // Broadcast message to all users in the room except sender
        socket.to(roomId).emit("message:received", {
          roomId,
          message,
          timestamp: new Date(),
        });
      });

      // Handle typing indicators
      socket.on("typing:start", (payload: any) => {
        const { roomId, userId: typingUserId, userName } = payload;
        if (!roomId || !typingUserId) return;

        socket.to(roomId).emit("typing:started", {
          roomId,
          userId: typingUserId,
          userName,
          timestamp: new Date(),
        });
      });

      socket.on("typing:stop", (payload: any) => {
        const { roomId, userId: typingUserId, userName } = payload;
        if (!roomId || !typingUserId) return;

        socket.to(roomId).emit("typing:stopped", {
          roomId,
          userId: typingUserId,
          userName,
          timestamp: new Date(),
        });
      });

      // Handle message read receipts
      socket.on("message:read", (payload: any) => {
        const { roomId, messageId, userId: readerId } = payload;
        if (!roomId || !messageId || !readerId) return;

        console.log(
          `Message ${messageId} read by ${readerId} in room ${roomId}`
        );

        // Broadcast read receipt to all users in the room
        socket.to(roomId).emit("message:read", {
          roomId,
          messageId,
          userId: readerId,
          timestamp: new Date(),
        });
      });

      // Handle reactions
      socket.on("message:reaction", (payload: any) => {
        const { roomId, messageId, userId: reactorId, type, emoji } = payload;
        if (!roomId || !messageId || !reactorId) return;

        console.log(
          `Reaction ${type} added to message ${messageId} by ${reactorId}`
        );

        // Broadcast reaction to all users in the room
        socket.to(roomId).emit("reaction:added", {
          roomId,
          messageId,
          userId: reactorId,
          type,
          emoji,
          timestamp: new Date(),
        });
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);

        // Get user's rooms before cleanup
        const rooms = userRooms.get(userId) || new Set();

        // Notify all rooms that user left
        rooms.forEach((roomId) => {
          socket.to(roomId).emit("user:disconnected", {
            userId,
            roomId,
            timestamp: new Date(),
          });
        });

        // Cleanup
        activeConnections.delete(socket.id);
        userRooms.delete(userId);
      });

      // Handle errors
      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });

      // Send initial connection confirmation
      socket.emit("connected", {
        socketId: socket.id,
        userId,
        timestamp: new Date(),
      });
    });

    console.log("Socket.IO server initialized");
  }

  return new Response("Socket.IO server is running", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

// Handle other HTTP methods
export async function POST(req: NextRequest) {
  return GET(req);
}

// Optional: Add health check endpoint
export async function HEAD() {
  return new Response(null, { status: 200 });
}
