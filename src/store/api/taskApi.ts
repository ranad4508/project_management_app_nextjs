import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { ApiResponse, PaginationParams } from "@/src/types/api.types";
import type { CreateTaskData, UpdateTaskData } from "@/src/types/task.types";
import {
  TaskStatus,
  TaskStatusType,
  TaskPriority,
  TaskType,
} from "@/src/enums/task.enum";

// Task interfaces
export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: {
    _id: string;
    name: string;
    workspace: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: TaskStatus;
  statusType: TaskStatusType;
  priority: TaskPriority;
  type: TaskType;
  labels: Label[];
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  activities: TaskActivity[];
  dependencies: string[];
  subtasks: Task[];
  parentTask?: string;
  isCompleted: boolean;
  completionPercentage: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  _id: string;
  name: string;
  color: string;
  description?: string;
  workspace: string;
  project?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TaskComment {
  _id: string;
  content: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivity {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  action: string;
  details?: string;
  createdAt: string;
}

export interface TaskListResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateLabelData {
  name: string;
  color: string;
  description?: string;
  workspaceId: string;
  projectId?: string;
}

export interface UpdateLabelData {
  name?: string;
  color?: string;
  description?: string;
}

export const taskApi = createApi({
  reducerPath: "taskApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { endpoint }) => {
      // Don't set Content-Type for file uploads - let the browser set it automatically
      if (endpoint !== "addTaskAttachment") {
        headers.set("Content-Type", "application/json");
      }
      return headers;
    },
  }),
  tagTypes: ["Task", "Label", "TaskComment", "TaskActivity"],
  endpoints: (builder) => ({
    // Task CRUD operations
    createTask: builder.mutation<ApiResponse<Task>, CreateTaskData>({
      query: (data) => ({
        url: "/tasks",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Task"],
    }),

    getTasks: builder.query<
      ApiResponse<TaskListResponse>,
      PaginationParams & {
        projectId?: string;
        assignedTo?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        search?: string;
      }
    >({
      query: (params) => ({
        url: "/tasks",
        params,
      }),
      providesTags: ["Task"],
    }),

    getMyTasks: builder.query<
      ApiResponse<TaskListResponse>,
      PaginationParams & {
        status?: TaskStatus;
        priority?: TaskPriority;
        search?: string;
      }
    >({
      query: (params) => ({
        url: "/tasks/my-tasks",
        params,
      }),
      providesTags: ["Task"],
    }),

    getTaskById: builder.query<ApiResponse<Task>, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Task", id }],
    }),

    updateTask: builder.mutation<
      ApiResponse<Task>,
      { id: string; data: UpdateTaskData }
    >({
      query: ({ id, data }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Task", id },
        "Task",
      ],
      // Optimistic updates for checkbox functionality
      onQueryStarted: async ({ id, data }, { dispatch, queryFulfilled }) => {
        if (data.isCompleted !== undefined || data.status !== undefined) {
          const patchResult = dispatch(
            taskApi.util.updateQueryData("getTaskById", id, (draft) => {
              if (draft.success && draft.data) {
                if (data.isCompleted !== undefined) {
                  draft.data.isCompleted = data.isCompleted;
                  draft.data.completionPercentage = data.isCompleted ? 100 : 0;
                  draft.data.status = data.isCompleted
                    ? TaskStatus.DONE
                    : TaskStatus.TODO;
                }
                if (data.status !== undefined) {
                  draft.data.status = data.status;
                  draft.data.isCompleted = data.status === TaskStatus.DONE;
                  draft.data.completionPercentage =
                    data.status === TaskStatus.DONE ? 100 : 0;
                }
              }
            })
          );

          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
    }),

    deleteTask: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Task"],
    }),

    getProjectTasks: builder.query<
      ApiResponse<TaskListResponse>,
      {
        projectId: string;
        search?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        assignedTo?: string;
        labels?: string[];
      } & PaginationParams
    >({
      query: ({ projectId, labels, ...params }) => {
        // Convert labels array to comma-separated string for URL
        const finalParams = {
          ...params,
          ...(labels && labels.length > 0 && { labels: labels.join(",") }),
        };
        return {
          url: `/projects/${projectId}/tasks`,
          params: finalParams,
        };
      },
      providesTags: ["Task"],
    }),

    // Task Comments
    addTaskComment: builder.mutation<
      ApiResponse<TaskComment>,
      {
        taskId: string;
        content: string;
      }
    >({
      query: ({ taskId, content }) => ({
        url: `/tasks/${taskId}/comments`,
        method: "POST",
        body: { content },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Task", id: taskId },
      ],
    }),

    // Task Attachments
    addTaskAttachment: builder.mutation<
      ApiResponse<TaskAttachment>,
      {
        taskId: string;
        file: File;
      }
    >({
      query: ({ taskId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/tasks/${taskId}/attachments`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Task", id: taskId },
      ],
    }),

    getTaskAttachments: builder.query<ApiResponse<TaskAttachment[]>, string>({
      query: (taskId) => `/tasks/${taskId}/attachments`,
      providesTags: (_result, _error, taskId) => [{ type: "Task", id: taskId }],
    }),

    deleteTaskAttachment: builder.mutation<
      ApiResponse<{ message: string }>,
      { taskId: string; attachmentId: string }
    >({
      query: ({ taskId, attachmentId }) => ({
        url: `/tasks/${taskId}/attachments/${attachmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Task", id: taskId },
      ],
    }),

    // Task Activities
    getTaskActivities: builder.query<ApiResponse<TaskActivity[]>, string>({
      query: (taskId) => `/tasks/${taskId}/activities`,
      providesTags: (_result, _error, taskId) => [
        { type: "TaskActivity", id: taskId },
      ],
    }),

    // Label management
    createLabel: builder.mutation<ApiResponse<Label>, CreateLabelData>({
      query: (data) => ({
        url: "/labels",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Label"],
    }),

    getWorkspaceLabels: builder.query<
      ApiResponse<{
        labels: Label[];
        pagination: any;
      }>,
      {
        workspaceId: string;
        projectId?: string;
      } & PaginationParams
    >({
      query: ({ workspaceId, ...params }) => ({
        url: `/workspaces/${workspaceId}/labels`,
        params,
      }),
      providesTags: ["Label"],
    }),

    updateLabel: builder.mutation<
      ApiResponse<Label>,
      {
        id: string;
        data: UpdateLabelData;
      }
    >({
      query: ({ id, data }) => ({
        url: `/labels/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Label"],
    }),

    deleteLabel: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/labels/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Label"],
    }),

    // Task Statistics
    getTaskStats: builder.query<
      ApiResponse<{
        total: number;
        completed: number;
        inProgress: number;
        overdue: number;
        byStatus: Record<TaskStatus, number>;
        byPriority: Record<TaskPriority, number>;
      }>,
      string
    >({
      query: (projectId) => `/projects/${projectId}/tasks/stats`,
      providesTags: ["Task"],
    }),

    // Overdue tasks
    getOverdueTasks: builder.query<ApiResponse<Task[]>, void>({
      query: () => "/tasks/overdue",
      providesTags: ["Task"],
    }),

    // Get task comments
    getTaskComments: builder.query<
      ApiResponse<{ comments: TaskComment[] }>,
      { taskId: string }
    >({
      query: ({ taskId }) => `/tasks/${taskId}/comments`,
      providesTags: (_result, _error, { taskId }) => [
        { type: "Task", id: taskId },
      ],
    }),

    // Update task comment
    updateTaskComment: builder.mutation<
      ApiResponse<TaskComment>,
      { taskId: string; commentId: string; content: string }
    >({
      query: ({ taskId, commentId, content }) => ({
        url: `/tasks/${taskId}/comments/${commentId}`,
        method: "PUT",
        body: { content },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Task", id: taskId },
      ],
    }),

    // Delete task comment
    deleteTaskComment: builder.mutation<
      ApiResponse<void>,
      { taskId: string; commentId: string }
    >({
      query: ({ taskId, commentId }) => ({
        url: `/tasks/${taskId}/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Task", id: taskId },
      ],
    }),
  }),
});

export const {
  useCreateTaskMutation,
  useGetTasksQuery,
  useGetMyTasksQuery,
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useGetProjectTasksQuery,
  useAddTaskCommentMutation,
  useGetTaskCommentsQuery,
  useUpdateTaskCommentMutation,
  useDeleteTaskCommentMutation,
  useAddTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
  useGetTaskAttachmentsQuery,
  useGetTaskActivitiesQuery,
  useCreateLabelMutation,
  useGetWorkspaceLabelsQuery,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
  useGetTaskStatsQuery,
  useGetOverdueTasksQuery,
} = taskApi;
