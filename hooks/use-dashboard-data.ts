"use client";

import useSWR from "swr";
import { useEffect } from "react";
import { API_ENDPOINTS, fetcher } from "@/lib/swr-config";

// Dashboard stats hook
export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.DASHBOARD_STATS,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    stats: data?.data || {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      totalProjects: 0,
      activeProjects: 0,
      totalWorkspaces: 0,
    },
    isLoading,
    error,
    mutate,
  };
}

// Dashboard tasks hook
export function useDashboardTasks() {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.DASHBOARD_TASKS,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    tasks: data?.data || [],
    isLoading,
    error,
    mutate,
  };
}

// Dashboard projects hook
export function useDashboardProjects() {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.DASHBOARD_PROJECTS,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true, // Revalidate when window gets focus
      revalidateOnReconnect: true, // Revalidate when reconnecting
    }
  );

  // Listen for task status updates to trigger revalidation
  useEffect(() => {
    const handleTaskStatusUpdate = () => {
      mutate();
    };

    window.addEventListener("task-status-updated", handleTaskStatusUpdate);
    return () => {
      window.removeEventListener("task-status-updated", handleTaskStatusUpdate);
    };
  }, [mutate]);

  return {
    projects: data?.data || [],
    isLoading,
    error,
    mutate,
  };
}

// My tasks hook
export function useMyTasks(params?: {
  status?: string;
  priority?: string;
  project?: string;
  page?: number;
  limit?: number;
}) {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString()
    : "";

  const url = queryString
    ? `${API_ENDPOINTS.MY_TASKS}?${queryString}`
    : API_ENDPOINTS.MY_TASKS;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  return {
    tasks: data?.data?.tasks || [],
    pagination: data?.data?.pagination || null,
    isLoading,
    error,
    mutate,
  };
}

// Task stats hook
export function useTaskStats() {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.TASK_STATS,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true, // Revalidate when window gets focus
      revalidateOnReconnect: true, // Revalidate when reconnecting
    }
  );

  // Listen for task status updates to trigger revalidation
  useEffect(() => {
    const handleTaskStatusUpdate = () => {
      mutate();
    };

    window.addEventListener("task-status-updated", handleTaskStatusUpdate);
    return () => {
      window.removeEventListener("task-status-updated", handleTaskStatusUpdate);
    };
  }, [mutate]);

  return {
    stats: data?.data || {
      total: 0,
      completed: 0,
      inProgress: 0,
      todo: 0,
      overdue: 0,
      dueToday: 0,
      dueTomorrow: 0,
      dueThisWeek: 0,
      totalEffort: 0,
      completedEffort: 0,
      completionRate: 0,
    },
    isLoading,
    error,
    mutate,
  };
}

// User projects hook
export function useUserProjects() {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.USER_PROJECTS,
    fetcher,
    {
      refreshInterval: 6000, // Refresh every minute
    }
  );

  return {
    projects: data?.data || [],
    isLoading,
    error,
    mutate,
  };
}

// User workspaces hook
export function useUserWorkspaces() {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.USER_WORKSPACES,
    fetcher,
    {
      refreshInterval: 6000,
      revalidateOnFocus: true, // Revalidate when window gets focus
      revalidateOnReconnect: true, // Revalidate when reconnecting
    }
  );

  return {
    workspaces: data?.data?.workspaces || [],
    isLoading,
    error,
    mutate,
  };
}

// User profile hook
export function useUserProfile() {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.PROFILE,
    fetcher,
    {
      refreshInterval: 6000, // Refresh every 5 minutes
    }
  );

  return {
    user: data?.data || null,
    isLoading,
    error,
    mutate,
  };
}

// Workspace by ID hook
export function useWorkspaceById(workspaceId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? API_ENDPOINTS.WORKSPACE_BY_ID(workspaceId) : null,
    fetcher,
    {
      refreshInterval: 6000, // Refresh every minute
    }
  );

  return {
    workspace: data?.data || null,
    isLoading,
    error,
    mutate,
  };
}

// Workspace members hook
export function useWorkspaceMembers(workspaceId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? API_ENDPOINTS.WORKSPACE_MEMBERS(workspaceId) : null,
    fetcher,
    {
      refreshInterval: 6000, // Refresh every 2 minutes
    }
  );

  return {
    members: data?.data?.members || [],
    owner: data?.data?.owner || null,
    pendingInvitations: data?.data?.pendingInvitations || [],
    isLoading,
    error,
    mutate,
  };
}

// Chat rooms hook
export function useChatRooms(workspaceId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? API_ENDPOINTS.CHAT_ROOMS(workspaceId) : null,
    fetcher,
    {
      refreshInterval: 6000, // Refresh every 30 seconds
    }
  );

  return {
    rooms: data?.data?.rooms || [],
    isLoading,
    error,
    mutate,
  };
}

// Chat messages hook
export function useChatMessages(roomId: string, page = 1, limit = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    roomId ? API_ENDPOINTS.CHAT_MESSAGES(roomId, page, limit) : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds for real-time feel
      revalidateOnFocus: true,
    }
  );

  return {
    messages: data?.data?.messages || [],
    pagination: data?.data?.pagination || null,
    isLoading,
    error,
    mutate,
  };
}
