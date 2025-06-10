import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi";
import { workspaceApi } from "./api/workspaceApi";
import authSlice from "./slices/authSlice";
import userSlice from "./slices/userSlice";
import { chatApi } from "./api/chatApi";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userSlice,
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [workspaceApi.reducerPath]: workspaceApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }).concat(authApi.middleware, userApi.middleware, workspaceApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
