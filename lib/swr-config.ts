import { SWRConfiguration } from "swr";

// Base fetcher function
export const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies for authentication
  });

  if (!response.ok) {
    let errorInfo;
    try {
      errorInfo = await response.json();
    } catch {
      errorInfo = { message: response.statusText };
    }

    const error = new Error(
      `HTTP ${response.status}: ${errorInfo.message || response.statusText}`
    );
    // Attach extra info to the error object
    (error as any).info = errorInfo;
    (error as any).status = response.status;
    console.error(`SWR Fetch error for ${url}:`, error);
    throw error;
  }

  return response.json();
};

// SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 30000, // Refresh every 30 seconds
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  onError: (error) => {
    console.error("SWR Error:", error);
    // add toast notifications here if needed
  },
};

// API endpoints
export const API_ENDPOINTS = {
  // Dashboard
  DASHBOARD_STATS: "/api/dashboard/stats",
  DASHBOARD_TASKS: "/api/dashboard/tasks",
  DASHBOARD_PROJECTS: "/api/dashboard/projects",

  // Tasks
  MY_TASKS: "/api/tasks/my-tasks",
  TASKS: "/api/tasks",
  TASK_STATS: "/api/tasks/stats",

  // Projects
  PROJECTS: "/api/projects",
  USER_PROJECTS: "/api/projects/user",

  // Workspaces
  WORKSPACES: "/api/workspaces",
  USER_WORKSPACES: "/api/workspaces?limit=50",
  WORKSPACE_BY_ID: (id: string) => `/api/workspaces/${id}`,
  WORKSPACE_MEMBERS: (id: string) => `/api/workspaces/${id}/members`,

  // Chat
  CHAT_ROOMS: (workspaceId: string) => `/api/workspaces/${workspaceId}/chat`,
  CHAT_MESSAGES: (roomId: string, page = 1, limit = 50) =>
    `/api/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`,

  // Notifications
  NOTIFICATIONS: "/api/notifications",
  UNREAD_COUNT: "/api/notifications/unread-count",
  DASHBOARD_ACTIVITIES: "/api/dashboard/activities",

  // Users
  PROFILE: "/api/user/profile",
  USERS: "/api/users",
} as const;
