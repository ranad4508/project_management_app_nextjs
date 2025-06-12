import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";
import type {
  ChatRoom,
  ChatMessage,
  CreateRoomData,
  UpdateRoomData,
  SendMessageData,
  RoomListResponse,
  MessageListResponse,
  ReactionType,
} from "@/src/types/chat.types";
import type { ApiResponse, PaginationParams } from "@/src/types/api.types";

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/chat",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["ChatRoom", "ChatMessage", "RoomMembers"],
  endpoints: (builder) => ({
    // Room management
    getUserRooms: builder.query<
      ChatRoom[],
      { workspaceId?: string } & Partial<PaginationParams>
    >({
      query: ({ workspaceId, ...params }) => {
        const searchParams = new URLSearchParams();
        if (workspaceId) searchParams.append("workspaceId", workspaceId);
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());

        return `rooms?${searchParams.toString()}`;
      },
      providesTags: ["ChatRoom"],
      transformResponse: (response: ApiResponse<{ rooms: ChatRoom[] }>) => {
        if (response.success && response.data) {
          return response.data.rooms;
        }
        throw new Error(response.message || "Failed to fetch rooms");
      },
    }),

    getRoomById: builder.query<ChatRoom, string>({
      query: (roomId) => `rooms/${roomId}`,
      providesTags: (result, error, roomId) => [
        { type: "ChatRoom", id: roomId },
      ],
      transformResponse: (response: ApiResponse<ChatRoom>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch room");
      },
    }),

    createRoom: builder.mutation<ChatRoom, CreateRoomData>({
      query: (data) => ({
        url: "rooms",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatRoom"],
      transformResponse: (response: ApiResponse<ChatRoom>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to create room");
      },
    }),

    updateRoom: builder.mutation<
      ChatRoom,
      { roomId: string; data: UpdateRoomData }
    >({
      query: ({ roomId, data }) => ({
        url: `rooms/${roomId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatRoom", id: roomId },
        "ChatRoom",
      ],
      transformResponse: (response: ApiResponse<ChatRoom>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to update room");
      },
    }),

    deleteRoom: builder.mutation<{ message: string }, string>({
      query: (roomId) => ({
        url: `rooms/${roomId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ChatRoom"],
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return response.data || { message: "Room deleted successfully" };
        }
        throw new Error(response.message || "Failed to delete room");
      },
    }),

    // Message management
    getRoomMessages: builder.query<
      MessageListResponse,
      { roomId: string; page?: number; limit?: number }
    >({
      query: ({ roomId, page = 1, limit = 50 }) => {
        const searchParams = new URLSearchParams();
        searchParams.append("page", page.toString());
        searchParams.append("limit", limit.toString());

        return `rooms/${roomId}/messages?${searchParams.toString()}`;
      },
      providesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: roomId },
      ],
      transformResponse: (response: ApiResponse<MessageListResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch messages");
      },
    }),

    sendMessage: builder.mutation<ChatMessage, SendMessageData>({
      query: (data) => ({
        url: "rooms/messages",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: roomId },
      ],
      transformResponse: (response: ApiResponse<ChatMessage>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to send message");
      },
    }),

    // Reactions
    addReaction: builder.mutation<
      ChatMessage,
      { messageId: string; type: ReactionType }
    >({
      query: ({ messageId, type }) => ({
        url: `messages/${messageId}/reactions`,
        method: "POST",
        body: { type },
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: ApiResponse<ChatMessage>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to add reaction");
      },
    }),

    removeReaction: builder.mutation<
      ChatMessage,
      { messageId: string; reactionId: string }
    >({
      query: ({ messageId, reactionId }) => ({
        url: `messages/${messageId}/reactions/${reactionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { messageId }) => [
        { type: "ChatMessage", id: messageId },
      ],
      transformResponse: (response: ApiResponse<ChatMessage>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to remove reaction");
      },
    }),

    // Room invitations
    inviteToRoom: builder.mutation<
      { message: string },
      { roomId: string; userId: string }
    >({
      query: ({ roomId, userId }) => ({
        url: `rooms/${roomId}/invite`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "RoomMembers", id: roomId },
      ],
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return response.data || { message: "User invited successfully" };
        }
        throw new Error(response.message || "Failed to invite user");
      },
    }),

    acceptRoomInvitation: builder.mutation<{ message: string }, string>({
      query: (invitationId) => ({
        url: `invitations/${invitationId}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["ChatRoom"],
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return (
            response.data || { message: "Invitation accepted successfully" }
          );
        }
        throw new Error(response.message || "Failed to accept invitation");
      },
    }),

    // Utility
    updateLastRead: builder.mutation<{ message: string }, string>({
      query: (roomId) => ({
        url: `rooms/${roomId}/read`,
        method: "PUT",
      }),
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return response.data || { message: "Last read updated successfully" };
        }
        throw new Error(response.message || "Failed to update last read");
      },
    }),
  }),
});

export const {
  useGetUserRoomsQuery,
  useGetRoomByIdQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useGetRoomMessagesQuery,
  useSendMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useInviteToRoomMutation,
  useAcceptRoomInvitationMutation,
  useUpdateLastReadMutation,
} = chatApi;
