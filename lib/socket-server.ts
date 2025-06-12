import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { SocketService } from "@/src/services/socket.service";

let io: SocketIOServer | undefined;
let socketService: SocketService | undefined;

export function getSocketIO() {
  if (!io) {
    const httpServer = createServer();

    io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    socketService = new SocketService(httpServer);

    console.log("Socket.IO server initialized");
  }

  return { io, socketService };
}

export { io, socketService };
