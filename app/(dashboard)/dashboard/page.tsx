"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  ListTodo,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Target,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Calendar,
  Clock,
  Circle,
  Play,
  Pause,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  useGetTasksQuery,
  useGetOverdueTasksQuery,
} from "@/src/store/api/taskApi";
import { useGetWorkspacesQuery } from "@/src/store/api/workspaceApi";
import { useGetUserProjectsQuery } from "@/src/store/api/projectApi";
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum";
import { formatDistanceToNow } from "date-fns";

// Component Interfaces
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  color: "blue" | "green" | "red" | "purple";
}

interface TaskCardProps {
  task: any;
  detailed?: boolean;
}

interface ProjectCardProps {
  project: any;
}

interface WorkspaceCardProps {
  workspace: any;
}

// StatsCard Component
function StatsCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  color,
}: StatsCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "text-blue-600 bg-blue-100";
      case "green":
        return "text-green-600 bg-green-100";
      case "red":
        return "text-red-600 bg-red-100";
      case "purple":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-green-600" />;
      case "down":
        return <TrendingDown className="w-3 h-3 text-red-600" />;
      default:
        return <Target className="w-3 h-3 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${getColorClasses(color)}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {getTrendIcon()}
          <p className="text-xs text-muted-foreground">{trendValue}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// TaskCard Component
