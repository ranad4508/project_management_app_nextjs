import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  CreateChatRoomData,
  UpdateChatRoomData,
  SendMessageData,
  ChatRoomResponse,
  ChatRoomsResponse,
  MessagesResponse,
  DecryptedMessage,
} from "@/src/types/chat.types";
import type { ApiResponse, PaginationParams } from "@/src/types/api.types";

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/chat",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json");
      // Add encryption password from state if available
      const encryptionPassword = (getState() as any).chat?.encryptionPassword;
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
      query: () => "rooms",
      providesTags: ["ChatRoom"],
      transformResponse: (response: ApiResponse<ChatRoomsResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch chat rooms");
      },
    }),

    // Get workspace chat rooms
    getWorkspaceChatRooms: builder.query<ChatRoomsResponse, string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/chat/rooms`,
      providesTags: (result, error, workspaceId) => [
        { type: "ChatRoom", id: `workspace-${workspaceId}` },
      ],
      transformResponse: (response: ApiResponse<ChatRoomsResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(
          response.message || "Failed to fetch workspace chat rooms"
        );
      },
    }),

    // Get chat room by ID
    getChatRoomById: builder.query<ChatRoomResponse, string>({
      query: (id) => `rooms/${id}`,
      providesTags: (result, error, id) => [{ type: "ChatRoom", id }],
      transformResponse: (response: ApiResponse<ChatRoomResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch chat room");
      },
    }),

    // Create chat room
    createChatRoom: builder.mutation<ChatRoomResponse, CreateChatRoomData>({
      query: (data) => ({
        url: "rooms",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatRoom"],
      transformResponse: (response: ApiResponse<ChatRoomResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to create chat room");
      },
    }),

    // Update chat room
    updateChatRoom: builder.mutation<
      ChatRoomResponse,
      { id: string; data: UpdateChatRoomData }
    >({
      query: ({ id, data }) => ({
        url: `rooms/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ChatRoom", id },
        "ChatRoom",
      ],
      transformResponse: (response: ApiResponse<ChatRoomResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to update chat room");
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

        return `rooms/${roomId}/messages?${searchParams.toString()}`;
      },
      providesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: `room-${roomId}` },
      ],
      transformResponse: (response: ApiResponse<MessagesResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch messages");
      },
    }),

    // Send message
    sendMessage: builder.mutation<DecryptedMessage, SendMessageData>({
      query: (data) => ({
        url: "messages",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, data) => [
        { type: "ChatMessage", id: `room-${data.roomId}` },
        { type: "ChatRoom", id: data.roomId },
      ],
      transformResponse: (response: ApiResponse<DecryptedMessage>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to send message");
      },
    }),

    // Mark message as read
    markMessageAsRead: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (messageId) => ({
        url: `messages/${messageId}/read`,
        method: "POST",
      }),
      invalidatesTags: (result, error, messageId) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (
        response: ApiResponse<{ success: boolean; message: string }>
      ) => {
        if (response.success) {
          return (
            response.data || {
              success: true,
              message: "Message marked as read",
            }
          );
        }
        throw new Error(response.message || "Failed to mark message as read");
      },
    }),

    // Edit message
    editMessage: builder.mutation<
      DecryptedMessage,
      { messageId: string; content: string }
    >({
      query: ({ messageId, content }) => ({
        url: `messages/${messageId}`,
        method: "PUT",
        body: { content },
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: ApiResponse<DecryptedMessage>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to edit message");
      },
    }),

    // Delete message
    deleteMessage: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (messageId) => ({
        url: `messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, messageId) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (
        response: ApiResponse<{ success: boolean; message: string }>
      ) => {
        if (response.success) {
          return response.data || { success: true, message: "Message deleted" };
        }
        throw new Error(response.message || "Failed to delete message");
      },
    }),

    // Add reaction
    addReaction: builder.mutation<
      DecryptedMessage,
      { messageId: string; type: string; emoji?: string }
    >({
      query: ({ messageId, type, emoji }) => ({
        url: `messages/${messageId}/reactions`,
        method: "POST",
        body: { type, emoji },
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: ApiResponse<DecryptedMessage>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to add reaction");
      },
    }),

    // Remove reaction
    removeReaction: builder.mutation<
      DecryptedMessage,
      { messageId: string; reactionType: string }
    >({
      query: ({ messageId, reactionType }) => ({
        url: `messages/${messageId}/reactions/${reactionType}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: ApiResponse<DecryptedMessage>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to remove reaction");
      },
    }),

    // Add participants
    addParticipants: builder.mutation<
      ChatRoomResponse,
      { roomId: string; participantIds: string[] }
    >({
      query: ({ roomId, participantIds }) => ({
        url: `rooms/${roomId}/participants`,
        method: "POST",
        body: { participantIds },
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatRoom", id: roomId },
        { type: "ChatParticipants", id: roomId },
      ],
      transformResponse: (response: ApiResponse<ChatRoomResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to add participants");
      },
    }),

    // Remove participant
    removeParticipant: builder.mutation<
      ChatRoomResponse,
      { roomId: string; participantId: string }
    >({
      query: ({ roomId, participantId }) => ({
        url: `rooms/${roomId}/participants/${participantId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatRoom", id: roomId },
        { type: "ChatParticipants", id: roomId },
      ],
      transformResponse: (response: ApiResponse<ChatRoomResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to remove participant");
      },
    }),

    // Initialize user encryption
    initializeUserEncryption: builder.mutation<
      { success: boolean; message: string },
      { password: string }
    >({
      query: ({ password }) => ({
        url: "encryption/initialize",
        method: "POST",
        body: { password },
      }),
      transformResponse: (
        response: ApiResponse<{ success: boolean; message: string }>
      ) => {
        if (response.success) {
          return (
            response.data || {
              success: true,
              message: "Encryption initialized",
            }
          );
        }
        throw new Error(response.message || "Failed to initialize encryption");
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
} = chatApi;
