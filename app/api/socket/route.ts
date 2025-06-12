import type { NextRequest } from "next/server";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { SocketService } from "@/src/services/socket.service";

let io: SocketIOServer | undefined;

export async function GET(req: NextRequest) {
  if (!io) {
    console.log("Initializing Socket.IO server...");

    // Create a mock HTTP server for Socket.IO
    const httpServer = new NetServer();

    io = new SocketIOServer(httpServer, {
      path: "/api/socket",
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Initialize socket service
    const socketService = new SocketService(httpServer);

    console.log("Socket.IO server initialized");
  }

  return new Response("Socket.IO server is running", { status: 200 });
}
