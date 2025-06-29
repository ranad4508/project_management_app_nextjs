import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";
import type {
  ChatRoom,
  ChatMessage,
  CreateRoomData,
  UpdateRoomData,
  SendMessageData,
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

    archiveRoom: builder.mutation<ChatRoom, string>({
      query: (roomId) => ({
        url: `rooms/${roomId}/archive`,
        method: "POST",
      }),
      invalidatesTags: (_, __, roomId) => [
        { type: "ChatRoom", id: roomId },
        "ChatRoom",
      ],
      transformResponse: (response: ApiResponse<ChatRoom>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to archive room");
      },
    }),

    // Message management with pagination
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
      // Don't use merge for pagination - let the component handle it
      keepUnusedDataFor: 0, // Don't cache old pages
    }),

    sendMessage: builder.mutation<ChatMessage, SendMessageData>({
      query: (data) => {
        // Handle file uploads with FormData
        if (data.attachments && data.attachments.length > 0) {
          const formData = new FormData();
          formData.append("roomId", data.roomId);
          formData.append("content", data.content);
          formData.append("type", data.type || "text");
          if (data.replyTo) formData.append("replyTo", data.replyTo);
          if (data.isEncrypted !== undefined)
            formData.append("isEncrypted", data.isEncrypted.toString());

          // Add files to FormData
          data.attachments.forEach((file, index) => {
            if (file instanceof File) {
              formData.append(`attachments`, file);
            }
          });

          return {
            url: "rooms/messages",
            method: "POST",
            body: formData,
            // Don't set Content-Type header, let browser set it with boundary
            prepareHeaders: (headers: Headers) => {
              headers.delete("Content-Type");
              return headers;
            },
          };
        }

        // Regular JSON request for text messages
        return {
          url: "rooms/messages",
          method: "POST",
          body: data,
        };
      },
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

    editMessage: builder.mutation<
      ChatMessage,
      { messageId: string; content: string; roomId: string }
    >({
      query: ({ messageId, content }) => ({
        url: `messages/${messageId}`,
        method: "PUT",
        body: { content },
      }),
      // Update cache with server response after successful edit
      onQueryStarted: async (
        { messageId, content, roomId },
        { dispatch, queryFulfilled }
      ) => {
        try {
          const result = await queryFulfilled;
          console.log(
            "🔄 [API] Edit successful, updating cache with:",
            result.data
          );

          // Update the cache with the actual server response
          dispatch(
            chatApi.util.updateQueryData(
              "getRoomMessages",
              { roomId, page: 1, limit: 50 },
              (draft) => {
                const messageIndex = draft.messages.findIndex(
                  (msg) => msg._id === messageId
                );
                if (messageIndex !== -1 && result.data) {
                  console.log("📝 [API] Updating message in cache:", {
                    oldContent: draft.messages[messageIndex].content,
                    newContent: result.data.content,
                  });
                  // Replace the entire message with server data
                  draft.messages[messageIndex] = result.data;
                }
              }
            )
          );
        } catch (error) {
          console.error("❌ [API] Edit failed:", error);
          throw error;
        }
      },
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: roomId },
        { type: "ChatMessage", id: "LIST" },
      ],
      transformResponse: (response: ApiResponse<ChatMessage>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to edit message");
      },
    }),

    deleteMessage: builder.mutation<
      void,
      {
        messageId: string;
        roomId: string;
        deleteType: "delete_for_me" | "unsend_for_everyone";
      }
    >({
      query: ({ messageId, deleteType }) => ({
        url: `messages/${messageId}`,
        method: "DELETE",
        body: { deleteType },
      }),
      // Use optimistic updates for better UX
      onQueryStarted: async (
        { messageId, roomId, deleteType },
        { dispatch, queryFulfilled }
      ) => {
        // Optimistically update the cache with correct query parameters
        const patchResult = dispatch(
          chatApi.util.updateQueryData(
            "getRoomMessages",
            { roomId, page: 1, limit: 50 }, // Match the actual query parameters used in ChatWindow
            (draft) => {
              if (deleteType === "unsend_for_everyone") {
                // Remove message completely
                draft.messages = draft.messages.filter(
                  (msg) => msg._id !== messageId
                );
              }
              // For "delete_for_me", the server handles filtering, so we remove it from cache too
              else {
                draft.messages = draft.messages.filter(
                  (msg) => msg._id !== messageId
                );
              }
            }
          )
        );

        try {
          await queryFulfilled;
          // Success - the optimistic update stays
        } catch (error) {
          // On error, revert the optimistic update
          patchResult.undo();
          throw error;
        }
      },
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: roomId },
        { type: "ChatMessage", id: "LIST" },
      ],
      transformResponse: (response: ApiResponse<void>) => {
        if (response.success) {
          return;
        }
        throw new Error(response.message || "Failed to delete message");
      },
    }),

    // Reactions
    addReaction: builder.mutation<
      ChatMessage,
      { messageId: string; type: ReactionType; roomId: string }
    >({
      query: ({ messageId, type }) => ({
        url: `messages/${messageId}/reactions`,
        method: "POST",
        body: { type },
      }),
      // Use optimistic updates for reactions
      onQueryStarted: async (
        { messageId, type, roomId },
        { dispatch, queryFulfilled, getState }
      ) => {
        // Get current user from session (we'll need to get this from the component)
        const patchResult = dispatch(
          chatApi.util.updateQueryData(
            "getRoomMessages",
            { roomId, page: 1, limit: 50 },
            (draft) => {
              const message = draft.messages.find(
                (msg) => msg._id === messageId
              );
              if (message) {
                // Add optimistic reaction (we'll get the real user data from the server response)
                const tempReaction = {
                  _id: `temp-${Date.now()}`,
                  user: { _id: "temp-user", name: "You", email: "" },
                  type: type,
                  createdAt: new Date().toISOString(), // Convert to string for serialization
                };
                message.reactions.push(tempReaction as any);
              }
            }
          )
        );

        try {
          const result = await queryFulfilled;
          // Update with real reaction data from server
          dispatch(
            chatApi.util.updateQueryData(
              "getRoomMessages",
              { roomId, page: 1, limit: 50 },
              (draft) => {
                const message = draft.messages.find(
                  (msg) => msg._id === messageId
                );
                if (message && result.data) {
                  // Replace with server response
                  message.reactions = result.data.reactions;
                }
              }
            )
          );
        } catch (error) {
          // Revert optimistic update on error
          patchResult.undo();
          throw error;
        }
      },
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: roomId },
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
      { messageId: string; reactionId: string; roomId: string }
    >({
      query: ({ messageId, reactionId }) => ({
        url: `messages/${messageId}/reactions/${reactionId}`,
        method: "DELETE",
      }),
      // Use optimistic updates for reaction removal
      onQueryStarted: async (
        { messageId, reactionId, roomId },
        { dispatch, queryFulfilled }
      ) => {
        const patchResult = dispatch(
          chatApi.util.updateQueryData(
            "getRoomMessages",
            { roomId, page: 1, limit: 50 },
            (draft) => {
              const message = draft.messages.find(
                (msg) => msg._id === messageId
              );
              if (message) {
                // Remove reaction optimistically
                message.reactions = message.reactions.filter(
                  (reaction) => reaction._id !== reactionId
                );
              }
            }
          )
        );

        try {
          const result = await queryFulfilled;
          // Update with real data from server
          dispatch(
            chatApi.util.updateQueryData(
              "getRoomMessages",
              { roomId, page: 1, limit: 50 },
              (draft) => {
                const message = draft.messages.find(
                  (msg) => msg._id === messageId
                );
                if (message && result.data) {
                  message.reactions = result.data.reactions;
                }
              }
            )
          );
        } catch (error) {
          // Revert optimistic update on error
          patchResult.undo();
          throw error;
        }
      },
      invalidatesTags: (result, error, { roomId }) => [
        { type: "ChatMessage", id: roomId },
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

    // Member management
    getRoomMembers: builder.query<{ members: any[]; roomInfo: any }, string>({
      query: (roomId) => `rooms/${roomId}/members`,
      transformResponse: (
        response: ApiResponse<{ members: any[]; roomInfo: any }>
      ) => {
        if (response.success) {
          return response.data!;
        }
        throw new Error(response.message || "Failed to get room members");
      },
      providesTags: ["RoomMembers"],
    }),

    inviteMemberByEmail: builder.mutation<
      { message: string; roomId: string; invitedEmail: string },
      { roomId: string; email: string }
    >({
      query: ({ roomId, email }) => ({
        url: `rooms/${roomId}/members`,
        method: "POST",
        body: { email },
      }),
      transformResponse: (
        response: ApiResponse<{
          message: string;
          roomId: string;
          invitedEmail: string;
        }>
      ) => {
        if (response.success) {
          return response.data!;
        }
        throw new Error(response.message || "Failed to invite member");
      },
      invalidatesTags: ["RoomMembers", "ChatRoom"],
    }),

    removeMemberFromRoom: builder.mutation<
      { message: string; roomId: string; removedUserId: string },
      { roomId: string; memberId: string }
    >({
      query: ({ roomId, memberId }) => ({
        url: `rooms/${roomId}/members/${memberId}`,
        method: "DELETE",
      }),
      transformResponse: (
        response: ApiResponse<{
          message: string;
          roomId: string;
          removedUserId: string;
        }>
      ) => {
        if (response.success) {
          return response.data!;
        }
        throw new Error(response.message || "Failed to remove member");
      },
      invalidatesTags: ["RoomMembers", "ChatRoom"],
    }),

    changeMemberRole: builder.mutation<
      { message: string; roomId: string; updatedMember: any },
      { roomId: string; memberId: string; role: string }
    >({
      query: ({ roomId, memberId, role }) => ({
        url: `rooms/${roomId}/members/${memberId}`,
        method: "PUT",
        body: { role },
      }),
      transformResponse: (
        response: ApiResponse<{
          message: string;
          roomId: string;
          updatedMember: any;
        }>
      ) => {
        if (response.success) {
          return response.data!;
        }
        throw new Error(response.message || "Failed to change member role");
      },
      invalidatesTags: ["RoomMembers", "ChatRoom"],
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
  useArchiveRoomMutation,
  useGetRoomMessagesQuery,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useInviteToRoomMutation,
  useAcceptRoomInvitationMutation,
  useGetRoomMembersQuery,
  useInviteMemberByEmailMutation,
  useRemoveMemberFromRoomMutation,
  useChangeMemberRoleMutation,
  useUpdateLastReadMutation,
} = chatApi;
