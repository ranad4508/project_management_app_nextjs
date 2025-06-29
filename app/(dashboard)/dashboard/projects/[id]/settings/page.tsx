"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Users,
  Shield,
  Trash2,
  Archive,
  Save,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useGetProjectByIdQuery,
  useUpdateProjectSettingsMutation,
  useArchiveProjectMutation,
  useDeleteProjectMutation,
} from "@/src/store/api/projectApi";
import { useGetWorkspaceMembersQuery } from "@/src/store/api/workspaceApi";
import { ProjectStatus, ProjectPriority } from "@/src/enums/project.enum";

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>;
}

const projectSettingsSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
});

type ProjectSettingsForm = z.infer<typeof projectSettingsSchema>;

const statusOptions = [
  { value: ProjectStatus.ACTIVE, label: "Active" },
  { value: ProjectStatus.ON_HOLD, label: "On Hold" },
  { value: ProjectStatus.COMPLETED, label: "Completed" },
  { value: ProjectStatus.ARCHIVED, label: "Archived" },
];

const priorityOptions = [
  { value: ProjectPriority.LOW, label: "Low" },
  { value: ProjectPriority.MEDIUM, label: "Medium" },
  { value: ProjectPriority.HIGH, label: "High" },
  { value: ProjectPriority.URGENT, label: "Urgent" },
];

