import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { ChatService } from "./chat.service";
import { EncryptionService } from "./encryption.service";
import { User } from "@/src/models/user";
import { ChatRoom } from "@/src/models/chat-room";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  TypingIndicator,
  OnlineUser,
  KeyExchange,
} from "@/src/types/chat.types";

interface SocketData {
  userId: string;
  userName: string;
  userAvatar?: string;
  rooms: Set<string>;
  keyPairs: Map<string, any>; // roomId -> keyPair
}

export class SocketService {
  private io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
  >;
  private chatService: ChatService;
  private onlineUsers: Map<string, OnlineUser> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.chatService = new ChatService();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error("No token provided");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.userId).select(
          "name email avatar"
        );

        if (!user) {
          throw new Error("User not found");
        }

        socket.data.userId = user._id.toString();
        socket.data.userName = user.name;
        socket.data.userAvatar = user.avatar;
        socket.data.rooms = new Set();
        socket.data.keyPairs = new Map();

        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User ${socket.data.userName} connected`);

      // Add user to online users
      this.addOnlineUser(socket);

      // Join user's rooms
      this.joinUserRooms(socket);

      // Message events
      socket.on("message:send", async (data) => {
        try {
          const message = await this.chatService.sendMessage(
            socket.data.userId,
            data
          );

          // Broadcast to room members
          socket.to(data.roomId).emit("message:new", message);
          socket.emit("message:new", message);

          // Stop typing indicator
          this.handleTypingStop(socket, data.roomId);
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("message:edit", async (messageId, content) => {
        try {
          // Implement message editing logic
          // const updatedMessage = await this.chatService.editMessage(messageId, socket.data.userId, content);
          // socket.to(updatedMessage.room).emit("message:updated", updatedMessage);
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("message:delete", async (messageId) => {
        try {
          // Implement message deletion logic
          // await this.chatService.deleteMessage(messageId, socket.data.userId);
          // socket.to(roomId).emit("message:deleted", messageId);
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      // Reaction events
      socket.on("reaction:add", async (messageId, type) => {
        try {
          const message = await this.chatService.addReaction(
            messageId,
            socket.data.userId,
            type
          );
          const reaction = message.reactions[message.reactions.length - 1];

          socket
            .to(message.room.toString())
            .emit("reaction:added", messageId, reaction);
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("reaction:remove", async (messageId, reactionId) => {
        try {
          const message = await this.chatService.removeReaction(
            messageId,
            socket.data.userId,
            reactionId
          );

          socket
            .to(message.room.toString())
            .emit("reaction:removed", messageId, reactionId);
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      // Typing events
      socket.on("typing:start", (roomId) => {
        this.handleTypingStart(socket, roomId);
      });

      socket.on("typing:stop", (roomId) => {
        this.handleTypingStop(socket, roomId);
      });

      // Room events
      socket.on("room:join", async (roomId) => {
        try {
          await this.joinRoom(socket, roomId);
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("room:leave", (roomId) => {
        this.leaveRoom(socket, roomId);
      });

      // Key exchange events
      socket.on("key:exchange", (data) => {
        this.handleKeyExchange(socket, data);
      });

      socket.on("key:request", (roomId) => {
        this.handleKeyRequest(socket, roomId);
      });

      // Disconnect event
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async addOnlineUser(socket: any) {
    const userRooms = await this.getUserRooms(socket.data.userId);

    const onlineUser: OnlineUser = {
      userId: socket.data.userId,
      userName: socket.data.userName,
      avatar: socket.data.userAvatar,
      lastSeen: new Date(),
      rooms: userRooms,
    };

    this.onlineUsers.set(socket.data.userId, onlineUser);

    // Notify rooms about user coming online
    userRooms.forEach((roomId) => {
      socket.to(roomId).emit("user:online", onlineUser);
    });
  }

  private async joinUserRooms(socket: any) {
    try {
      const rooms = await this.chatService.getUserRooms(socket.data.userId);

      for (const room of rooms) {
        socket.join(room._id.toString());
        socket.data.rooms.add(room._id.toString());

        // Generate key pair for encrypted rooms
        if (room.isEncrypted) {
          const keyPair = EncryptionService.generateDHKeyPair();
          socket.data.keyPairs.set(room._id.toString(), keyPair);
        }
      }
    } catch (error) {
      console.error("Error joining user rooms:", error);
    }
  }

  private async joinRoom(socket: any, roomId: string) {
    // Verify room access
    const room = await this.chatService.getRoomById(roomId, socket.data.userId);

    socket.join(roomId);
    socket.data.rooms.add(roomId);

    // Generate key pair for encrypted room
    if (room.isEncrypted) {
      const keyPair = EncryptionService.generateDHKeyPair();
      socket.data.keyPairs.set(roomId, keyPair);

      // Initiate key exchange with other room members
      socket.to(roomId).emit("key:exchange", {
        userId: socket.data.userId,
        publicKey: keyPair.publicKey,
        timestamp: new Date(),
      });
    }

    // Notify room about user joining
    socket.to(roomId).emit("room:joined", roomId, {
      _id: socket.data.userId,
      name: socket.data.userName,
      avatar: socket.data.userAvatar,
    });

    // Update last read timestamp
    await this.chatService.updateLastRead(roomId, socket.data.userId);
  }

  private leaveRoom(socket: any, roomId: string) {
    socket.leave(roomId);
    socket.data.rooms.delete(roomId);
    socket.data.keyPairs.delete(roomId);

    // Remove from typing users
    this.removeFromTyping(roomId, socket.data.userId);

    // Notify room about user leaving
    socket.to(roomId).emit("room:left", roomId, socket.data.userId);
  }

  private handleTypingStart(socket: any, roomId: string) {
    if (!socket.data.rooms.has(roomId)) return;

    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Set());
    }

    const roomTypingUsers = this.typingUsers.get(roomId)!;
    if (!roomTypingUsers.has(socket.data.userId)) {
      roomTypingUsers.add(socket.data.userId);

      const typingData: TypingIndicator = {
        userId: socket.data.userId,
        userName: socket.data.userName,
        roomId,
        timestamp: new Date(),
      };

      socket.to(roomId).emit("typing:start", typingData);

      // Auto-stop typing after 3 seconds
      setTimeout(() => {
        this.handleTypingStop(socket, roomId);
      }, 3000);
    }
  }

  private handleTypingStop(socket: any, roomId: string) {
    this.removeFromTyping(roomId, socket.data.userId);

    const typingData: TypingIndicator = {
      userId: socket.data.userId,
      userName: socket.data.userName,
      roomId,
      timestamp: new Date(),
    };

    socket.to(roomId).emit("typing:stop", typingData);
  }

  private removeFromTyping(roomId: string, userId: string) {
    const roomTypingUsers = this.typingUsers.get(roomId);
    if (roomTypingUsers) {
      roomTypingUsers.delete(userId);
      if (roomTypingUsers.size === 0) {
        this.typingUsers.delete(roomId);
      }
    }
  }

  private handleKeyExchange(socket: any, data: KeyExchange) {
    // Store the public key and broadcast to room members
    socket.to(data.userId).emit("key:exchange", {
      userId: socket.data.userId,
      publicKey: data.publicKey,
      timestamp: new Date(),
    });
  }

  private handleKeyRequest(socket: any, roomId: string) {
    if (!socket.data.rooms.has(roomId)) return;

    const keyPair = socket.data.keyPairs.get(roomId);
    if (keyPair) {
      socket.to(roomId).emit("key:exchange", {
        userId: socket.data.userId,
        publicKey: keyPair.publicKey,
        timestamp: new Date(),
      });
    }
  }

  private handleDisconnect(socket: any) {
    console.log(`User ${socket.data.userName} disconnected`);

    // Remove from online users
    this.onlineUsers.delete(socket.data.userId);

    // Remove from all typing indicators
    socket.data.rooms.forEach((roomId: any) => {
      this.removeFromTyping(roomId, socket.data.userId);
    });

    // Notify rooms about user going offline
    socket.data.rooms.forEach((roomId: any) => {
      socket.to(roomId).emit("user:offline", socket.data.userId);
    });
  }

  private async getUserRooms(userId: string): Promise<string[]> {
    const rooms = await ChatRoom.find({
      "members.user": userId,
    }).select("_id");

    return rooms.map((room) => room._id.toString());
  }

  // Public method to get Socket.IO instance
  getIO() {
    return this.io;
  }
}
