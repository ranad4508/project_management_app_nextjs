import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ChatRoom,
  ChatMessage,
  TypingIndicator,
  OnlineUser,
  MessageReaction,
} from "@/src/types/chat.types";

interface ChatState {
  // Current state
  activeRoomId: string | null;
  rooms: ChatRoom[];
  messages: Record<string, ChatMessage[]>; // roomId -> messages
  onlineUsers: OnlineUser[];
  typingUsers: Record<string, TypingIndicator[]>; // roomId -> typing users

  // UI state
  isConnected: boolean;
  isSidebarOpen: boolean;
  selectedMessage: ChatMessage | null;
  replyToMessage: ChatMessage | null;

  // Encryption state
  keyPairs: Record<string, { publicKey: string; privateKey: string }>; // roomId -> keyPair
  sharedSecrets: Record<string, string>; // userId -> sharedSecret
}

const initialState: ChatState = {
  activeRoomId: null,
  rooms: [],
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  isConnected: false,
  isSidebarOpen: true,
  selectedMessage: null,
  replyToMessage: null,
  keyPairs: {},
  sharedSecrets: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    // Connection state
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    // Room management
    setActiveRoom: (state, action: PayloadAction<string | null>) => {
      state.activeRoomId = action.payload;
    },

    setRooms: (state, action: PayloadAction<ChatRoom[]>) => {
      state.rooms = action.payload;
    },

    addRoom: (state, action: PayloadAction<ChatRoom>) => {
      const existingIndex = state.rooms.findIndex(
        (room) => room._id === action.payload._id
      );
      if (existingIndex >= 0) {
        state.rooms[existingIndex] = action.payload;
      } else {
        state.rooms.push(action.payload);
      }
    },

    updateRoom: (state, action: PayloadAction<ChatRoom>) => {
      const index = state.rooms.findIndex(
        (room) => room._id === action.payload._id
      );
      if (index >= 0) {
        state.rooms[index] = action.payload;
      }
    },

    removeRoom: (state, action: PayloadAction<string>) => {
      state.rooms = state.rooms.filter((room) => room._id !== action.payload);
      delete state.messages[action.payload];
      delete state.typingUsers[action.payload];
      if (state.activeRoomId === action.payload) {
        state.activeRoomId = null;
      }
    },

    // Message management
    setMessages: (
      state,
      action: PayloadAction<{ roomId: string; messages: ChatMessage[] }>
    ) => {
      const { roomId, messages } = action.payload;
      state.messages[roomId] = messages;
    },

    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      const message = action.payload;
      const roomId = message.room.toString();

      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }

      // Check if message already exists (avoid duplicates)
      const existingIndex = state.messages[roomId].findIndex(
        (m) => m._id === message._id
      );
      if (existingIndex >= 0) {
        state.messages[roomId][existingIndex] = message;
      } else {
        state.messages[roomId].push(message);
      }

      // Update room's last message
      const roomIndex = state.rooms.findIndex((room) => room._id === roomId);
      if (roomIndex >= 0) {
        state.rooms[roomIndex].lastMessage = message;
        state.rooms[roomIndex].lastActivity = new Date(message.createdAt);
      }
    },

    updateMessage: (state, action: PayloadAction<ChatMessage>) => {
      const message = action.payload;
      const roomId = message.room.toString();

      if (state.messages[roomId]) {
        const index = state.messages[roomId].findIndex(
          (m) => m._id === message._id
        );
        if (index >= 0) {
          state.messages[roomId][index] = message;
        }
      }
    },

    removeMessage: (
      state,
      action: PayloadAction<{ roomId: string; messageId: string }>
    ) => {
      const { roomId, messageId } = action.payload;
      if (state.messages[roomId]) {
        state.messages[roomId] = state.messages[roomId].filter(
          (m) => m._id !== messageId
        );
      }
    },

    // Reactions
    addReaction: (
      state,
      action: PayloadAction<{ messageId: string; reaction: MessageReaction }>
    ) => {
      const { messageId, reaction } = action.payload;

      // Find message across all rooms
      for (const roomId in state.messages) {
        const messageIndex = state.messages[roomId].findIndex(
          (m) => m._id === messageId
        );
        if (messageIndex >= 0) {
          state.messages[roomId][messageIndex].reactions.push(reaction);
          break;
        }
      }
    },

    removeReaction: (
      state,
      action: PayloadAction<{ messageId: string; reactionId: string }>
    ) => {
      const { messageId, reactionId } = action.payload;

      // Find message across all rooms
      for (const roomId in state.messages) {
        const messageIndex = state.messages[roomId].findIndex(
          (m) => m._id === messageId
        );
        if (messageIndex >= 0) {
          state.messages[roomId][messageIndex].reactions = state.messages[
            roomId
          ][messageIndex].reactions.filter((r) => r._id !== reactionId);
          break;
        }
      }
    },

    // Online users
    setOnlineUsers: (state, action: PayloadAction<OnlineUser[]>) => {
      state.onlineUsers = action.payload;
    },

    addOnlineUser: (state, action: PayloadAction<OnlineUser>) => {
      const existingIndex = state.onlineUsers.findIndex(
        (user) => user.userId === action.payload.userId
      );
      if (existingIndex >= 0) {
        state.onlineUsers[existingIndex] = action.payload;
      } else {
        state.onlineUsers.push(action.payload);
      }
    },

    removeOnlineUser: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter(
        (user) => user.userId !== action.payload
      );
    },

    // Typing indicators
    setTypingUsers: (
      state,
      action: PayloadAction<{ roomId: string; users: TypingIndicator[] }>
    ) => {
      const { roomId, users } = action.payload;
      state.typingUsers[roomId] = users;
    },

    addTypingUser: (state, action: PayloadAction<TypingIndicator>) => {
      const { roomId } = action.payload;
      if (!state.typingUsers[roomId]) {
        state.typingUsers[roomId] = [];
      }

      const existingIndex = state.typingUsers[roomId].findIndex(
        (user) => user.userId === action.payload.userId
      );

      if (existingIndex >= 0) {
        state.typingUsers[roomId][existingIndex] = action.payload;
      } else {
        state.typingUsers[roomId].push(action.payload);
      }
    },

    removeTypingUser: (
      state,
      action: PayloadAction<{ roomId: string; userId: string }>
    ) => {
      const { roomId, userId } = action.payload;
      if (state.typingUsers[roomId]) {
        state.typingUsers[roomId] = state.typingUsers[roomId].filter(
          (user) => user.userId !== userId
        );
      }
    },

    // UI state
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },

    setSelectedMessage: (state, action: PayloadAction<ChatMessage | null>) => {
      state.selectedMessage = action.payload;
    },

    setReplyToMessage: (state, action: PayloadAction<ChatMessage | null>) => {
      state.replyToMessage = action.payload;
    },

    // Encryption
    setKeyPair: (
      state,
      action: PayloadAction<{
        roomId: string;
        keyPair: { publicKey: string; privateKey: string };
      }>
    ) => {
      const { roomId, keyPair } = action.payload;
      state.keyPairs[roomId] = keyPair;
    },

    setSharedSecret: (
      state,
      action: PayloadAction<{ userId: string; sharedSecret: string }>
    ) => {
      const { userId, sharedSecret } = action.payload;
      state.sharedSecrets[userId] = sharedSecret;
    },

    // Clear state
    clearChatState: (state) => {
      return initialState;
    },
  },
});

export const {
  setConnected,
  setActiveRoom,
  setRooms,
  addRoom,
  updateRoom,
  removeRoom,
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  addReaction,
  removeReaction,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
  setSidebarOpen,
  setSelectedMessage,
  setReplyToMessage,
  setKeyPair,
  setSharedSecret,
  clearChatState,
} = chatSlice.actions;

export default chatSlice.reducer;

// Selectors
export const selectActiveRoom = (state: { chat: ChatState }) =>
  state.chat.rooms.find((room) => room._id === state.chat.activeRoomId);

export const selectRoomMessages =
  (roomId: string) => (state: { chat: ChatState }) =>
    state.chat.messages[roomId] || [];

export const selectTypingUsersInRoom =
  (roomId: string) => (state: { chat: ChatState }) =>
    state.chat.typingUsers[roomId] || [];

export const selectOnlineUsersInRoom =
  (roomId: string) => (state: { chat: ChatState }) =>
    state.chat.onlineUsers.filter((user) => user.rooms.includes(roomId));
