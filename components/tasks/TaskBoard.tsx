"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Users, Calendar, Tag } from "lucide-react";
import { useGetProjectTasksQuery } from "@/src/store/api/taskApi";
import { TaskList } from "./TaskList";
import { TaskFilters } from "./TaskFilters";
import { TaskSort } from "./TaskSort";
import { CreateTaskDialog } from "./dialogs/CreateTaskDialog";

import type {
  Task,
  TaskFilters as ITaskFilters,
  TaskSort as ITaskSort,
} from "./types";
import { TaskStatus } from "@/src/enums/task.enum";

interface TaskBoardProps {
  projectId: string;
  projectName: string;
  workspaceId: string;
}

const initialFilters: ITaskFilters = {};
const initialSort: ITaskSort = {
  field: "createdAt",
  direction: "desc",
};

export function TaskBoard({
  projectId,
  projectName,
  workspaceId,
}: TaskBoardProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ITaskFilters>(initialFilters);
  const [sort, setSort] = useState<ITaskSort>(initialSort);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [page] = useState(1);

  const queryParams = useMemo(
    () => ({
      projectId,
      ...filters,
      page,
      limit: 50,
      sortBy: sort.field,
      sortOrder: sort.direction,
    }),
    [projectId, filters, page, sort.field, sort.direction]
  );

  const {
    data: tasksResponse,
    isLoading,
    error,
    refetch,
  } = useGetProjectTasksQuery(queryParams, {
    skip: !projectId,
    refetchOnMountOrArgChange: false,
    pollingInterval: 0,
  });

  const tasks = tasksResponse?.data?.tasks || [];
  const pagination = tasksResponse?.data?.pagination;

  // Calculate project statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (task) => task.status === TaskStatus.DONE
    ).length;
    const inProgress = tasks.filter(
      (task) => task.status === TaskStatus.IN_PROGRESS
    ).length;
    const todo = tasks.filter((task) => task.status === TaskStatus.TODO).length;
    const blocked = tasks.filter(
      (task) => task.status === TaskStatus.BLOCKED
    ).length;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, todo, blocked, progress };
  }, [tasks]);

  const handleTaskClick = useCallback(
    (task: Task) => {
      router.push(`/dashboard/tasks/${task._id}`);
    },
    [router]
  );

  const handleTaskEdit = useCallback(
    (task: Task) => {
      router.push(`/dashboard/tasks/${task._id}?edit=true`);
    },
    [router]
  );

  const handleTaskUpdate = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{projectName}</h1>
          <p className="text-gray-600 mt-1">
            Manage your project tasks and track progress
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                {stats.total > 0
                  ? Math.round((stats.completed / stats.total) * 100)
                  : 0}
                %
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.inProgress}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">To Do</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.todo}
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Tag className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.blocked}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <Tag className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Project Progress
            </h3>
            <span className="text-sm font-medium text-gray-600">
              {stats.progress}% Complete
            </span>
          </div>
          <Progress value={stats.progress} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{stats.completed} completed</span>
            <span>{stats.total - stats.completed} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-blue-50 border-blue-200" : ""}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>

          <TaskSort sort={sort} onSortChange={setSort} />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {pagination?.total || 0} tasks
          </span>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <TaskFilters
          filters={filters}
          onFiltersChange={setFilters}
          workspaceId={workspaceId}
          projectId={projectId}
        />
      )}

      {/* Task List */}
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        onTaskClick={handleTaskClick}
        onTaskUpdate={handleTaskUpdate}
        onTaskEdit={handleTaskEdit}
        projectId={projectId}
      />

      {/* Dialogs */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId}
        workspaceId={workspaceId}
        onTaskCreated={handleTaskUpdate}
      />
    </div>
  );
}
