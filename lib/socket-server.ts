import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { SocketService } from "@/src/services/socket.service";
import { NotificationService } from "@/src/services/notification.service";

let io: SocketIOServer | undefined;
let socketService: SocketService | undefined;
let notificationService: NotificationService | undefined;

export function getSocketIO() {
  if (!io) {
    const httpServer = createServer();

    io = new SocketIOServer(httpServer, {
      path: "/api/socket",
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    socketService = new SocketService(httpServer);
    notificationService = new NotificationService();

    // Set up notification event handlers
    setupNotificationHandlers(io);

    // Store io globally for access from other parts of the app
    (global as any).io = io;

    console.log("Socket.IO server initialized with notification support");
  }

  return { io, socketService };
}

function setupNotificationHandlers(io: SocketIOServer) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle user joining their personal room
    socket.on("join:user", (userId: string) => {
      console.log(`User ${userId} joined room: user:${userId}`);
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
      socket.emit("connected", { userId, socketId: socket.id });
    });

    // Handle notification events
    socket.on(
      "notification:mark_read",
      async (data: { notificationId: string }) => {
        try {
          const userId = socket.data.userId;
          if (!userId || !notificationService) return;

          await notificationService.markAsRead(data.notificationId, userId);

          io.to(`user:${userId}`).emit("notification:read", {
            notificationId: data.notificationId,
            userId,
          });
        } catch (error) {
          console.error("Error marking notification as read:", error);
          socket.emit("error", {
            message: "Failed to mark notification as read",
          });
        }
      }
    );

    socket.on("notification:mark_all_read", async () => {
      try {
        const userId = socket.data.userId;
        if (!userId || !notificationService) return;

        await notificationService.markAllAsRead(userId);

        io.to(`user:${userId}`).emit("notification:all_read", { userId });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        socket.emit("error", {
          message: "Failed to mark all notifications as read",
        });
      }
    });

    socket.on(
      "notification:delete",
      async (data: { notificationId: string }) => {
        try {
          const userId = socket.data.userId;
          if (!userId || !notificationService) return;

          await notificationService.deleteNotification(
            data.notificationId,
            userId
          );

          io.to(`user:${userId}`).emit("notification:deleted", {
            notificationId: data.notificationId,
            userId,
          });
        } catch (error) {
          console.error("Error deleting notification:", error);
          socket.emit("error", { message: "Failed to delete notification" });
        }
      }
    );

    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  // Add helper methods to io instance
  (io as any).emitNotification = (userId: string, notification: any) => {
    console.log(`Emitting notification to user ${userId}:`, notification);
    io.to(`user:${userId}`).emit("notification:new", notification);
  };

  (io as any).emitActivity = (userId: string, activity: any) => {
    console.log(`Emitting activity to user ${userId}:`, activity);
    io.to(`user:${userId}`).emit("activity:new", activity);
  };
}

export { io, socketService };
