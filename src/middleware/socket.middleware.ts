import { Socket } from "socket.io";
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
    // Get userId directly from auth (sent by frontend)
    const userId = socket.handshake.auth.userId;

    if (!userId) {
      return next(new Error("User ID required for authentication"));
    }

    // Validate user exists in database
    const user = await User.findById(userId).select("name email avatar");

    if (!user) {
      return next(new Error("User not found"));
    }

    (socket as AuthenticatedSocket).userId = user._id.toString();
    (socket as AuthenticatedSocket).userName = user.name;
    (socket as AuthenticatedSocket).userAvatar = user.avatar;

    next();
  } catch (error) {
    next(new Error("Invalid user authentication"));
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
