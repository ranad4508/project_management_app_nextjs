"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Flag,
  Tag,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  MoreHorizontal,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import {
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCreateTaskMutation,
} from "@/src/store/api/taskApi";
import { useGetWorkspaceMembersQuery } from "@/src/store/api/workspaceApi";
import { useGetProjectActivitiesQuery } from "@/src/store/api/projectApi";
import { useGetWorkspaceLabelsQuery } from "@/src/store/api/labelApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  TaskStatus,
  TaskStatusType,
  TaskPriority,
  TaskType,
} from "@/src/enums/task.enum";
import { TaskComments } from "@/components/tasks/sections/TaskComments";
import { TaskAttachments } from "@/components/tasks/sections/TaskAttachments";
import { TaskSubtasks } from "@/components/tasks/sections/TaskSubtasks";
import { ProjectActivityFeed } from "@/components/projects/ProjectActivityFeed";
import { LabelManager } from "@/components/labels/LabelManager";
import {
  getStatusConfig,
  getPriorityConfig,
  getStatusTypeConfig,
  validateTaskDates,
  getTaskProgress,
} from "@/src/utils/taskStatus";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

const editTaskSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  type: z.nativeEnum(TaskType).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.date().optional(),
  estimatedHours: z.number().min(0).optional(),
  labels: z.array(z.string()).optional(),
});

