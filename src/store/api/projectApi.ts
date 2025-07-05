import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  ApiResponse,
  PaginationParams,
  FilterParams,
} from "@/src/types/api.types";

// Project member interface
interface ProjectMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Project interface
interface Project {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  workspace: {
    _id: string;
    name: string;
    slug: string;
  };
  status: string;
  priority: string;
  members: ProjectMember[];
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  progress: number;
  createdBy: ProjectMember;
  stats?: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionPercentage: number;
    totalEffort: number;
    completedEffort: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Create project data interface
interface CreateProjectData {
  name: string;
  description?: string;
  workspaceId: string;
  members?: string[];
  dueDate?: string;
  priority?: string;
}

// Update project data interface
interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: string;
  members?: string[];
  dueDate?: string;
  priority?: string;
}

// Projects response interface
interface ProjectsResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const projectApi = createApi({
  reducerPath: "projectApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/projects",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Project", "WorkspaceProjects"],
  endpoints: (builder) => ({
    // Get user projects
    getUserProjects: builder.query<ProjectsResponse, PaginationParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.sortBy) searchParams.append("sortBy", params.sortBy);
        if (params.sortOrder)
          searchParams.append("sortOrder", params.sortOrder);

        return `?${searchParams.toString()}`;
      },
      providesTags: ["Project"],
      transformResponse: (response: ApiResponse<ProjectsResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch projects");
      },
    }),

    // Get workspace projects
    getWorkspaceProjects: builder.query<
      ProjectsResponse,
      {
        workspaceId: string;
        pagination?: PaginationParams;
        filters?: FilterParams;
      }
    >({
      query: ({ workspaceId, pagination = {}, filters = {} }) => {
        const searchParams = new URLSearchParams();
        if (pagination.page)
          searchParams.append("page", pagination.page.toString());
        if (pagination.limit)
          searchParams.append("limit", pagination.limit.toString());
        if (pagination.sortBy) searchParams.append("sortBy", pagination.sortBy);
        if (pagination.sortOrder)
          searchParams.append("sortOrder", pagination.sortOrder);
        if (filters.search) searchParams.append("search", filters.search);
        if (filters.status) searchParams.append("status", filters.status);
        if (filters.priority) searchParams.append("priority", filters.priority);

        return `/workspaces/${workspaceId}?${searchParams.toString()}`;
      },
      providesTags: (result, error, { workspaceId }) => [
        { type: "WorkspaceProjects", id: workspaceId },
      ],
      transformResponse: (response: ApiResponse<ProjectsResponse>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(
          response.message || "Failed to fetch workspace projects"
        );
      },
    }),

    // Get project by ID
    getProjectById: builder.query<Project, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: "Project", id }],
      transformResponse: (response: ApiResponse<Project>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch project");
      },
    }),

    // Create project
    createProject: builder.mutation<Project, CreateProjectData>({
      query: (data) => ({
        url: "",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { workspaceId }) => [
        "Project",
        { type: "WorkspaceProjects", id: workspaceId },
      ],
      transformResponse: (response: ApiResponse<Project>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to create project");
      },
    }),

    // Update project
    updateProject: builder.mutation<
      Project,
      { id: string; data: UpdateProjectData }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Project", id },
        "Project",
        { type: "WorkspaceProjects", id: "LIST" },
      ],
      transformResponse: (response: ApiResponse<Project>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to update project");
      },
    }),

    // Delete project
    deleteProject: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Project", id },
        "Project",
        { type: "WorkspaceProjects", id: "LIST" },
      ],
      transformResponse: (response: ApiResponse<{ message: string }>) => {
        if (response.success) {
          return response.data || { message: "Project deleted successfully" };
        }
        throw new Error(response.message || "Failed to delete project");
      },
    }),

    // Archive project
    archiveProject: builder.mutation<Project, string>({
      query: (id) => ({
        url: `/${id}/archive`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Project", id },
        "Project",
        { type: "WorkspaceProjects", id: "LIST" },
      ],
      transformResponse: (response: ApiResponse<Project>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to archive project");
      },
    }),

    // Get project settings
    getProjectSettings: builder.query<Project, string>({
      query: (id) => `/${id}/settings`,
      providesTags: (result, error, id) => [{ type: "Project", id }],
      transformResponse: (response: ApiResponse<Project>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch project settings");
      },
    }),

    // Update project settings
    updateProjectSettings: builder.mutation<
      Project,
      { id: string; data: Partial<UpdateProjectData> }
    >({
      query: ({ id, data }) => ({
        url: `/${id}/settings`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Project", id },
        "Project",
        { type: "WorkspaceProjects", id: "LIST" },
      ],
      transformResponse: (response: ApiResponse<Project>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(
          response.message || "Failed to update project settings"
        );
      },
    }),

    // Get project members
    getProjectMembers: builder.query<
      {
        members: ProjectMember[];
        createdBy: ProjectMember;
        totalMembers: number;
      },
      string
    >({
      query: (id) => `/${id}/members`,
      providesTags: (result, error, id) => [{ type: "Project", id }],
      transformResponse: (response: ApiResponse<any>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to fetch project members");
      },
    }),

    // Add project member
    addProjectMember: builder.mutation<
      { message: string; members: ProjectMember[] },
      { id: string; memberId: string }
    >({
      query: ({ id, memberId }) => ({
        url: `/${id}/members`,
        method: "POST",
        body: { memberId },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Project", id }],
      transformResponse: (response: ApiResponse<any>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to add project member");
      },
    }),

    // Remove project member
    removeProjectMember: builder.mutation<
      { message: string; members: ProjectMember[] },
      { id: string; memberId: string }
    >({
      query: ({ id, memberId }) => ({
        url: `/${id}/members?memberId=${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Project", id }],
      transformResponse: (response: ApiResponse<any>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || "Failed to remove project member");
      },
    }),

    // Get project activities
    getProjectActivities: builder.query<
      any[],
      { projectId: string; limit?: number }
    >({
      query: ({ projectId, limit = 20 }) => ({
        url: `/${projectId}/activities?limit=${limit}`,
      }),
      transformResponse: (response: ApiResponse<any[]>) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(
          response.message || "Failed to fetch project activities"
        );
      },
    }),
  }),
});

export const {
  useGetUserProjectsQuery,
  useGetWorkspaceProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useArchiveProjectMutation,
  useGetProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  useGetProjectActivitiesQuery,
} = projectApi;

// Export types
export type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectsResponse,
  ProjectMember,
};
