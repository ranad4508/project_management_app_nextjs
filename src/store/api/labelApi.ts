import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { ApiResponse, PaginationParams } from "@/src/types/api.types";

// Label interfaces
export interface Label {
  _id: string;
  name: string;
  color: string;
  workspace: string;
  project?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabelData {
  name: string;
  color: string;
  project?: string;
}

export interface UpdateLabelData {
  name?: string;
  color?: string;
}

export interface LabelFilters {
  search?: string;
  project?: string;
}

export interface LabelsResponse {
  labels: Label[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const labelApi = createApi({
  reducerPath: "labelApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  tagTypes: ["Label"],
  endpoints: (builder) => ({
    // Get workspace labels
    getWorkspaceLabels: builder.query<
      { success: boolean; data: LabelsResponse },
      { workspaceId: string } & PaginationParams & LabelFilters
    >({
      query: ({ workspaceId, project, ...params }) => ({
        url: `/workspaces/${workspaceId}/labels`,
        params: {
          ...params,
          ...(project && { projectId: project }),
        },
      }),
      providesTags: (result) =>
        result?.labels
          ? [
              ...result.labels.map(({ _id }) => ({
                type: "Label" as const,
                id: _id,
              })),
              { type: "Label", id: "LIST" },
            ]
          : [{ type: "Label", id: "LIST" }],
    }),

    // Get project labels
    getProjectLabels: builder.query<
      LabelsResponse,
      { workspaceId: string; projectId: string } & PaginationParams &
        LabelFilters
    >({
      query: ({ workspaceId, projectId, ...params }) => ({
        url: `/workspaces/${workspaceId}/labels`,
        params: { ...params, projectId },
      }),
      providesTags: (result) =>
        result?.labels
          ? [
              ...result.labels.map(({ _id }) => ({
                type: "Label" as const,
                id: _id,
              })),
              { type: "Label", id: "PROJECT_LIST" },
            ]
          : [{ type: "Label", id: "PROJECT_LIST" }],
    }),

    // Create label
    createLabel: builder.mutation<
      ApiResponse<Label>,
      { workspaceId: string } & CreateLabelData
    >({
      query: ({ workspaceId, ...data }) => ({
        url: `/workspaces/${workspaceId}/labels`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Label", id: "LIST" },
        { type: "Label", id: "PROJECT_LIST" },
      ],
    }),

    // Update label
    updateLabel: builder.mutation<
      ApiResponse<Label>,
      { labelId: string } & UpdateLabelData
    >({
      query: ({ labelId, ...data }) => ({
        url: `/labels/${labelId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { labelId }) => [
        { type: "Label", id: labelId },
        { type: "Label", id: "LIST" },
        { type: "Label", id: "PROJECT_LIST" },
      ],
    }),

    // Delete label
    deleteLabel: builder.mutation<ApiResponse<void>, { labelId: string }>({
      query: ({ labelId }) => ({
        url: `/labels/${labelId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { labelId }) => [
        { type: "Label", id: labelId },
        { type: "Label", id: "LIST" },
        { type: "Label", id: "PROJECT_LIST" },
      ],
    }),

    // Get label by ID
    getLabel: builder.query<ApiResponse<Label>, { labelId: string }>({
      query: ({ labelId }) => `/labels/${labelId}`,
      providesTags: (_result, _error, { labelId }) => [
        { type: "Label", id: labelId },
      ],
    }),
  }),
});

export const {
  useGetWorkspaceLabelsQuery,
  useGetProjectLabelsQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
  useGetLabelQuery,
} = labelApi;
