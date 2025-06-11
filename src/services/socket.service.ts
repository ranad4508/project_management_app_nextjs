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
      path: "/api/socketio",
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
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
      this.joinUserRooms(socket);
      this.handleChatEvents(socket);

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.data.user.id}`);
      });
    });
  }

  private async joinUserRooms(socket: Socket) {
    try {
      const userId = socket.data.user.id;
      const rooms = await ChatRoom.find({ "participants.user": userId });
      rooms.forEach((room) => {
        socket.join(`room:${room._id.toString()}`);
      });
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
    socket.on("message:send", (payload: SocketMessagePayload) => {
      if (!payload.roomId || !payload.message.content) {
        socket.emit("error", { message: "Invalid message payload" });
        return;
      }
      socket.to(`room:${payload.roomId}`).emit("message:received", payload);
    });

    socket.on("typing:start", (payload: SocketTypingPayload) => {
      socket.to(`room:${payload.roomId}`).emit("typing:update", payload);
    });

    socket.on("typing:stop", (payload: SocketTypingPayload) => {
      socket.to(`room:${payload.roomId}`).emit("typing:update", {
        ...payload,
        isTyping: false,
      });
    });

    socket.on(
      "message:read",
      (payload: { roomId: string; messageId: string; userId: string }) => {
        if (payload.roomId && payload.messageId) {
          socket.to(`room:${payload.roomId}`).emit("message:read", payload);
        }
      }
    );

    socket.on("message:reaction", (payload: any) => {
      if (payload.roomId && payload.messageId) {
        socket.to(`room:${payload.roomId}`).emit("message:reaction", payload);
      }
    });

    socket.on("room:join", async (roomId: string) => {
      try {
        const room = await ChatRoom.findOne({
          _id: roomId,
          "participants.user": socket.data.user.id,
        });
        if (!room) {
          socket.emit("error", { message: "Room not found or access denied" });
          return;
        }
        socket.join(`room:${roomId}`);
        socket.emit("room:joined", roomId);
      } catch (error) {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("room:leave", (roomId: string) => {
      socket.leave(`room:${roomId}`);
      socket.emit("room:left", roomId);
    });
  }

  emitToRoom(roomId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`room:${roomId}`).emit(event, data);
    }
  }

  emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  broadcastToAll(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
