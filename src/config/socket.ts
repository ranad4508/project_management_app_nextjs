import type { Server as HttpServer } from "http";
import { Server as SocketServer, type Socket } from "socket.io";
import { getSession } from "next-auth/react";
import { ChatRoom } from "@/src/models/chat";
import type {
  SocketMessagePayload,
  SocketTypingPayload,
  SocketReactionPayload,
} from "@/src/types/chat.types";

export class SocketService {
  private io: SocketServer | null = null;

  initialize(server: HttpServer): void {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.io.use(async (socket: Socket, next) => {
      try {
        const session = await getSession({ req: socket.request as any });

        if (!session || !session.user) {
          return next(new Error("Unauthorized"));
        }

        socket.data.user = session.user;
        next();
      } catch (error) {
        next(new Error("Authentication error"));
      }
    });

    this.io.on("connection", (socket: Socket) => {
      console.log(`User connected: ${socket.data.user.id}`);

      // Join user to their rooms
      this.joinUserRooms(socket);

      // Handle chat events
      this.handleChatEvents(socket);

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.data.user.id}`);
      });
    });
  }

  private async joinUserRooms(socket: Socket): Promise<void> {
    try {
      const userId = socket.data.user.id;

      // Find all chat rooms where user is a participant
      const rooms = await ChatRoom.find({ participants: userId });

      // Join each room
      rooms.forEach((room) => {
        socket.join(`room:${room._id.toString()}`);
      });

      // Also join user's personal channel for notifications
      socket.join(`user:${userId}`);

      socket.emit(
        "rooms:joined",
        rooms.map((room) => room._id.toString())
      );
    } catch (error) {
      console.error("Error joining rooms:", error);
    }
  }

  private handleChatEvents(socket: Socket): void {
    // New message event
    socket.on("message:send", (payload: SocketMessagePayload) => {
      // Broadcast to all users in the room except sender
      socket.to(`room:${payload.roomId}`).emit("message:received", payload);
    });

    // Typing indicator
    socket.on("typing:start", (payload: SocketTypingPayload) => {
      socket.to(`room:${payload.roomId}`).emit("typing:update", payload);
    });

    // Typing stopped
    socket.on("typing:stop", (payload: SocketTypingPayload) => {
      socket.to(`room:${payload.roomId}`).emit("typing:update", {
        ...payload,
        isTyping: false,
      });
    });

    // Message read
    socket.on(
      "message:read",
      (payload: { roomId: string; messageId: string; userId: string }) => {
        socket.to(`room:${payload.roomId}`).emit("message:read", payload);
      }
    );

    // Message reaction
    socket.on("message:reaction", (payload: SocketReactionPayload) => {
      socket.to(`room:${payload.roomId}`).emit("message:reaction", payload);
    });

    // Join room (when added to a new room)
    socket.on("room:join", (roomId: string) => {
      socket.join(`room:${roomId}`);
    });

    // Leave room
    socket.on("room:leave", (roomId: string) => {
      socket.leave(`room:${roomId}`);
    });
  }

  // Method to emit events from server
  emitToRoom(roomId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`room:${roomId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }
}

// Create singleton instance
export const socketService = new SocketService();
