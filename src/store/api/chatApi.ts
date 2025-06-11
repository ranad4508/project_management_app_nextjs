import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query/react";
import type {
  CreateChatRoomData,
  SendMessageData,
  ChatRoomResponse,
  ChatRoomsResponse,
  MessagesResponse,
  DecryptedMessage,
} from "@/src/types/chat.types";
import type { ApiResponse, PaginationParams } from "@/src/types/api.types";

interface ExtraOptions {
  sessionKey?: string;
}

type CustomBaseQueryFn = BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  ExtraOptions,
  FetchBaseQueryMeta
>;

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
    prepareHeaders: (headers, api) => {
      headers.set("Content-Type", "application/json");
      const extraOptions = api.extraOptions as ExtraOptions;
      if (extraOptions?.sessionKey) {
        headers.set("x-session-key", extraOptions.sessionKey);
      }
      return headers;
    },
  }) as CustomBaseQueryFn,
  tagTypes: ["ChatRoom", "ChatMessage", "ChatParticipants"],
  endpoints: (builder) => ({
    initializeUserEncryption: builder.mutation<
      { success: boolean; data: any },
      { password: string; sessionKey?: string }
    >({
      query: ({ password }) => ({
        url: "/encryption",
        method: "POST",
        body: { password },
      }),
      transformResponse: (response: ApiResponse<any>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to initialize encryption");
        }
        return {
          success: response.success,
          data: response.data,
        };
      },
    }),
    getWorkspaceChatRooms: builder.query<
      ChatRoomsResponse,
      { workspaceId: string; sessionKey?: string }
    >({
      query: ({ workspaceId }) => `/workspaces/${workspaceId}/rooms`,
      providesTags: (result, error, { workspaceId }) => [
        { type: "ChatRoom", id: `workspace-${workspaceId}` },
      ],
      transformResponse: (response: ApiResponse<ChatRoomsResponse>) => {
        if (!response.success || !response.data) {
          throw new Error(
            response.error || "Failed to fetch workspace chat rooms"
          );
        }
        return response.data;
      },
    }),
    getChatRoomMessages: builder.query<
      MessagesResponse,
      { roomId: string; pagination?: PaginationParams; sessionKey?: string }
    >({
      query: ({ roomId, pagination = {} }) => {
        const searchParams = new URLSearchParams();
        if (pagination.limit)
          searchParams.append("limit", pagination.limit.toString());
        if (pagination.sortOrder)
          searchParams.append("sortOrder", pagination.sortOrder);
        return `/rooms/${roomId}/message${
          searchParams.toString() ? `?${searchParams}` : ""
        }`;
      },
      providesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: `room-${roomId}` },
      ],
      transformResponse: (response: ApiResponse<MessagesResponse>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch messages");
        }
        return response.data;
      },
    }),
    sendMessage: builder.mutation<
      DecryptedMessage,
      SendMessageData & { sessionKey?: string }
    >({
      query: ({ sessionKey, roomId, ...data }) => ({
        url: `/rooms/${roomId}/message`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: `room-${roomId}` },
        { type: "ChatRoom", id: roomId },
      ],
      transformResponse: (response: ApiResponse<DecryptedMessage>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to send message");
        }
        return response.data;
      },
    }),
    createChatRoom: builder.mutation<
      ChatRoomResponse,
      { data: CreateChatRoomData; sessionKey?: string; workspaceId: string }
    >({
      query: ({ data, workspaceId }) => ({
        url: `/workspaces/${workspaceId}/rooms`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatRoom"],
      transformResponse: (response: ApiResponse<ChatRoomResponse>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to create chat room");
        }
        return response.data;
      },
    }),
    ensureWorkspaceGeneralRoom: builder.mutation<
      ChatRoomResponse,
      { workspaceId: string; sessionKey?: string }
    >({
      query: ({ workspaceId }) => ({
        url: `/workspaces/${workspaceId}/general`,
        method: "POST",
      }),
      invalidatesTags: ["ChatRoom"],
      transformResponse: (response: ApiResponse<ChatRoomResponse>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to ensure general room");
        }
        return response.data;
      },
    }),
    addReaction: builder.mutation<
      DecryptedMessage,
      {
        messageId: string;
        type: string;
        emoji?: string;
        roomId: string;
        sessionKey?: string;
      }
    >({
      query: ({ sessionKey, roomId, messageId, type, emoji }) => ({
        url: `/rooms/${roomId}/message/${messageId}/reactions/${type}`,
        method: "POST",
        body: { emoji },
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: ApiResponse<DecryptedMessage>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to add reaction");
        }
        return response.data;
      },
    }),
    removeReaction: builder.mutation<
      DecryptedMessage,
      {
        messageId: string;
        reactionType: string;
        roomId: string;
        sessionKey?: string;
      }
    >({
      query: ({ sessionKey, roomId, messageId, reactionType }) => ({
        url: `/rooms/${roomId}/message/${messageId}/reactions/${reactionType}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: ApiResponse<DecryptedMessage>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to remove reaction");
        }
        return response.data;
      },
    }),
    deleteMessage: builder.mutation<
      { success: boolean; message: string },
      { messageId: string; roomId: string; sessionKey?: string }
    >({
      query: ({ roomId, messageId }) => ({
        url: `/rooms/${roomId}/message/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
        { type: "ChatRoom" },
      ],
      transformResponse: (
        response: ApiResponse<{ success: boolean; message?: string }>
      ) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to delete message");
        }
        return {
          success: response.data.success,
          message: response.data.message || "Message deleted",
        };
      },
    }),
    markMessageAsRead: builder.mutation<
      { success: boolean; message: string },
      { messageId: string; roomId: string; sessionKey?: string }
    >({
      query: ({ roomId, messageId }) => ({
        url: `/rooms/${roomId}/message/${messageId}/read`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
        { type: "ChatRoom" },
      ],
      transformResponse: (
        response: ApiResponse<{ success: boolean; message?: string }>
      ) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to mark message as read");
        }
        return {
          success: response.data.success,
          message: response.data.message || "Message marked as read",
        };
      },
    }),
  }),
});

export const {
  useInitializeUserEncryptionMutation,
  useGetWorkspaceChatRoomsQuery,
  useGetChatRoomMessagesQuery,
  useSendMessageMutation,
  useCreateChatRoomMutation,
  useEnsureWorkspaceGeneralRoomMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useDeleteMessageMutation,
  useMarkMessageAsReadMutation,
} = chatApi;
