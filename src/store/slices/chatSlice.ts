import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  encryptionPassword: string | null;
  isEncryptionInitialized: boolean;
  selectedRoomId: string | null;
  onlineUsers: string[];
}

const initialState: ChatState = {
  encryptionPassword: null,
  isEncryptionInitialized: false,
  selectedRoomId: null,
  onlineUsers: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setEncryptionPassword: (state, action: PayloadAction<string>) => {
      state.encryptionPassword = action.payload;
      state.isEncryptionInitialized = true;
    },
    clearEncryptionPassword: (state) => {
      state.encryptionPassword = null;
      state.isEncryptionInitialized = false;
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
  },
});

export const {
  setEncryptionPassword,
  clearEncryptionPassword,
  setSelectedRoomId,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
} = chatSlice.actions;

export default chatSlice.reducer;
