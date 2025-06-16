import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "@reduxjs/toolkit";
import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi";
import { workspaceApi } from "./api/workspaceApi";
import { projectApi } from "./api/projectApi";
import { chatApi } from "./api/chatApi";
import authSlice from "./slices/authSlice";
import userSlice from "./slices/userSlice";
import chatSlice from "./slices/chatSlice";

// Persist configuration
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["chat", "auth"], // Only persist chat and auth state
  blacklist: [
    authApi.reducerPath,
    userApi.reducerPath,
    workspaceApi.reducerPath,
    projectApi.reducerPath,
    chatApi.reducerPath,
  ], // Don't persist API cache
};

// Root reducer
const rootReducer = combineReducers({
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
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
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

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
