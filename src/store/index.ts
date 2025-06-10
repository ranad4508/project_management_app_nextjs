import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi";
import { workspaceApi } from "./api/workspaceApi";
import { projectApi } from "./api/projectApi";
import { chatApi } from "./api/chatApi";
import authSlice from "./slices/authSlice";
import userSlice from "./slices/userSlice";

export const store = configureStore({
  reducer: {
    // RTK Query APIs
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [workspaceApi.reducerPath]: workspaceApi.reducer,
    [projectApi.reducerPath]: projectApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,

    // Regular slices
    auth: authSlice,
    user: userSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
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

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