type EditTaskForm = z.infer<typeof editTaskSchema>;

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const taskId = params.id as string;

  const [isEditing, setIsEditing] = useState(
    searchParams.get("edit") === "true"
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const {
    data: taskResponse,
    isLoading,
    error,
    refetch,
  } = useGetTaskByIdQuery(taskId);

  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [createTask, { isLoading: isDuplicating }] = useCreateTaskMutation();

  const task = taskResponse?.data;

  const { data: membersData } = useGetWorkspaceMembersQuery(
    task?.project?.workspace || "",
    { skip: !task?.project?.workspace }
  );

  const members = membersData?.members || [];

  // Get labels for editing
  const { data: labelsResponse } = useGetWorkspaceLabelsQuery(
    {
      workspaceId: task?.project?.workspace || "",
      project: task?.project?._id,
      page: 1,
      limit: 100,
    },
    { skip: !task?.project?.workspace }
  );

  const labels = labelsResponse?.data?.labels || [];

  // Get project activities for the activity feed
  const { data: projectActivities, isLoading: activitiesLoading } =
    useGetProjectActivitiesQuery(
      {
        projectId: task?.project?._id || "",
        limit: 20,
      },
      { skip: !task?.project?._id }
    );

  // Form setup for editing
  const form = useForm<EditTaskForm>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || TaskStatus.TODO,
      priority: task?.priority || TaskPriority.MEDIUM,
      type: task?.type || TaskType.TASK,
      assignedTo: task?.assignedTo?._id || "unassigned",
      dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
      estimatedHours: task?.estimatedHours || 0,
      labels: task?.labels?.map((l: any) => l._id) || [],
    },
  });

  // Update form when task data changes
  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        type: task.type,
        assignedTo: task.assignedTo?._id || "unassigned",
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        estimatedHours: task.estimatedHours || 0,
        labels: task.labels?.map((l: any) => l._id) || [],
      });
    }
  }, [task, form]);

  const handleUpdateField = async (field: string, value: any) => {
    try {
      // Validate dates if updating date fields
      if (field === "startDate" || field === "dueDate") {
        const startDate =
          field === "startDate"
            ? new Date(value)
            : task?.startDate
            ? new Date(task.startDate)
            : undefined;
        const dueDate =
          field === "dueDate"
            ? new Date(value)
            : task?.dueDate
            ? new Date(task.dueDate)
            : undefined;

        const errors = validateTaskDates(startDate, dueDate);
        if (errors.length > 0) {
          toast.error(errors[0]);
          return;
        }
      }

      // Prevent assignment if task is completed
      if (
        field === "assignedTo" &&
        value &&
        value !== "unassigned" &&
        (task?.status === TaskStatus.DONE || task?.isCompleted)
      ) {
        toast.error("Cannot assign completed tasks to members");
        return;
      }

      await updateTask({
        id: taskId,
        data: { [field]: value },
      }).unwrap();

      toast.success(
        `Task ${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()} updated successfully`
      );
      refetch();
    } catch (error) {
      toast.error(
        `Failed to update task ${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()}`
      );
    }
  };

  const handleCheckboxChange = async (checked: boolean) => {
    try {
      await updateTask({
        id: taskId,
        data: {
          isCompleted: checked,
          status: checked ? TaskStatus.DONE : TaskStatus.TODO,
          completionPercentage: checked ? 100 : 0,
        },
      }).unwrap();

      toast.success(checked ? "Task completed" : "Task reopened");
      refetch();
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async () => {
    try {
      await deleteTask(taskId).unwrap();
      toast.success("Task deleted successfully");
      setShowDeleteDialog(false);
      router.back();
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleEditSubmit = async (data: EditTaskForm) => {
    try {
      await updateTask({
        id: taskId,
        data: {
          ...data,
          assignedTo:
            data.assignedTo === "unassigned" ? undefined : data.assignedTo,
          dueDate: data.dueDate,
        },
      }).unwrap();

      setIsEditing(false);
      toast.success("Task updated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDuplicateTask = async () => {
    if (!task) return;

    try {
      // Create a new task with the same data but different title
      const duplicateData = {
        title: `${task.title} (Copy)`,
        description: task.description,
        projectId: task.project._id,
        status: TaskStatus.TODO,
        priority: task.priority,
        type: task.type,
        estimatedHours: task.estimatedHours,
        labels: task.labels?.map((l: any) => l._id) || [],
      };

      const result = await createTask(duplicateData).unwrap();
      toast.success("Task duplicated successfully");
      if (result.data?._id) {
        router.push(`/dashboard/tasks/${result.data._id}`);
      }
    } catch (error) {
      console.error("Failed to duplicate task:", error);
      toast.error("Failed to duplicate task");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Task Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The task you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={task.isCompleted}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(checked as boolean)
                }
                className="w-5 h-5"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {task.title}
                </h1>
                <p className="text-gray-600">
                  in{" "}
                  <Link
                    href={`/dashboard/projects/${task.project._id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {task.project.name}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDuplicateTask}
                disabled={isDuplicating}
              >
                <Copy className="w-4 h-4 mr-2" />
                {isDuplicating ? "Duplicating..." : "Duplicate Task"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details / Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isEditing ? "Edit Task" : "Task Details"}
                </CardTitle>
                {isEditing && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={form.handleSubmit(handleEditSubmit)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleEditSubmit)}
                      className="space-y-4"
                    >
                      {/* Title */}
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Description */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Status, Priority, Type in a row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white">
                                  <SelectItem
                                    value={TaskStatus.TODO}
                                    className="text-gray-900"
                                  >
                                    To Do
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskStatus.IN_PROGRESS}
                                    className="text-gray-900"
                                  >
                                    In Progress
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskStatus.IN_REVIEW}
                                    className="text-gray-900"
                                  >
                                    In Review
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskStatus.DONE}
                                    className="text-gray-900"
                                  >
                                    Done
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskStatus.CANCELLED}
                                    className="text-gray-900"
                                  >
                                    Cancelled
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskStatus.BLOCKED}
                                    className="text-gray-900"
                                  >
                                    Blocked
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white">
                                  <SelectItem
                                    value={TaskPriority.NO_PRIORITY}
                                    className="text-gray-900"
                                  >
                                    No Priority
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskPriority.LOW}
                                    className="text-gray-900"
                                  >
                                    Low
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskPriority.MEDIUM}
                                    className="text-gray-900"
                                  >
                                    Medium
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskPriority.HIGH}
                                    className="text-gray-900"
                                  >
                                    High
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskPriority.URGENT}
                                    className="text-gray-900"
                                  >
                                    Urgent
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskPriority.CRITICAL}
                                    className="text-gray-900"
                                  >
                                    Critical
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white">
                                  <SelectItem
                                    value={TaskType.TASK}
                                    className="text-gray-900"
                                  >
                                    Task
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskType.BUG}
                                    className="text-gray-900"
                                  >
                                    Bug
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskType.FEATURE}
                                    className="text-gray-900"
                                  >
                                    Feature
                                  </SelectItem>
                                  <SelectItem
                                    value={TaskType.IMPROVEMENT}
                                    className="text-gray-900"
                                  >
                                    Improvement
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Assignee */}
                      <FormField
                        control={form.control}
                        name="assignedTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignee</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white">
                                <SelectItem
                                  value="unassigned"
                                  className="text-gray-900"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs">
                                      ?
                                    </div>
                                    Unassigned
                                  </div>
                                </SelectItem>
                                {members.map((member: any) => (
                                  <SelectItem
                                    key={member.user._id}
                                    value={member.user._id}
                                    className="text-gray-900"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="w-6 h-6">
                                        <AvatarImage src={member.user.avatar} />
                                        <AvatarFallback className="text-xs">
                                          {member.user.name
                                            .split(" ")
                                            .map((n: string) => n[0])
                                            .join("")
                                            .toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      {member.user.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Labels */}
                      <FormField
                        control={form.control}
                        name="labels"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Labels</FormLabel>
                            <FormControl>
                              <div className="flex flex-wrap gap-2">
                                {labels.map((label: any) => (
                                  <Badge
                                    key={label._id}
                                    variant={
                                      field.value?.includes(label._id)
                                        ? "default"
                                        : "outline"
                                    }
                                    className="cursor-pointer"
                                    style={{
                                      backgroundColor: field.value?.includes(
                                        label._id
                                      )
                                        ? label.color
                                        : "transparent",
                                      borderColor: label.color,
                                      color: field.value?.includes(label._id)
                                        ? "white"
                                        : label.color,
                                    }}
                                    onClick={() => {
                                      const currentLabels = field.value || [];
                                      const newLabels = currentLabels.includes(
                                        label._id
                                      )
                                        ? currentLabels.filter(
                                            (id: string) => id !== label._id
                                          )
                                        : [...currentLabels, label._id];
                                      field.onChange(newLabels);
                                    }}
                                  >
                                    <Tag className="w-3 h-3 mr-1" />
                                    {label.name}
                                  </Badge>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                ) : (
                  <>
                    {/* Description */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Description
                      </Label>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        {task.description || "No description provided"}
                      </div>
                    </div>
                  </>
                )}

                {/* Progress */}
                {(task.completionPercentage > 0 ||
                  (task.subtasks && task.subtasks.length > 0)) && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Progress
                    </Label>
                    <div className="mt-2">
                      <Progress
                        value={getTaskProgress(task)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        {getTaskProgress(task)}% complete
                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="ml-2 text-gray-500">
                            (
                            {
                              task.subtasks.filter((st) => st.isCompleted)
                                .length
                            }{" "}
                            of {task.subtasks.length} subtasks completed)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subtasks */}
            <TaskSubtasks
              parentTask={task}
              onTaskUpdate={refetch}
              projectId={task.project._id}
            />

            {/* Comments */}
            <TaskComments taskId={task._id} />

            {/* Attachments */}
            <TaskAttachments taskId={task._id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Properties */}
            <Card>
              <CardHeader>
                <CardTitle>Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    {React.createElement(getStatusConfig(task.status).icon, {
                      className: "w-4 h-4",
                    })}
                    Status
                  </Label>
                  <Select
                    value={task.status}
                    onValueChange={(value) =>
                      handleUpdateField("status", value)
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskStatus).map((status) => {
                        const config = getStatusConfig(status);
                        return (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              {React.createElement(config.icon, {
                                className: `w-4 h-4 ${config.color}`,
                              })}
                              <span className="text-gray-900">
                                {config.label}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    {React.createElement(
                      getPriorityConfig(task.priority).icon,
                      { className: "w-4 h-4" }
                    )}
                    Priority
                  </Label>
                  <Select
                    value={task.priority}
                    onValueChange={(value) =>
                      handleUpdateField("priority", value)
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskPriority).map((priority) => {
                        const config = getPriorityConfig(priority);
                        return (
                          <SelectItem key={priority} value={priority}>
                            <div className="flex items-center gap-2">
                              {React.createElement(config.icon, {
                                className: `w-4 h-4 ${config.color}`,
                              })}
                              <span className="text-gray-900">
                                {config.label}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assignee
                  </Label>
                  <div className="mt-2">
                    <Select
                      value={task.assignedTo?._id || "unassigned"}
                      onValueChange={(value) =>
                        handleUpdateField(
                          "assignedTo",
                          value === "unassigned" ? undefined : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {task.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={task.assignedTo.avatar} />
                                <AvatarFallback className="text-xs">
                                  {task.assignedTo.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {task.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Unassigned
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <span className="text-gray-500">Unassigned</span>
                        </SelectItem>
                        {members.map((member) => (
                          <SelectItem
                            key={member.user._id}
                            value={member.user._id}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={member.user.avatar} />
                                <AvatarFallback className="text-xs">
                                  {member.user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {member.user.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Due Date
                  </Label>
                  <div className="mt-2">
                    {task.dueDate ? (
                      <span className="text-sm">
                        {format(new Date(task.dueDate), "MMM dd, yyyy")}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">No due date</span>
                    )}
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Labels
                  </Label>
                  <div className="mt-2">
                    <LabelManager
                      workspaceId={task.project.workspace}
                      projectId={task.project._id}
                      selectedLabels={task.labels?.map((l: any) => l._id) || []}
                      onLabelsChange={(labels) =>
                        handleUpdateField("labels", labels)
                      }
                      mode="select"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <ProjectActivityFeed
              projectId={task.project._id}
              activities={projectActivities || []}
              isLoading={activitiesLoading}
            />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Task"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
