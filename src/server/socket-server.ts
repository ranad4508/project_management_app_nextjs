import { SocketService } from "@/src/services/socket.service";
import Database from "@/src/config/database";

export class SocketServer {
  private socketService: SocketService;

  constructor(server: any) {
    this.socketService = new SocketService(server);
  }

  async initialize() {
    // Connect to database
    await Database.connect();

    console.log("🚀 Socket.IO server initialized");
  }

  getSocketService() {
    return this.socketService;
  }
}

// Usage in your main server file
export const initializeSocketServer = (server: any) => {
  const socketServer = new SocketServer(server);
  socketServer.initialize();
  return socketServer;
};
