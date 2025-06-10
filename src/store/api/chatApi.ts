import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  CreateChatRoomData,
  UpdateChatRoomData,
  SendMessageData,
  ChatRoomResponse,
  ChatRoomsResponse,
  MessagesResponse,
  DecryptedMessage,
  ReactionType,
} from "@/src/types/chat.types";
import type { PaginationParams } from "@/src/types/api.types";
import type { RootState } from "@/src/store";

// Helper function to get encryption password from session storage
const getEncryptionPassword = () => {
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      return sessionStorage.getItem("worksphere_encryption_password") || "";
    } catch (error) {
      console.error("Error retrieving encryption password:", error);
      return "";
    }
  }
  return "";
};

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json");

      // Try to get encryption password from Redux state first, then session storage
      const state = getState() as RootState;
      const encryptionPassword =
        state.chat?.encryptionPassword || getEncryptionPassword();

      if (encryptionPassword) {
        headers.set("x-encryption-password", encryptionPassword);
      }

      return headers;
    },
  }),
  tagTypes: ["ChatRoom", "ChatMessage", "ChatParticipants"],
  endpoints: (builder) => ({
    // Get user chat rooms
    getUserChatRooms: builder.query<ChatRoomsResponse, void>({
      query: () => "/chat/rooms",
      providesTags: ["ChatRoom"],
      transformResponse: (response: any) => {
        // Handle both direct response and wrapped response
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to fetch chat rooms");
        }
        return response;
      },
    }),

    // Get workspace chat rooms - FIXED ENDPOINT
    getWorkspaceChatRooms: builder.query<ChatRoomsResponse, string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/chat/rooms`,
      providesTags: (result, error, workspaceId) => [
        { type: "ChatRoom", id: `workspace-${workspaceId}` },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(
            response.message || "Failed to fetch workspace chat rooms"
          );
        }
        return response;
      },
    }),

    // Get chat room by ID
    getChatRoomById: builder.query<ChatRoomResponse, string>({
      query: (id) => `/chat/rooms/${id}`,
      providesTags: (result, error, id) => [{ type: "ChatRoom", id }],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to fetch chat room");
        }
        return response;
      },
    }),

    // Create chat room
    createChatRoom: builder.mutation<ChatRoomResponse, CreateChatRoomData>({
      query: (data) => ({
        url: "/chat/rooms",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatRoom"],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to create chat room");
        }
        return response;
      },
    }),

    // Update chat room
    updateChatRoom: builder.mutation<
      ChatRoomResponse,
      { id: string; data: UpdateChatRoomData }
    >({
      query: ({ id, data }) => ({
        url: `/chat/rooms/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ChatRoom", id },
        "ChatRoom",
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to update chat room");
        }
        return response;
      },
    }),

    // Get chat room messages
    getChatRoomMessages: builder.query<
      MessagesResponse,
      { roomId: string; pagination?: PaginationParams }
    >({
      query: ({ roomId, pagination = {} }) => {
        const searchParams = new URLSearchParams();
        if (pagination.page)
          searchParams.append("page", pagination.page.toString());
        if (pagination.limit)
          searchParams.append("limit", pagination.limit.toString());
        if (pagination.sortOrder)
          searchParams.append("sortOrder", pagination.sortOrder);

        const queryString = searchParams.toString();
        return `/chat/rooms/${roomId}/messages${
          queryString ? `?${queryString}` : ""
        }`;
      },
      providesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: `room-${roomId}` },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to fetch messages");
        }
        return response;
      },
    }),

    // Send message
    sendMessage: builder.mutation<DecryptedMessage, SendMessageData>({
      query: (data) => ({
        url: "/chat/messages",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, data) => [
        { type: "ChatMessage", id: `room-${data.roomId}` },
        { type: "ChatRoom", id: data.roomId },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to send message");
        }
        return response;
      },
    }),

    // Ensure workspace general room exists - FIXED ENDPOINT
    ensureWorkspaceGeneralRoom: builder.mutation<ChatRoomResponse, string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/chat/rooms/ensure-general`,
        method: "POST",
      }),
      invalidatesTags: ["ChatRoom"],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to ensure general room");
        }
        return response;
      },
    }),

    // Mark message as read
    markMessageAsRead: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (messageId) => ({
        url: `/chat/messages/${messageId}/read`,
        method: "POST",
      }),
      invalidatesTags: (result, error, messageId) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success) {
            return (
              response.data || {
                success: true,
                message: "Message marked as read",
              }
            );
          }
          throw new Error(response.message || "Failed to mark message as read");
        }
        return response;
      },
    }),

    // Edit message
    editMessage: builder.mutation<
      DecryptedMessage,
      { messageId: string; content: string }
    >({
      query: ({ messageId, content }) => ({
        url: `/chat/messages/${messageId}`,
        method: "PUT",
        body: { content },
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to edit message");
        }
        return response;
      },
    }),

    // Delete message
    deleteMessage: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (messageId) => ({
        url: `/chat/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, messageId) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success) {
            return (
              response.data || { success: true, message: "Message deleted" }
            );
          }
          throw new Error(response.message || "Failed to delete message");
        }
        return response;
      },
    }),

    // Add reaction
    addReaction: builder.mutation<
      DecryptedMessage,
      { messageId: string; type: ReactionType; emoji?: string }
    >({
      query: ({ messageId, type, emoji }) => ({
        url: `/chat/messages/${messageId}/reactions`,
        method: "POST",
        body: { type, emoji },
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to add reaction");
        }
        return response;
      },
    }),

    // Remove reaction
    removeReaction: builder.mutation<
      DecryptedMessage,
      { messageId: string; reactionType: string }
    >({
      query: ({ messageId, reactionType }) => ({
        url: `/chat/messages/${messageId}/reactions/${reactionType}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to remove reaction");
        }
        return response;
      },
    }),

    // Add participants
    addParticipants: builder.mutation<
      ChatRoomResponse,
      { roomId: string; participantIds: string[] }
    >({
      query: ({ roomId, participantIds }) => ({
        url: `/chat/rooms/${roomId}/participants`,
        method: "POST",
        body: { participantIds },
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatRoom", id: roomId },
        { type: "ChatParticipants", id: roomId },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to add participants");
        }
        return response;
      },
    }),

    // Remove participant
    removeParticipant: builder.mutation<
      ChatRoomResponse,
      { roomId: string; participantId: string }
    >({
      query: ({ roomId, participantId }) => ({
        url: `/chat/rooms/${roomId}/participants/${participantId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatRoom", id: roomId },
        { type: "ChatParticipants", id: roomId },
      ],
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || "Failed to remove participant");
        }
        return response;
      },
    }),

    // Initialize user encryption
    initializeUserEncryption: builder.mutation<
      { success: boolean; message: string },
      { password: string }
    >({
      query: ({ password }) => ({
        url: "/chat/encryption/initialize",
        method: "POST",
        body: { password },
      }),
      transformResponse: (response: any) => {
        if (response.success !== undefined) {
          if (response.success) {
            return (
              response.data || {
                success: true,
                message: "Encryption initialized",
              }
            );
          }
          throw new Error(
            response.message || "Failed to initialize encryption"
          );
        }
        return response;
      },
    }),
  }),
});

export const {
  useGetUserChatRoomsQuery,
  useGetWorkspaceChatRoomsQuery,
  useGetChatRoomByIdQuery,
  useCreateChatRoomMutation,
  useUpdateChatRoomMutation,
  useGetChatRoomMessagesQuery,
  useSendMessageMutation,
  useMarkMessageAsReadMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useAddParticipantsMutation,
  useRemoveParticipantMutation,
  useInitializeUserEncryptionMutation,
  useEnsureWorkspaceGeneralRoomMutation,
} = chatApi;
