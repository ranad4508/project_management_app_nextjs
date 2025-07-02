import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { ApiResponse, PaginationParams } from "@/src/types/api.types";
import {
  NotificationType,
  NotificationStatus,
} from "@/src/enums/notification.enum";

export interface Notification {
  _id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedTo?: {
    model: "Task" | "Project" | "Workspace" | "Chat" | "User" | "Issue";
    id: string;
  };
  status: NotificationStatus;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DashboardActivity {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedTo?: {
    model: string;
    id: {
      _id: string;
      name?: string;
      title?: string;
    };
  };
  createdAt: string;
}

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Notification", "UnreadCount", "Activity"],
  endpoints: (builder) => ({
    // Get user notifications
    getNotifications: builder.query<
      ApiResponse<NotificationListResponse>,
      PaginationParams & {
        status?: NotificationStatus;
        type?: NotificationType;
      }
    >({
      query: (
        params: PaginationParams & {
          status?: NotificationStatus;
          type?: NotificationType;
        }
      ) => ({
        url: "/notifications",
        params,
      }),
      providesTags: ["Notification"],
    }),

    // Get unread notification count
    getUnreadCount: builder.query<ApiResponse<{ count: number }>, void>({
      query: () => "/notifications/unread-count",
      providesTags: ["UnreadCount"],
    }),

    // Mark notification as read
    markAsRead: builder.mutation<ApiResponse<Notification>, string>({
      query: (id: string) => ({
        url: `/notifications/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["Notification", "UnreadCount"],
    }),

    // Mark all notifications as read
    markAllAsRead: builder.mutation<ApiResponse<{ message: string }>, void>({
      query: () => ({
        url: "/notifications/mark-all-read",
        method: "PUT",
      }),
      invalidatesTags: ["Notification", "UnreadCount"],
    }),

    // Delete notification
    deleteNotification: builder.mutation<
      ApiResponse<{ message: string }>,
      string
    >({
      query: (id: string) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notification", "UnreadCount"],
    }),

    // Get dashboard activities
    getDashboardActivities: builder.query<
      ApiResponse<DashboardActivity[]>,
      { limit?: number }
    >({
      query: (params: { limit?: number }) => ({
        url: "/dashboard/activities",
        params,
      }),
      providesTags: ["Activity"],
    }),

    // Create notification (for testing/admin)
    createNotification: builder.mutation<
      ApiResponse<Notification>,
      {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        relatedTo?: {
          model: string;
          id: string;
        };
      }
    >({
      query: (data: {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        relatedTo?: {
          model: string;
          id: string;
        };
      }) => ({
        url: "/notifications",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Notification", "UnreadCount", "Activity"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useGetDashboardActivitiesQuery,
  useCreateNotificationMutation,
} = notificationApi;
