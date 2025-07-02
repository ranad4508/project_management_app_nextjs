"use client";

import { useEffect } from "react";
import { useSocket } from "@/contexts/socket-context";
import { toast } from "react-hot-toast";
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  notificationApi,
} from "@/src/store/api/notificationApi";
import { useDispatch } from "react-redux";
import { NotificationType } from "@/src/enums/notification.enum";
import { mutate } from "swr";
import { API_ENDPOINTS } from "@/lib/swr-config";

const getNotificationToastIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_UPDATED:
    case NotificationType.TASK_COMPLETED:
      return "📋";
    case NotificationType.PROJECT_CREATED:
    case NotificationType.PROJECT_UPDATED:
      return "📁";
    case NotificationType.WORKSPACE_CREATED:
    case NotificationType.WORKSPACE_UPDATED:
      return "🏢";
    case NotificationType.COMMENT_ADDED:
      return "💬";
    case NotificationType.MENTION:
      return "👤";
    case NotificationType.DUE_DATE_REMINDER:
      return "⏰";
    case NotificationType.INVITATION:
      return "📧";
    default:
      return "🔔";
  }
};

export function useNotifications() {
  const { socket, isConnected } = useSocket();
  const dispatch = useDispatch();

  // Queries for notifications
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery({
    page: 1,
    limit: 20,
  });

  const {
    data: unreadCountData,
    isLoading: unreadCountLoading,
    refetch: refetchUnreadCount,
  } = useGetUnreadCountQuery();

  const notifications = notificationsData?.data?.notifications || [];
  const unreadCount = unreadCountData?.data?.count || 0;

  // Socket event handlers for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle new notifications
    const handleNewNotification = (notification: any) => {
      console.log("New notification received:", notification);

      // Show toast notification
      toast.success(
        `${getNotificationToastIcon(notification.type)} ${
          notification.title
        }: ${notification.message}`,
        {
          duration: 5000,
        }
      );

      // Invalidate and refetch notification data
      dispatch(
        notificationApi.util.invalidateTags([
          "Notification",
          "UnreadCount",
          "Activity",
        ])
      );

      // Also invalidate SWR cache for dashboard activities
      mutate(API_ENDPOINTS.DASHBOARD_ACTIVITIES);

      // Refetch queries
      refetchNotifications();
      refetchUnreadCount();
    };

    // Handle notification read
    const handleNotificationRead = (data: {
      notificationId: string;
      userId: string;
    }) => {
      console.log("Notification marked as read:", data);

      // Invalidate cache
      dispatch(
        notificationApi.util.invalidateTags(["Notification", "UnreadCount"])
      );
      refetchNotifications();
      refetchUnreadCount();
    };

    // Handle all notifications read
    const handleAllNotificationsRead = (data: { userId: string }) => {
      console.log("All notifications marked as read:", data);

      // Invalidate cache
      dispatch(
        notificationApi.util.invalidateTags(["Notification", "UnreadCount"])
      );
      refetchNotifications();
      refetchUnreadCount();

      toast.success("All notifications marked as read");
    };

    // Handle notification deleted
    const handleNotificationDeleted = (data: {
      notificationId: string;
      userId: string;
    }) => {
      console.log("Notification deleted:", data);

      // Invalidate cache
      dispatch(
        notificationApi.util.invalidateTags(["Notification", "UnreadCount"])
      );
      refetchNotifications();
      refetchUnreadCount();
    };

    // Handle new activity
    const handleNewActivity = (activity: any) => {
      console.log("New activity:", activity);

      // Invalidate activity cache
      dispatch(notificationApi.util.invalidateTags(["Activity"]));
      mutate(API_ENDPOINTS.DASHBOARD_ACTIVITIES);
    };

    // Register socket event listeners
    socket.on("notification:new", handleNewNotification);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:all_read", handleAllNotificationsRead);
    socket.on("notification:deleted", handleNotificationDeleted);
    socket.on("activity:new", handleNewActivity);

    // Cleanup
    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:all_read", handleAllNotificationsRead);
      socket.off("notification:deleted", handleNotificationDeleted);
      socket.off("activity:new", handleNewActivity);
    };
  }, [socket, isConnected, dispatch, refetchNotifications, refetchUnreadCount]);

  // Utility functions
  const refetchAll = () => {
    refetchNotifications();
    refetchUnreadCount();
  };

  const markAsReadLocally = (notificationId: string) => {
    // For now, just refetch the data
    refetchNotifications();
    refetchUnreadCount();
  };

  const deleteLocally = (notificationId: string) => {
    // For now, just refetch the data
    refetchNotifications();
    refetchUnreadCount();
  };

  return {
    notifications,
    unreadCount,
    isLoading: notificationsLoading || unreadCountLoading,
    refetchAll,
    markAsReadLocally,
    deleteLocally,
  };
}

// Hook for just unread count (lighter weight)
export function useUnreadNotificationCount() {
  const { socket, isConnected } = useSocket();
  const dispatch = useDispatch();

  const {
    data: unreadCountData,
    isLoading,
    refetch,
  } = useGetUnreadCountQuery();

  const unreadCount = unreadCountData?.data?.count || 0;

  // Socket integration for real-time unread count updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCountUpdate = () => {
      // Invalidate cache and refetch
      dispatch(notificationApi.util.invalidateTags(["UnreadCount"]));
      refetch();
    };

    // Listen to events that affect unread count
    socket.on("notification:new", handleCountUpdate);
    socket.on("notification:read", handleCountUpdate);
    socket.on("notification:all_read", handleCountUpdate);
    socket.on("notification:deleted", handleCountUpdate);

    return () => {
      socket.off("notification:new", handleCountUpdate);
      socket.off("notification:read", handleCountUpdate);
      socket.off("notification:all_read", handleCountUpdate);
      socket.off("notification:deleted", handleCountUpdate);
    };
  }, [socket, isConnected, dispatch, refetch]);

  return {
    unreadCount,
    isLoading,
    refetch,
  };
}
