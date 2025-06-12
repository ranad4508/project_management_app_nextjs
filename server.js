const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO with proper CORS
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        console.log("❌ No token provided for socket connection");
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );

      // Store user info on socket
      socket.userId = decoded.userId || decoded.id;
      socket.userName = decoded.name || "Anonymous";
      socket.userAvatar = decoded.avatar;

      console.log(
        `✅ Socket authenticated for user: ${socket.userName} (${socket.userId})`
      );
      next();
    } catch (error) {
      console.log("❌ Socket authentication failed:", error.message);
      next(new Error("Invalid authentication token"));
    }
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.userName} (${socket.id})`);

    // Join room
    socket.on("room:join", (roomId) => {
      socket.join(roomId);
      console.log(`🚪 User ${socket.userName} joined room ${roomId}`);

      // Notify others in the room
      socket.to(roomId).emit("user:joined", {
        userId: socket.userId,
        userName: socket.userName,
        avatar: socket.userAvatar,
      });
    });

    // Leave room
    socket.on("room:leave", (roomId) => {
      socket.leave(roomId);
      console.log(`🚪 User ${socket.userName} left room ${roomId}`);

      // Notify others in the room
      socket.to(roomId).emit("user:left", {
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    // Handle messages
    socket.on("message:send", (data) => {
      console.log(`📨 Message from ${socket.userName}:`, data);

      // Create message object with proper structure
      const message = {
        _id: Date.now().toString(),
        room: data.roomId,
        sender: {
          _id: socket.userId,
          name: socket.userName,
          avatar: socket.userAvatar,
        },
        type: data.type || "text",
        content: data.content,
        attachments: data.attachments || [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Broadcast to room members (including sender)
      io.to(data.roomId).emit("message:new", message);
    });

    // Handle reactions
    socket.on("reaction:add", (messageId, type) => {
      console.log(
        `👍 Reaction from ${socket.userName}: ${type} on ${messageId}`
      );

      const reaction = {
        _id: Date.now().toString(),
        user: {
          _id: socket.userId,
          name: socket.userName,
          avatar: socket.userAvatar,
        },
        type,
        createdAt: new Date(),
      };

      // Broadcast to all connected clients
      socket.broadcast.emit("reaction:added", messageId, reaction);
    });

    socket.on("reaction:remove", (messageId, reactionId) => {
      console.log(`👎 Reaction removed by ${socket.userName}: ${reactionId}`);
      socket.broadcast.emit("reaction:removed", messageId, reactionId);
    });

    // Handle typing indicators
    socket.on("typing:start", (roomId) => {
      socket.to(roomId).emit("typing:start", {
        userId: socket.userId,
        userName: socket.userName,
        roomId,
        timestamp: new Date(),
      });
    });

    socket.on("typing:stop", (roomId) => {
      socket.to(roomId).emit("typing:stop", {
        userId: socket.userId,
        userName: socket.userName,
        roomId,
        timestamp: new Date(),
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`❌ Socket error from ${socket.userName}:`, error);
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${socket.userName} (${reason})`);
    });
  });

  server
    .once("error", (err) => {
      console.error("❌ Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      console.log(`🔌 Socket.IO server running`);
    });
});
