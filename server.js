const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

// For Node.js versions that don't have fetch built-in
if (!global.fetch) {
  try {
    global.fetch = require("node-fetch");
  } catch (e) {
    console.log("⚠️ node-fetch not available, using built-in fetch");
  }
}

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
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

  // Initialize Socket.IO with online users tracking and large file support
  const io = new Server(server, {
    path: "/api/socket/io",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    // Increase limits for file uploads
    maxHttpBufferSize: 100 * 1024 * 1024, // 100MB (same as frontend limit)
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    upgradeTimeout: 30000, // 30 seconds
    // Allow larger payloads
    perMessageDeflate: {
      threshold: 1024,
      concurrencyLimit: 10,
      memLevel: 7,
    },
  });

  // Online users tracking
  const onlineUsers = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      console.log("🔐 [SOCKET] Authenticating socket connection...");
      console.log("🔐 [SOCKET] Auth data:", socket.handshake.auth);

      const userId = socket.handshake.auth.userId;
      if (!userId) {
        console.error("❌ [SOCKET] No userId provided in auth");
        throw new Error("No userId provided");
      }

      console.log(`🔍 [SOCKET] Looking up user: ${userId}`);

      // Fetch user data from database
      try {
        const mongoose = require("mongoose");

        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState !== 1) {
          await mongoose.connect(process.env.MONGODB_URI);
        }

        // Define User schema if not already defined
        let User;
        try {
          User = mongoose.model("User");
        } catch (error) {
          const userSchema = new mongoose.Schema({
            name: String,
            email: String,
            avatar: String,
          });
          User = mongoose.model("User", userSchema);
        }

        const user = await User.findById(userId).select("name email avatar");

        if (!user) {
          console.error(`❌ [SOCKET] User not found: ${userId}`);
          throw new Error("User not found");
        }

        console.log(
          `✅ [SOCKET] User authenticated: ${user.name} (${user._id})`
        );

        socket.data = {
          userId: user._id.toString(),
          userName: user.name,
          userAvatar: user.avatar,
          rooms: new Set(),
          keyPairs: new Map(),
        };
      } catch (dbError) {
        console.error("❌ [SOCKET] Database error:", dbError);
        // Fallback to basic user data
        socket.data = {
          userId: userId,
          userName: `User-${userId}`,
          userAvatar: null,
          rooms: new Set(),
          keyPairs: new Map(),
        };
      }

      next();
    } catch (error) {
      console.error("❌ [SOCKET] Authentication failed:", error);
      next(new Error("Authentication failed"));
    }
  });

  // Socket.IO connection handling
  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    const userName = socket.data.userName;

    console.log(`🔌 [SOCKET] User ${userName} (${userId}) connected`);

    // Fetch user's rooms from database
    let userRooms = [];
    try {
      const mongoose = require("mongoose");

      // Use existing ChatRoom model (don't redefine it)
      let ChatRoom;
      try {
        ChatRoom = mongoose.model("ChatRoom");
      } catch (error) {
        // If model doesn't exist, skip room fetching for now
        console.log(
          "⚠️ [SOCKET] ChatRoom model not available, skipping room auto-join"
        );
        ChatRoom = null;
      }

      if (ChatRoom) {
        const rooms = await ChatRoom.find({
          "members.user": userId,
        }).select("_id name");

        userRooms = rooms.map((room) => room._id.toString());
        console.log(
          `📋 [SOCKET] User ${userName} is member of ${userRooms.length} rooms`
        );

        // Join user to all their rooms
        userRooms.forEach((roomId) => {
          socket.join(roomId);
          console.log(
            `🏠 [SOCKET] Auto-joined user ${userName} to room: ${roomId}`
          );
        });
      }
    } catch (dbError) {
      console.error("❌ [SOCKET] Error fetching user rooms:", dbError);
    }

    // Add user to online users
    const onlineUser = {
      userId: userId,
      userName: userName,
      avatar: socket.data.userAvatar,
      lastSeen: new Date(),
      rooms: userRooms,
    };

    onlineUsers.set(userId, onlineUser);
    console.log(`🟢 [SOCKET] User ${userName} is now online`);
    console.log(`👥 [SOCKET] Total online users: ${onlineUsers.size}`);

    // Send current online users list to the newly connected user
    const allOnlineUsers = Array.from(onlineUsers.values());
    socket.emit("users:online", allOnlineUsers);
    console.log(
      `📋 [SOCKET] Sent ${allOnlineUsers.length} online users to ${userName}`
    );

    // Broadcast to all users that this user came online
    socket.broadcast.emit("user:online", onlineUser);

    // Handle room joining
    socket.on("room:join", (roomId) => {
      socket.join(roomId);
      console.log(`🚪 [SOCKET] User ${userName} joined room: ${roomId}`);

      // Update user's rooms
      if (onlineUsers.has(userId)) {
        const user = onlineUsers.get(userId);
        if (!user.rooms.includes(roomId)) {
          user.rooms.push(roomId);
        }
      }

      socket.to(roomId).emit("user:joined", { userId, roomId });
    });

    // Handle room leaving
    socket.on("room:leave", (roomId) => {
      socket.leave(roomId);
      console.log(`🚪 [SOCKET] User ${userName} left room: ${roomId}`);

      // Update user's rooms
      if (onlineUsers.has(userId)) {
        const user = onlineUsers.get(userId);
        user.rooms = user.rooms.filter((r) => r !== roomId);
      }

      socket.to(roomId).emit("user:left", { userId, roomId });
    });

    // Handle message sending
    socket.on("message:send", async (data) => {
      console.log(
        `📤 [SOCKET] User ${userName} sending message to room ${data.roomId}`
      );

      try {
        // Use the Next.js API route to save the message
        const http = require("http");
        const postData = JSON.stringify(data);

        const options = {
          hostname: "localhost",
          port: port,
          path: "/api/chat/rooms/messages",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
            "x-user-id": userId,
          },
        };

        const req = http.request(options, (res) => {
          let responseData = "";

          res.on("data", (chunk) => {
            responseData += chunk;
          });

          res.on("end", () => {
            try {
              if (res.statusCode === 201) {
                const result = JSON.parse(responseData);
                const savedMessage = result.data;

                console.log(
                  `✅ [SOCKET] Message saved with ID: ${savedMessage._id}`
                );
                console.log(
                  `📡 [SOCKET] Broadcasting message to room: ${data.roomId}`
                );

                // Broadcast to ALL room members (including sender for confirmation)
                io.to(data.roomId).emit("message:new", savedMessage);

                console.log(
                  `📨 [SOCKET] Message broadcasted to room ${data.roomId} members`
                );
              } else {
                console.error(
                  `❌ [SOCKET] Failed to save message:`,
                  res.statusCode,
                  responseData
                );
                socket.emit("error", { message: "Failed to save message" });
              }
            } catch (parseError) {
              console.error(`❌ [SOCKET] Error parsing response:`, parseError);
              socket.emit("error", { message: "Failed to save message" });
            }
          });
        });

        req.on("error", (error) => {
          console.error(`❌ [SOCKET] HTTP request error:`, error);
          socket.emit("error", { message: "Failed to save message" });
        });

        req.write(postData);
        req.end();
      } catch (error) {
        console.error(`❌ [SOCKET] Error saving message:`, error);
        socket.emit("error", {
          message: "Failed to save message: " + error.message,
        });
      }
    });

    // Handle typing indicators
    socket.on("typing:start", (data) => {
      socket.to(data.roomId).emit("typing:start", {
        userId: data.userId,
        roomId: data.roomId,
      });
    });

    socket.on("typing:stop", (data) => {
      socket.to(data.roomId).emit("typing:stop", {
        userId: data.userId,
        roomId: data.roomId,
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(
        `🔴 [SOCKET] User ${userName} (${userId}) disconnected: ${reason}`
      );

      // Remove from online users
      onlineUsers.delete(userId);
      console.log(
        `👥 [SOCKET] Total online users after disconnect: ${onlineUsers.size}`
      );

      // Notify all users that this user went offline
      socket.broadcast.emit("user:offline", userId);
      console.log(`📡 [SOCKET] Broadcasted offline status for user: ${userId}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`🔌 [SOCKET] Socket error for user ${userName}:`, error);
    });

    // Send connection confirmation
    socket.emit("connected", {
      message: "Connected to chat server",
      userId,
      userName,
      socketId: socket.id,
    });
  });

  server
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      console.log(`🔌 Socket.IO server ready on path: /api/socket/io`);
    });
});