function TaskCard({ task, detailed = false }: TaskCardProps) {
  const getStatusIcon = (status: string) => {
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

  const getPriorityColor = (priority: string) => {
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

  const getStatusColor = (status: string) => {
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-2">
              {getStatusIcon(task.status)}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {task.title}
                </h3>
                {detailed && task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* Project info for dashboard tasks */}
            {task.project && (
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <FolderOpen className="w-3 h-3" />
                <span>{task.project.name}</span>
                {task.project.workspace?.name && (
                  <>
                    <span>•</span>
                    <span>{task.project.workspace.name}</span>
                  </>
                )}
              </div>
            )}

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
                  {task.estimatedHours}h
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task.assignedTo && (
              <Avatar className="w-6 h-6">
                <AvatarImage src={task.assignedTo.avatar} />
                <AvatarFallback className="text-xs">
                  {task.assignedTo.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/tasks/${task._id}`}>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ProjectCard Component
function ProjectCard({ project }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in_progress":
        return "text-blue-600 bg-blue-100";
      case "on_hold":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Calculate completion rate from actual task data
  const completionRate =
    project.stats?.totalTasks > 0
      ? Math.round(
          (project.stats.completedTasks / project.stats.totalTasks) * 100
        )
      : project.stats?.completionPercentage || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          <Badge variant="secondary" className={getStatusColor(project.status)}>
            {project.status?.replace("_", " ") || "Active"}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {project.stats?.completedTasks || 0} /{" "}
              {project.stats?.totalTasks || 0} tasks
            </span>
            <span>
              {project.workspace?.members?.length ||
                project.members?.length ||
                project.assignedTo?.length ||
                0}{" "}
              members
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex -space-x-2">
            {project.members?.slice(0, 3).map((member: any, index: number) => (
              <Avatar
                key={member._id || index}
                className="w-6 h-6 border-2 border-white"
              >
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="text-xs">
                  {member.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            ))}
            {(project.members?.length || 0) > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                <span className="text-xs text-gray-600">
                  +{project.members.length - 3}
                </span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${project._id}`}>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// WorkspaceCard Component
function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  // Get member count from the members array
  const memberCount =
    workspace.members?.length || workspace.stats?.activeMembers || 0;

  // Get project count from stats (totalProjects)
  const projectCount = workspace.stats?.totalProjects || 0;

  // Get task count from stats (totalTasks)
  const taskCount = workspace.stats?.totalTasks || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {workspace.name}
            </h3>
            {workspace.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {workspace.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">{projectCount}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Members</span>
            <span className="font-medium">{memberCount}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Projects</span>
            <span className="font-medium">{projectCount}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tasks</span>
            <span className="font-medium">{taskCount}</span>
          </div>

          {/* Calculate and show completion rate */}
          {(() => {
            const completionRate =
              workspace.stats?.totalTasks > 0
                ? Math.round(
                    (workspace.stats.completedTasks /
                      workspace.stats.totalTasks) *
                      100
                  )
                : workspace.stats?.completionRate || 0;

            return completionRate > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium text-green-600">
                  {completionRate}%
                </span>
              </div>
            ) : null;
          })()}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex -space-x-2">
            {workspace.members && workspace.members.length > 0 ? (
              <>
                {workspace.members
                  .slice(0, 3)
                  .map((member: any, index: number) => {
                    // Handle both populated and non-populated member data
                    const user = member.user || member;
                    const userName = user.name || user.username || "User";
                    const userAvatar =
                      user.avatar || user.profileImage || user.image;

                    return (
                      <Avatar
                        key={user._id || user.id || index}
                        className="w-6 h-6 border-2 border-white"
                      >
                        <AvatarImage src={userAvatar} alt={userName} />
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                          {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                {workspace.members.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-gray-600">
                      +{workspace.members.length - 3}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-muted-foreground">No members</div>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/workspaces/${workspace._id}`}>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();

  // Fetch data from APIs - always call hooks in the same order
  const { data: tasksResponse, isLoading: tasksLoading } = useGetTasksQuery({
    page: 1,
    limit: 10,
  });

  const { data: overdueTasksResponse } = useGetOverdueTasksQuery();

  const { data: workspacesResponse, isLoading: workspacesLoading } =
    useGetWorkspacesQuery({
      page: 1,
      limit: 5,
    });

  const { data: projectsResponse, isLoading: projectsLoading } =
    useGetUserProjectsQuery({
      page: 1,
      limit: 6,
    });

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

  // Calculate statistics from real data
  const tasks = tasksResponse?.data?.tasks || [];
  const overdueTasks = overdueTasksResponse?.data || [];
  const workspaces = workspacesResponse?.workspaces || [];
  const projects = projectsResponse?.projects || [];

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === TaskStatus.DONE).length,
    inProgress: tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS)
      .length,
    overdue: overdueTasks.length,
  };

  const completionRate =
    taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name || "User"}! Here's what's happening
            today.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tasks"
          value={taskStats.total}
          icon={<ListTodo className="w-4 h-4" />}
          trend={taskStats.total > 0 ? "up" : "neutral"}
          trendValue="Active tasks"
          color="blue"
        />
        <StatsCard
          title="Completed"
          value={taskStats.completed}
          icon={<CheckCircle className="w-4 h-4" />}
          trend={completionRate > 50 ? "up" : "down"}
          trendValue={`${completionRate}% completion rate`}
          color="green"
        />
        <StatsCard
          title="Overdue"
          value={taskStats.overdue}
          icon={<AlertTriangle className="w-4 h-4" />}
          trend={taskStats.overdue > 0 ? "down" : "up"}
          trendValue={
            taskStats.overdue > 0 ? "Needs attention" : "All caught up!"
          }
          color="red"
        />
        <StatsCard
          title="Workspaces"
          value={workspaces.length}
          icon={<Briefcase className="w-4 h-4" />}
          trend="neutral"
          trendValue="Active workspaces"
          color="purple"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Tasks</CardTitle>
                  <CardDescription>Your latest task activity</CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href="/dashboard/my-tasks">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {tasksLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : tasks.length > 0 ? (
                  tasks
                    .slice(0, 5)
                    .map((task) => <TaskCard key={task._id} task={task} />)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks yet. Create your first task!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Active Projects</CardTitle>
                  <CardDescription>Your current projects</CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href="/dashboard/projects">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : projects.length > 0 ? (
                  projects
                    .slice(0, 4)
                    .map((project) => (
                      <ProjectCard key={project._id} project={project} />
                    ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No projects yet. Create your first project!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Overdue Tasks Alert */}
          {taskStats.overdue > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <CardTitle className="text-red-900">Overdue Tasks</CardTitle>
                </div>
                <CardDescription className="text-red-700">
                  You have {taskStats.overdue} overdue task
                  {taskStats.overdue > 1 ? "s" : ""} that need attention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueTasks.slice(0, 3).map((task) => (
                    <div
                      key={task._id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {task.title}
                        </p>
                        <p className="text-sm text-red-600">
                          Due{" "}
                          {task.dueDate &&
                            formatDistanceToNow(new Date(task.dueDate), {
                              addSuffix: true,
                            })}
                        </p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/dashboard/tasks/${task._id}`}>View</Link>
                      </Button>
                    </div>
                  ))}
                </div>
                {taskStats.overdue > 3 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/my-tasks?status=overdue">
                        View All Overdue Tasks
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Tasks</h2>
            <p className="text-muted-foreground">
              Manage your tasks and track progress
            </p>
          </div>

          <div className="grid gap-4">
            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            ) : tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskCard key={task._id} task={task} detailed />
              ))
            ) : (
              <div className="text-center py-12">
                <ListTodo className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first task to get started
                </p>
                <Button asChild>
                  <Link href="/dashboard/tasks/new">Create Task</Link>
                </Button>
              </div>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/my-tasks">View All Tasks</Link>
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="projects" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Projects</h2>
            <p className="text-muted-foreground">
              Manage your projects and collaborate with teams
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectsLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse" />
              ))
            ) : projects.length > 0 ? (
              projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first project to get started
                </p>
                <Button asChild>
                  <Link href="/dashboard/projects/new">Create Project</Link>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="workspaces" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Workspaces</h2>
            <p className="text-muted-foreground">
              Your collaborative workspaces
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workspacesLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse" />
              ))
            ) : workspaces.length > 0 ? (
              workspaces.map((workspace) => (
                <WorkspaceCard key={workspace._id} workspace={workspace} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  No workspaces yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  You haven't joined any workspaces yet. Ask your team admin to
                  invite you or create a new workspace.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
