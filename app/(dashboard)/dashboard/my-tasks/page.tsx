"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Play,
  Pause,
  X,
  Building,
  FolderOpen,
  User,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useGetTasksQuery } from "@/src/store/api/taskApi";
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum";

export default function MyTasksPage() {
  const { data: session, status } = useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Fetch user's tasks - always call hooks in the same order
  // The getUserTasks endpoint automatically filters by logged-in user
  const {
    data: tasksResponse,
    isLoading,
    error,
  } = useGetTasksQuery(
    {
      page,
      limit: 20,
      status: statusFilter !== "all" ? (statusFilter as TaskStatus) : undefined,
      priority:
        priorityFilter !== "all" ? (priorityFilter as TaskPriority) : undefined,
      search: search || undefined,
    },
    {
      skip: !session?.user?.id, // Skip the query if no user session
    }
  );

  const tasks = tasksResponse?.data?.tasks || [];
  const pagination = tasksResponse?.data?.pagination;

  // Filter and sort tasks locally for better UX
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(search.toLowerCase()) ||
          task.description?.toLowerCase().includes(search.toLowerCase()) ||
          task.project.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort tasks
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "dueDate":
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case "priority":
          const priorityOrder: Record<string, number> = {
            [TaskPriority.HIGH]: 3,
            [TaskPriority.MEDIUM]: 2,
            [TaskPriority.LOW]: 1,
          };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "project":
          aValue = a.project.name.toLowerCase();
          bValue = b.project.name.toLowerCase();
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tasks, search, sortBy, sortOrder]);

  // Handle loading and authentication after hooks
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/login");
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case TaskStatus.IN_PROGRESS:
        return <Play className="w-4 h-4 text-blue-600" />;
      case TaskStatus.IN_REVIEW:
        return <Pause className="w-4 h-4 text-purple-600" />;
      case TaskStatus.BLOCKED:
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return "text-green-600 bg-green-100";
      case TaskStatus.IN_PROGRESS:
        return "text-blue-600 bg-blue-100";
      case TaskStatus.IN_REVIEW:
        return "text-purple-600 bg-purple-100";
      case TaskStatus.BLOCKED:
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "text-red-600 bg-red-100";
      case TaskPriority.MEDIUM:
        return "text-yellow-600 bg-yellow-100";
      case TaskPriority.LOW:
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDueDate = (dueDate: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", color: "text-red-600" };
    if (diffDays === 0) return { text: "Due today", color: "text-orange-600" };
    if (diffDays === 1)
      return { text: "Due tomorrow", color: "text-yellow-600" };
    return { text: `Due in ${diffDays} days`, color: "text-gray-600" };
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          Tasks assigned to you across all projects and workspaces
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Active Filters */}
            {(statusFilter !== "all" || priorityFilter !== "all" || search) && (
              <div className="flex flex-wrap gap-2">
                {search && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    Search: {search}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto ml-1"
                      onClick={() => setSearch("")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    Status: {statusFilter.replace("_", " ")}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto ml-1"
                      onClick={() => setStatusFilter("all")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {priorityFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    Priority: {priorityFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto ml-1"
                      onClick={() => setPriorityFilter("all")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}

            {/* Filter Controls */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks, projects..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Status Filter */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Status</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                        All statuses
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusFilter(TaskStatus.TODO)}
                      >
                        To Do
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusFilter(TaskStatus.IN_PROGRESS)}
                      >
                        In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusFilter(TaskStatus.IN_REVIEW)}
                      >
                        In Review
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusFilter(TaskStatus.DONE)}
                      >
                        Done
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusFilter(TaskStatus.BLOCKED)}
                      >
                        Blocked
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Priority Filter */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Priority</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        onClick={() => setPriorityFilter("all")}
                      >
                        All priorities
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPriorityFilter(TaskPriority.HIGH)}
                      >
                        High
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPriorityFilter(TaskPriority.MEDIUM)}
                      >
                        Medium
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPriorityFilter(TaskPriority.LOW)}
                      >
                        Low
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {sortOrder === "asc" ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                    Sort
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("dueDate");
                      setSortOrder("asc");
                    }}
                  >
                    Due Date (Earliest)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("dueDate");
                      setSortOrder("desc");
                    }}
                  >
                    Due Date (Latest)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("priority");
                      setSortOrder("desc");
                    }}
                  >
                    Priority (High to Low)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("title");
                      setSortOrder("asc");
                    }}
                  >
                    Title (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("project");
                      setSortOrder("asc");
                    }}
                  >
                    Project (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("status");
                      setSortOrder("asc");
                    }}
                  >
                    Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">
                  {filteredAndSortedTasks.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {
                    filteredAndSortedTasks.filter(
                      (t) => t.status === TaskStatus.IN_PROGRESS
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {
                    filteredAndSortedTasks.filter(
                      (t) => t.status === TaskStatus.DONE
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">
                  {
                    filteredAndSortedTasks.filter(
                      (t) =>
                        t.dueDate &&
                        new Date(t.dueDate) < new Date() &&
                        t.status !== TaskStatus.DONE
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Tasks
              </h3>
              <p className="text-muted-foreground">
                There was an error loading your tasks. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : filteredAndSortedTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Circle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
              <p className="text-muted-foreground">
                {search || statusFilter !== "all" || priorityFilter !== "all"
                  ? "No tasks match your current filters. Try adjusting your search criteria."
                  : "You don't have any tasks assigned yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedTasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={!pagination.hasPrev}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2 text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={!pagination.hasNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// TaskCard Component
interface TaskCardProps {
  task: any;
}

function TaskCard({ task }: TaskCardProps) {
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case TaskStatus.IN_PROGRESS:
        return <Play className="w-4 h-4 text-blue-600" />;
      case TaskStatus.IN_REVIEW:
        return <Pause className="w-4 h-4 text-purple-600" />;
      case TaskStatus.BLOCKED:
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return "text-green-600 bg-green-100";
      case TaskStatus.IN_PROGRESS:
        return "text-blue-600 bg-blue-100";
      case TaskStatus.IN_REVIEW:
        return "text-purple-600 bg-purple-100";
      case TaskStatus.BLOCKED:
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "text-red-600 bg-red-100";
      case TaskPriority.MEDIUM:
        return "text-yellow-600 bg-yellow-100";
      case TaskPriority.LOW:
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDueDate = (dueDate: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", color: "text-red-600" };
    if (diffDays === 0) return { text: "Due today", color: "text-orange-600" };
    if (diffDays === 1)
      return { text: "Due tomorrow", color: "text-yellow-600" };
    return { text: `Due in ${diffDays} days`, color: "text-gray-600" };
  };

  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <Link href={`/dashboard/tasks/${task._id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Task Title and Description */}
              <div className="flex items-start gap-3 mb-3">
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Project and Workspace Info */}
              <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  <span>
                    {task.project.workspace?.name || "Unknown Workspace"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  <span>{task.project.name}</span>
                </div>
                {task.assignedTo && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{task.assignedTo.name}</span>
                  </div>
                )}
              </div>

              {/* Badges and Due Date */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className={getStatusColor(task.status)}
                >
                  {task.status.replace("_", " ")}
                </Badge>
                <Badge
                  variant="outline"
                  className={getPriorityColor(task.priority)}
                >
                  {task.priority}
                </Badge>
                {dueDateInfo && (
                  <div
                    className={`text-xs font-medium ${dueDateInfo.color} flex items-center gap-1`}
                  >
                    <Calendar className="w-3 h-3" />
                    {dueDateInfo.text}
                  </div>
                )}
                {task.estimatedHours && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.estimatedHours}h estimated
                  </div>
                )}
              </div>
            </div>

            {/* Assignee Avatar */}
            {task.assignedTo && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={task.assignedTo.avatar} />
                <AvatarFallback className="text-xs">
                  {task.assignedTo.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
