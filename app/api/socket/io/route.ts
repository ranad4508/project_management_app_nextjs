import { NextRequest } from "next/server";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import { SocketService } from "@/src/services/socket.service";

let io: SocketIOServer | null = null;
let httpServer: any = null;

export async function GET(req: NextRequest) {
  if (!io) {
    console.log("🚀 Initializing Socket.IO server...");

    // Create HTTP server for Socket.IO
    httpServer = createServer();

    // Initialize Socket.IO server
    io = new SocketIOServer(httpServer, {
      path: "/api/socket/io",
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
    });

    // Initialize socket service with proper event handling
    const socketService = new SocketService(httpServer);

    console.log("✅ Socket.IO server initialized successfully");
  }

  return new Response("Socket.IO server is running", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
