const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

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

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join room
    socket.on("room:join", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Leave room
    socket.on("room:leave", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);
    });

    // Handle messages
    socket.on("message:send", (data) => {
      console.log("Message received:", data);
      // Broadcast to room members
      socket.to(data.roomId).emit("message:new", {
        ...data,
        _id: Date.now().toString(),
        sender: {
          _id: socket.userId || "anonymous",
          name: socket.userName || "Anonymous",
          avatar: socket.userAvatar,
        },
        createdAt: new Date(),
        reactions: [],
      });
    });

    // Handle reactions
    socket.on("reaction:add", (messageId, type) => {
      socket.broadcast.emit("reaction:added", messageId, {
        _id: Date.now().toString(),
        user: {
          _id: socket.userId,
          name: socket.userName,
          avatar: socket.userAvatar,
        },
        type,
        createdAt: new Date(),
      });
    });

    // Handle typing
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

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  server
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log("> Socket.IO server running");
    });
});