export default function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data: projectResponse,
    isLoading,
    error,
    refetch,
  } = useGetProjectByIdQuery(id);

  const [updateProject, { isLoading: isUpdating }] =
    useUpdateProjectSettingsMutation();
  const [archiveProject, { isLoading: isArchiving }] =
    useArchiveProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const project = projectResponse;

  const workspaceId =
    typeof project?.workspace === "object"
      ? project.workspace._id
      : project?.workspace;

  const { data: workspaceMembersData } = useGetWorkspaceMembersQuery(
    workspaceId || "",
    { skip: !workspaceId }
  );

  const workspaceMembers = workspaceMembersData?.members || [];

  const form = useForm({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      status: (project?.status as ProjectStatus) || ProjectStatus.ACTIVE,
      priority:
        (project?.priority as ProjectPriority) || ProjectPriority.MEDIUM,
      startDate: project?.startDate ? new Date(project.startDate) : undefined,
      dueDate: project?.dueDate ? new Date(project.dueDate) : undefined,
    },
  });

  // Update form when project data loads
  React.useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || "",
        status: project.status as ProjectStatus,
        priority: project.priority as ProjectPriority,
        startDate: project.startDate ? new Date(project.startDate) : undefined,
        dueDate: project.dueDate ? new Date(project.dueDate) : undefined,
      });
    }
  }, [project, form]);

  const onSubmit = async (data: ProjectSettingsForm) => {
    try {
      await updateProject({
        id,
        data: {
          name: data.name,
          description: data.description,
          status: data.status,
          priority: data.priority,
        },
      }).unwrap();

      toast.success("Project settings updated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to update project settings");
      console.error("Failed to update project:", error);
    }
  };

  const handleArchiveClick = () => {
    setShowArchiveConfirm(true);
  };

  const handleArchiveConfirm = async () => {
    try {
      await archiveProject(id).unwrap();
      setShowArchiveConfirm(false);
      toast.success("Project archived successfully");
      router.push(
        `/dashboard/workspaces/${project?.workspace._id || project?.workspace}`
      );
    } catch (error) {
      toast.error("Failed to archive project");
      console.error("Failed to archive project:", error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteProject(id).unwrap();
      setShowDeleteConfirm(false);
      toast.success("Project deleted successfully");
      router.push(
        `/dashboard/workspaces/${project?.workspace._id || project?.workspace}`
      );
    } catch (error) {
      toast.error("Failed to delete project");
      console.error("Failed to delete project:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load project settings. Please check if the project exists
            and you have access to it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        <div className="text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-700">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/dashboard/workspaces/${
              project.workspace._id || project.workspace
            }`}
            className="hover:text-gray-700"
          >
            {typeof project.workspace === "object"
              ? project.workspace.name
              : "Workspace"}
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/dashboard/projects/${project._id}`}
            className="hover:text-gray-700"
          >
            {project.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Settings</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Project Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your project configuration and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Members</span>
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="flex items-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>Permissions</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center space-x-2">
            <Trash2 className="w-4 h-4" />
            <span>Danger Zone</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Project Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter project name..."
                            {...field}
                          />
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
                          <Textarea
                            placeholder="Enter project description..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status and Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
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
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {priorityOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Start Date and Due Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Due Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUpdating}>
                      <Save className="w-4 h-4 mr-2" />
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab - Will be implemented next */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Project Members</CardTitle>
              <CardDescription>
                Manage who has access to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Project Owner */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={project?.createdBy?.avatar} />
                      <AvatarFallback>
                        {project?.createdBy?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{project?.createdBy?.name}</p>
                      <p className="text-sm text-gray-500">
                        {project?.createdBy?.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Owner</Badge>
                </div>

                {/* Workspace Members */}
                {workspaceMembers.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">
                      Workspace Members
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      All workspace members can be assigned to tasks in this
                      project
                    </p>
                    {workspaceMembers.map((member: any) => {
                      const isProjectMember = project?.members?.some(
                        (pm: any) =>
                          pm._id === member.user._id || pm === member.user._id
                      );
                      const isOwner =
                        project?.createdBy?._id === member.user._id;

                      return (
                        <div
                          key={member.user._id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={member.user.avatar} />
                              <AvatarFallback>
                                {member.user.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.user.name}</p>
                              <p className="text-sm text-gray-500">
                                {member.user.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {member.role}
                            </Badge>
                            {isOwner && (
                              <Badge variant="secondary">Owner</Badge>
                            )}
                            {isProjectMember && !isOwner && (
                              <Badge variant="outline">Project Member</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-8 w-8 mb-2" />
                    <p>No members in this workspace</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Project Permissions</CardTitle>
              <CardDescription>
                Configure access levels and permissions for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Project Visibility */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">
                    Project Visibility
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <input
                        type="radio"
                        id="private"
                        name="visibility"
                        checked={false}
                        readOnly
                        className="text-blue-600"
                      />
                      <div>
                        <label htmlFor="private" className="font-medium">
                          Private
                        </label>
                        <p className="text-sm text-gray-500">
                          Only project members can access
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <input
                        type="radio"
                        id="workspace"
                        name="visibility"
                        checked={true}
                        readOnly
                        className="text-blue-600"
                      />
                      <div>
                        <label htmlFor="workspace" className="font-medium">
                          Workspace
                        </label>
                        <p className="text-sm text-gray-500">
                          All workspace members can access
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Member Permissions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">
                    Member Permissions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Create Tasks</p>
                        <p className="text-sm text-gray-500">
                          Allow members to create new tasks
                        </p>
                      </div>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Edit Tasks</p>
                        <p className="text-sm text-gray-500">
                          Allow members to edit existing tasks
                        </p>
                      </div>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Delete Tasks</p>
                        <p className="text-sm text-gray-500">
                          Allow members to delete tasks
                        </p>
                      </div>
                      <Badge variant="outline">Owner Only</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Archive Project */}
              <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                <div>
                  <h4 className="font-medium text-orange-900">
                    Archive Project
                  </h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Archive this project to hide it from active projects. You
                    can restore it later.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleArchiveClick}
                  disabled={isArchiving}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {isArchiving ? "Archiving..." : "Archive"}
                </Button>
              </div>

              {/* Delete Project */}
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-900">Delete Project</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete this project and all its data. This
                    action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this project? You can restore it
              later from the archived projects section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowArchiveConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              disabled={isArchiving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isArchiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot
              be undone and will permanently delete all project data, tasks, and
              files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
