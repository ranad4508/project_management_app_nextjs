import type { Server as HttpServer } from "http";
import { Server as SocketServer, type Socket } from "socket.io";
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // adjust path as needed
import { ChatRoom } from "@/src/models/chat-room";

import type {
  SendMessageData,
  TypingIndicator,
  MessageReaction,
} from "@/src/types/chat.types";

export class SocketService {
  private io: SocketServer | null = null;

  initialize(server: HttpServer): void {
    this.io = new SocketServer(server, {
      path: "/api/socket/io",
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    // Middleware for authentication
    this.io.use(async (socket: Socket, next) => {
      try {
        const session = await unstable_getServerSession(
          socket.request as any,
          {} as any,
          authOptions
        );

        if (!session || !session.user) {
          return next(new Error("Unauthorized"));
        }

        socket.data.user = session.user;
        next();
      } catch (error) {
        console.error("Socket auth error:", error);
        next(new Error("Authentication error"));
      }
    });

    this.io.on("connection", (socket: Socket) => {
      console.log(`User connected: ${socket.data.user.id}`);

      this.joinUserRooms(socket);

      this.handleChatEvents(socket);

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.data.user.id}`);
      });
    });
  }

  private async joinUserRooms(socket: Socket): Promise<void> {
    try {
      const userId = socket.data.user.id;
      const rooms = await ChatRoom.find({ participants: userId });

      rooms.forEach((room) => {
        const roomName = `room:${room._id.toString()}`;
        socket.join(roomName);
        // Emit 'room:joined' for each room joined with user info
        socket.emit("room:joined", room._id.toString(), socket.data.user);
      });

      // Join personal user room for direct messages or notifications
      socket.join(`user:${userId}`);
    } catch (error) {
      console.error("Error joining rooms:", error);
    }
  }

  private handleChatEvents(socket: Socket): void {
    // Send message event uses SendMessageData type
    socket.on("message:send", (payload: SendMessageData) => {
      socket.to(`room:${payload.roomId}`).emit("message:new", payload);
    });

    // Typing started event
    socket.on("typing:start", (payload: TypingIndicator) => {
      socket.to(`room:${payload.roomId}`).emit("typing:start", payload);
    });

    // Typing stopped event
    socket.on("typing:stop", (payload: TypingIndicator) => {
      socket.to(`room:${payload.roomId}`).emit("typing:stop", payload);
    });

    // Message read event
    socket.on(
      "message:read",
      (payload: { roomId: string; messageId: string; userId: string }) => {
        socket.to(`room:${payload.roomId}`).emit("message:read", payload);
      }
    );

    // Reaction add
    socket.on("reaction:add", (payload: MessageReaction) => {
      socket.to(`room:${payload.roomId}`).emit("reaction:added", payload);
    });

    // Reaction remove
    socket.on("reaction:remove", (payload: MessageReaction) => {
      socket.to(`room:${payload.roomId}`).emit("reaction:removed", payload);
    });

    // Join room event — also emit room:joined with user data back to the user
    socket.on("room:join", (roomId: string) => {
      const roomName = `room:${roomId}`;
      socket.join(roomName);
      socket.emit("room:joined", roomId, socket.data.user);
    });

    // Leave room event — emit room:left to the user
    socket.on("room:leave", (roomId: string) => {
      const roomName = `room:${roomId}`;
      socket.leave(roomName);
      socket.emit("room:left", roomId, socket.data.user.id);
    });
  }

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

export const socketService = new SocketService();
