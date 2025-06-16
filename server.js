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
const port = process.env.PORT || 3001;

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

  // Initialize Socket.IO
  const io = new Server(server, {
    path: "/api/socket/io",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  // Simple authentication - just check for userId
  io.use((socket, next) => {
    const { userId, workspaceId } = socket.handshake.auth;

    if (!userId) {
      console.log("❌ No userId provided for socket connection");
      return next(new Error("User ID required"));
    }

    console.log(`🔐 User connecting: ${userId} to workspace: ${workspaceId}`);
    socket.userId = userId;
    socket.workspaceId = workspaceId;
    next();
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    const { userId, workspaceId } = socket;
    console.log("🔌 User connected:", socket.id, "User ID:", userId);

    // Join user to their workspace room
    if (workspaceId) {
      socket.join(`workspace:${workspaceId}`);
      console.log(
        `👥 User ${userId} joined workspace room: workspace:${workspaceId}`
      );
    }

    // Handle room joining
    socket.on("room:join", (roomId) => {
      socket.join(`room:${roomId}`);
      console.log(`🚪 User ${userId} joined room: ${roomId}`);
      socket.to(`room:${roomId}`).emit("user:joined", { userId, roomId });
    });

    // Handle room leaving
    socket.on("room:leave", (roomId) => {
      socket.leave(`room:${roomId}`);
      console.log(`🚪 User ${userId} left room: ${roomId}`);
      socket.to(`room:${roomId}`).emit("user:left", { userId, roomId });
    });

    // Handle message sending
    socket.on("message:send", async (data) => {
      console.log("📤 Message sent:", data);

      try {
        // Use the Next.js API route to save the message
        // Create a simple HTTP request using Node.js built-in modules
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

                console.log("✅ Message saved to database:", savedMessage._id);

                // Broadcast the saved message to all room members (including sender)
                io.to(`room:${data.roomId}`).emit("message:new", savedMessage);
              } else {
                console.error(
                  "❌ Failed to save message:",
                  res.statusCode,
                  responseData
                );
                socket.emit("error", { message: "Failed to save message" });
              }
            } catch (parseError) {
              console.error("❌ Error parsing response:", parseError);
              socket.emit("error", { message: "Failed to save message" });
            }
          });
        });

        req.on("error", (error) => {
          console.error("❌ HTTP request error:", error);
          socket.emit("error", { message: "Failed to save message" });
        });

        req.write(postData);
        req.end();
      } catch (error) {
        console.error("❌ Error saving message:", error);
        socket.emit("error", {
          message: "Failed to save message: " + error.message,
        });
      }
    });

    // Handle reactions
    socket.on("reaction:add", (data) => {
      console.log("👍 Reaction added:", data);
      socket.to(`room:${data.roomId}`).emit("reaction:added", data);
    });

    socket.on("reaction:remove", (data) => {
      console.log("👎 Reaction removed:", data);
      socket.to(`room:${data.roomId}`).emit("reaction:removed", data);
    });

    // Handle typing indicators
    socket.on("typing:start", (data) => {
      socket.to(`room:${data.roomId}`).emit("typing:user_started", {
        userId: data.userId,
        roomId: data.roomId,
      });
    });

    socket.on("typing:stop", (data) => {
      socket.to(`room:${data.roomId}`).emit("typing:user_stopped", {
        userId: data.userId,
        roomId: data.roomId,
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User ${userId} disconnected:`, reason);
      // Notify all rooms that user left
      socket.rooms.forEach((room) => {
        if (room.startsWith("room:")) {
          socket
            .to(room)
            .emit("user:left", { userId, roomId: room.replace("room:", "") });
        }
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("🔌 Socket error:", error);
    });

    // Send connection confirmation
    socket.emit("connected", {
      message: "Connected to chat server",
      userId,
      workspaceId,
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
