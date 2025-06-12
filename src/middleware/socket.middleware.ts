import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "@/src/models/user";
import { ChatRoom } from "@/src/models/chat-room";

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userName: string;
  userAvatar?: string;
}

export const authenticateSocket = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.userId).select(
      "name email avatar"
    );

    if (!user) {
      return next(new Error("User not found"));
    }

    (socket as AuthenticatedSocket).userId = user._id.toString();
    (socket as AuthenticatedSocket).userName = user.name;
    (socket as AuthenticatedSocket).userAvatar = user.avatar;

    next();
  } catch (error) {
    next(new Error("Invalid authentication token"));
  }
};

export const authorizeRoom = async (
  socket: AuthenticatedSocket,
  roomId: string,
  next: (err?: Error) => void
) => {
  try {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return next(new Error("Room not found"));
    }

    if (!room.isMember(socket.userId)) {
      return next(new Error("Access denied to this room"));
    }

    next();
  } catch (error) {
    next(new Error("Room authorization failed"));
  }
};
