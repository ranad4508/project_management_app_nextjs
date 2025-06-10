import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  CreateWorkspaceData,
  UpdateWorkspaceData,
  InviteMemberData,
  WorkspaceResponse,
  WorkspacesResponse,
  WorkspaceMembersResponse,
} from "@/src/types/workspace.types";
import type { ApiResponse, PaginationParams } from "@/src/types/api.types";

export const workspaceApi = createApi({
  reducerPath: "workspaceApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/workspaces",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Workspace", "WorkspaceMembers", "WorkspaceSettings"],
  endpoints: (builder) => ({
    // Get user workspaces
    getWorkspaces: builder.query<WorkspacesResponse, PaginationParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.sortBy) searchParams.append("sortBy", params.sortBy);
        if (params.sortOrder)
          searchParams.append("sortOrder", params.sortOrder);

        return `?${searchParams.toString()}`;
      },
      providesTags: ["Workspace"],
      transformResponse: (response: ApiResponse<WorkspacesResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch workspaces");
      },
    }),

    // Get workspace by ID
    getWorkspaceById: builder.query<WorkspaceResponse, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: "Workspace", id }],
      transformResponse: (response: ApiResponse<WorkspaceResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch workspace");
      },
    }),

    // Create workspace
    createWorkspace: builder.mutation<WorkspaceResponse, CreateWorkspaceData>({
      query: (data) => ({
        url: "",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Workspace"],
      transformResponse: (response: ApiResponse<WorkspaceResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to create workspace");
      },
    }),

    // Update workspace
    updateWorkspace: builder.mutation<
      WorkspaceResponse,
      { id: string; data: UpdateWorkspaceData }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Workspace", id },
        "Workspace",
      ],
      transformResponse: (response: ApiResponse<WorkspaceResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to update workspace");
      },
    }),

    // Delete workspace
    deleteWorkspace: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Workspace"],
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return response.data || { message: "Workspace deleted successfully" };
        }
        throw new Error(response.message || "Failed to delete workspace");
      },
    }),

    // Get workspace members
    getWorkspaceMembers: builder.query<WorkspaceMembersResponse, string>({
      query: (id) => `/${id}/members`,
      providesTags: (result, error, id) => [{ type: "WorkspaceMembers", id }],
      transformResponse: (response: ApiResponse<WorkspaceMembersResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(
          response.message || "Failed to fetch workspace members"
        );
      },
    }),

    // Invite member
    inviteMember: builder.mutation<
      { message: string },
      { workspaceId: string; data: InviteMemberData }
    >({
      query: ({ workspaceId, data }) => ({
        url: `/${workspaceId}/invite`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { workspaceId }) => [
        { type: "WorkspaceMembers", id: workspaceId },
      ],
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return response.data || { message: "Member invited successfully" };
        }
        throw new Error(response.message || "Failed to invite member");
      },
    }),

    // Update member role
    updateMemberRole: builder.mutation<
      { message: string },
      { workspaceId: string; userId: string; role: string }
    >({
      query: ({ workspaceId, userId, role }) => ({
        url: `/${workspaceId}/members/${userId}`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: (result, error, { workspaceId }) => [
        { type: "WorkspaceMembers", id: workspaceId },
        { type: "Workspace", id: workspaceId },
      ],
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return (
            response.data || { message: "Member role updated successfully" }
          );
        }
        throw new Error(response.message || "Failed to update member role");
      },
    }),

    // Remove member
    removeMember: builder.mutation<
      { message: string },
      { workspaceId: string; userId: string }
    >({
      query: ({ workspaceId, userId }) => ({
        url: `/${workspaceId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { workspaceId }) => [
        { type: "WorkspaceMembers", id: workspaceId },
        { type: "Workspace", id: workspaceId },
      ],
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return response.data || { message: "Member removed successfully" };
        }
        throw new Error(response.message || "Failed to remove member");
      },
    }),

    // Get workspace settings
    getWorkspaceSettings: builder.query<any, string>({
      query: (id) => `/${id}/settings`,
      providesTags: (result, error, id) => [{ type: "WorkspaceSettings", id }],
      transformResponse: (response: ApiResponse<any>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(
          response.message || "Failed to fetch workspace settings"
        );
      },
    }),

    // Update workspace settings
    updateWorkspaceSettings: builder.mutation<
      any,
      { id: string; settings: any }
    >({
      query: ({ id, settings }) => ({
        url: `/${id}/settings`,
        method: "PUT",
        body: settings,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "WorkspaceSettings", id },
        { type: "Workspace", id },
      ],
      transformResponse: (response: ApiResponse<any>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(
          response.message || "Failed to update workspace settings"
        );
      },
    }),

    // Accept invitation
    acceptInvitation: builder.mutation<any, { token: string }>({
      query: ({ token }) => ({
        url: "/invitations/accept",
        method: "POST",
        body: { token },
      }),
      invalidatesTags: ["Workspace"],
      transformResponse: (response: ApiResponse<any>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to accept invitation");
      },
    }),
  }),
});

export const {
  useGetWorkspacesQuery,
  useGetWorkspaceByIdQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetWorkspaceMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useGetWorkspaceSettingsQuery,
  useUpdateWorkspaceSettingsMutation,
  useAcceptInvitationMutation,
} = workspaceApi;

export type {
  CreateWorkspaceData,
  UpdateWorkspaceData,
  InviteMemberData,
  WorkspaceResponse,
  WorkspacesResponse,
  WorkspaceMembersResponse,
};
