import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi";
import { workspaceApi } from "./api/workspaceApi";
import { projectApi } from "./api/projectApi";
import { chatApi } from "./api/chatApi";
import authSlice from "./slices/authSlice";
import userSlice from "./slices/userSlice";
import chatSlice from "./slices/chatSlice";

export const store = configureStore({
  reducer: {
    // Slices
    auth: authSlice,
    user: userSlice,
    chat: chatSlice,

    // API slices
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [workspaceApi.reducerPath]: workspaceApi.reducer,
    [projectApi.reducerPath]: projectApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/PAUSE",
          "persist/PURGE",
          "persist/REGISTER",
        ],
      },
    }).concat(
      authApi.middleware,
      userApi.middleware,
      workspaceApi.middleware,
      projectApi.middleware,
      chatApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
