import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DecryptedMessage } from "@/src/types/chat.types";

interface ChatState {
  isEncryptionInitialized: boolean;
  selectedRoomId: string | null;
  onlineUsers: string[];
  messages: Record<string, DecryptedMessage[]>;
}

const initialState: ChatState = {
  isEncryptionInitialized: false,
  selectedRoomId: null,
  onlineUsers: [],
  messages: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setEncryptionInitialized: (state, action: PayloadAction<boolean>) => {
      state.isEncryptionInitialized = action.payload;
    },
    setSelectedRoomId: (state, action: PayloadAction<string | null>) => {
      state.selectedRoomId = action.payload;
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
    addOnlineUser: (state, action: PayloadAction<string>) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    removeOnlineUser: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter(
        (id) => id !== action.payload
      );
    },
    appendMessage: (
      state,
      action: PayloadAction<{ roomId: string; message: DecryptedMessage }>
    ) => {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      state.messages[roomId].push(message);
    },
    setMessages: (
      state,
      action: PayloadAction<{ roomId: string; messages: DecryptedMessage[] }>
    ) => {
      const { roomId, messages } = action.payload;
      state.messages[roomId] = messages;
    },
    resetChatState: (state) => {
      state.isEncryptionInitialized = false;
      state.selectedRoomId = null;
      state.onlineUsers = [];
      state.messages = {};
    },
  },
});

export const {
  setEncryptionInitialized,
  setSelectedRoomId,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  appendMessage,
  setMessages,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
