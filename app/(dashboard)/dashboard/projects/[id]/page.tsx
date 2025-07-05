"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  Home,
  MoreVertical,
  Settings,
  Trash2,
  Users,
  Download,
  File,
  Image,
  Video,
  Music,
  FileText,
  Archive as ArchiveIcon,
} from "lucide-react";
import {
  useGetProjectByIdQuery,
  useArchiveProjectMutation,
  useDeleteProjectMutation,
  useGetProjectActivitiesQuery,
} from "@/src/store/api/projectApi";
import { useGetTasksQuery } from "@/src/store/api/taskApi";
import { useGetWorkspaceMembersQuery } from "@/src/store/api/workspaceApi";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { EditProjectDialog } from "@/components/projects/dialogs/EditProjectDialog";
import { ProjectActivityFeed } from "@/components/projects/ProjectActivityFeed";
import { LabelManager } from "@/components/labels/LabelManager";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "@/components/ui/use-toast";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const {
    data: project,
    isLoading,
    error,
    refetch: refetchProject,
  } = useGetProjectByIdQuery(projectId);
  const { data: activities, isLoading: activitiesLoading } =
    useGetProjectActivitiesQuery({
      projectId,
      limit: 20,
    });

  // Listen for task status updates to refresh project data
  React.useEffect(() => {
    const handleTaskStatusUpdate = () => {
      refetchProject();
    };

    window.addEventListener("task-status-updated", handleTaskStatusUpdate);
    return () => {
      window.removeEventListener("task-status-updated", handleTaskStatusUpdate);
    };
  }, [refetchProject]);

  // Get all tasks to extract attachments
  const { data: tasksResponse } = useGetTasksQuery({
    projectId,
    page: 1,
    limit: 1000, // Get all tasks
  });

  // Get workspace members for team tab
  const workspaceId =
    typeof project?.workspace === "object"
      ? project.workspace._id
      : project?.workspace;

  const { data: workspaceMembersData } = useGetWorkspaceMembersQuery(
    workspaceId || "",
    { skip: !workspaceId }
  );

  const workspaceMembers = workspaceMembersData?.members || [];

  const [archiveProject, { isLoading: isArchiving }] =
    useArchiveProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  // Extract all attachments from tasks
  const allAttachments = React.useMemo(() => {
    if (!tasksResponse?.data?.tasks) {
      return [];
    }

    return tasksResponse.data.tasks.reduce((acc: any[], task: any) => {
      if (
        task.attachments &&
        Array.isArray(task.attachments) &&
        task.attachments.length > 0
      ) {
        const taskAttachments = task.attachments.map((attachment: any) => ({
          ...attachment,
          taskTitle: task.title,
          taskId: task._id,
          // Ensure we have the required fields
          _id: attachment._id || attachment.id,
          filename:
            attachment.filename || attachment.originalName || attachment.name,
          mimetype:
            attachment.mimetype ||
            attachment.type ||
            "application/octet-stream",
          url: attachment.url,
          size: attachment.size || 0,
        }));
        return [...acc, ...taskAttachments];
      }
      return acc;
    }, []);
  }, [tasksResponse?.data?.tasks]);

  // Helper function to get file icon
  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return File;
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType.startsWith("video/")) return Video;
    if (mimeType.startsWith("audio/")) return Music;
    if (mimeType.includes("pdf") || mimeType.includes("document"))
      return FileText;
    if (mimeType.includes("zip") || mimeType.includes("rar"))
      return ArchiveIcon;
    return File;
  };

  // Helper function to get file extension from MIME type
  const getFileExtensionFromMimeType = (mimeType: string): string | null => {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "application/pdf": "pdf",
      "text/plain": "txt",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "pptx",
      "application/zip": "zip",
      "application/x-rar-compressed": "rar",
      "application/x-7z-compressed": "7z",
      "video/mp4": "mp4",
      "video/avi": "avi",
      "video/mov": "mov",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
    };

    return mimeToExt[mimeType] || null;
  };

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load project details. Please try again later.",
      variant: "destructive",
    });
  }

  const handleArchiveProject = async () => {
    try {
      await archiveProject(projectId).unwrap();
      const isCurrentlyArchived = project?.status === "archived";
      toast({
        title: "Success",
        description: isCurrentlyArchived
          ? "Project unarchived successfully"
          : "Project archived successfully",
      });
      setIsArchiveDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject(projectId).unwrap();
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      router.push("/dashboard/projects");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {isLoading ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <Skeleton className="h-4 w-64" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      ) : project ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <Link
                  href="/dashboard"
                  className="hover:underline flex items-center"
                >
                  <Home className="h-3 w-3 mr-1" /> Dashboard
                </Link>
                <ChevronRight className="h-3 w-3 mx-1" />
                <Link href="/dashboard/projects" className="hover:underline">
                  Projects
                </Link>
                <ChevronRight className="h-3 w-3 mx-1" />
                <span className="text-foreground font-medium truncate">
                  {project.name}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                {project.name}
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </h1>
              <p className="text-muted-foreground mt-1">
                {project.description || "No description provided"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/dashboard/projects/${projectId}/settings`)
                    }
                  >
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsArchiveDialogOpen(true)}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {project.status === "archived"
                      ? "Unarchive Project"
                      : "Archive Project"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <Link
              href={`/dashboard/workspaces/${project.workspace._id}`}
              className="hover:underline flex items-center"
            >
              Workspace: {project.workspace.name}
            </Link>
            <span className="mx-2">•</span>
            <span className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              Created: {new Date(project.createdAt).toLocaleDateString()}
            </span>
            {project.dueDate && (
              <>
                <span className="mx-2">•</span>
                <span className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  Due: {new Date(project.dueDate).toLocaleDateString()}
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {project.stats?.completionPercentage || 0}%
                </div>
                <Progress
                  value={project.stats?.completionPercentage || 0}
                  className="h-2 mt-2"
                />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">
                      Total Tasks
                    </div>
                    <div className="text-2xl font-bold">
                      {project.stats?.totalTasks || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">
                      Completed
                    </div>
                    <div className="text-2xl font-bold">
                      {project.stats?.completedTasks || 0}
                    </div>
                  </div>
                </div>
                {project.stats?.totalEffort &&
                  project.stats.totalEffort > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-sm font-medium text-muted-foreground">
                          Total Effort
                        </div>
                        <div className="text-2xl font-bold">
                          {project.stats.totalEffort}h
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-muted-foreground">
                          Completed Effort
                        </div>
                        <div className="text-2xl font-bold">
                          {project.stats.completedEffort || 0}h
                        </div>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex -space-x-2 mb-4">
                  {workspaceMembers.slice(0, 5).map((member) => (
                    <Avatar
                      key={member.user._id}
                      className="border-2 border-background"
                    >
                      <AvatarImage
                        src={member.user.avatar || "/placeholder.svg"}
                        alt={member.user.name}
                      />
                      <AvatarFallback>
                        {member.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {workspaceMembers.length > 5 && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-medium">
                      +{workspaceMembers.length - 5}
                    </div>
                  )}
                </div>
                <span>
                  {workspaceMembers.length} members are contributing to this
                  project
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge className={getPriorityColor(project.priority)}>
                    {project.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created by:</span>
                  <span>{project.createdBy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last updated:</span>
                  <span>
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid grid-cols-5 w-full sm:w-auto">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="labels">Labels</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-6">
              <TaskBoard
                projectId={projectId}
                projectName={project.name}
                workspaceId={
                  typeof project.workspace === "object"
                    ? project.workspace._id
                    : project.workspace
                }
              />
            </TabsContent>

            <TabsContent value="labels" className="mt-6">
              <div className="space-y-4">
                <LabelManager
                  workspaceId={
                    typeof project.workspace === "object"
                      ? project.workspace._id
                      : project.workspace
                  }
                  projectId={projectId}
                  mode="manage"
                />
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Files</CardTitle>
                  <p className="text-sm text-gray-600">
                    All attachments from tasks in this project
                  </p>
                </CardHeader>
                <CardContent>
                  {allAttachments.length > 0 ? (
                    <div className="space-y-4">
                      {allAttachments.map((attachment: any) => {
                        const IconComponent = getFileIcon(attachment.mimetype);
                        return (
                          <div
                            key={attachment._id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-3">
                              <IconComponent className="w-8 h-8 text-gray-500" />
                              <div>
                                <p className="font-medium">
                                  {attachment.filename}
                                </p>
                                <p className="text-sm text-gray-500">
                                  From task: {attachment.taskTitle}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {attachment.size
                                    ? `${Math.round(attachment.size / 1024)} KB`
                                    : "Unknown size"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    // Get the original filename with proper extension
                                    let filename =
                                      attachment.filename || "download";

                                    // Ensure the filename has the correct extension based on MIME type
                                    if (
                                      !filename.includes(".") &&
                                      attachment.mimetype
                                    ) {
                                      const extension =
                                        getFileExtensionFromMimeType(
                                          attachment.mimetype
                                        );
                                      if (extension) {
                                        filename += `.${extension}`;
                                      }
                                    }

                                    // Fetch the file as blob with proper headers to ensure correct content type
                                    const response = await fetch(
                                      attachment.url,
                                      {
                                        headers: {
                                          Accept:
                                            attachment.mimetype ||
                                            "application/octet-stream",
                                        },
                                      }
                                    );

                                    if (!response.ok) {
                                      throw new Error(
                                        `HTTP error! status: ${response.status}`
                                      );
                                    }

                                    // Get the blob with the correct MIME type
                                    const blob = await response.blob();

                                    // Create a new blob with the correct MIME type if it's different
                                    const correctBlob = new Blob([blob], {
                                      type:
                                        attachment.mimetype ||
                                        blob.type ||
                                        "application/octet-stream",
                                    });

                                    const url =
                                      window.URL.createObjectURL(correctBlob);

                                    // Create download link
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = filename;
                                    link.style.display = "none";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);

                                    // Clean up the blob URL
                                    window.URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error("Download failed:", error);
                                    // Fallback: try direct download with proper headers
                                    try {
                                      const filename =
                                        attachment.filename || "download";
                                      const link = document.createElement("a");
                                      link.href = `${
                                        attachment.url
                                      }?download=true&name=${encodeURIComponent(
                                        filename
                                      )}`;
                                      link.download = filename;
                                      link.target = "_blank";
                                      link.style.display = "none";
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    } catch (fallbackError) {
                                      console.error(
                                        "Fallback download also failed:",
                                        fallbackError
                                      );
                                      window.open(attachment.url, "_blank");
                                    }
                                  }
                                }}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <File className="mx-auto h-12 w-12 mb-4" />
                      <p>No files found in this project</p>
                      <p className="text-sm">
                        Files will appear here when you upload them to tasks
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workspace Members</CardTitle>
                  <p className="text-sm text-gray-600">
                    All workspace members can be assigned to tasks in this
                    project
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workspaceMembers.length > 0 ? (
                      workspaceMembers.map((member: any) => {
                        const isProjectMember = project?.members?.some(
                          (pm: any) =>
                            pm._id === member.user._id || pm === member.user._id
                        );
                        const isOwner =
                          project?.createdBy?._id === member.user._id;

                        return (
                          <div
                            key={member.user._id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={member.user.avatar} />
                                <AvatarFallback>
                                  {member.user.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {member.user.name}
                                </p>
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
                      })
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

            <TabsContent value="activity" className="mt-6">
              <ProjectActivityFeed
                projectId={projectId}
                activities={activities || []}
                isLoading={activitiesLoading}
              />
            </TabsContent>
          </Tabs>

          {/* Delete Project Dialog */}
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you sure you want to delete this project?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  project and all associated tasks and files.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Deleting..." : "Delete Project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Archive/Unarchive Project Dialog */}
          <AlertDialog
            open={isArchiveDialogOpen}
            onOpenChange={setIsArchiveDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {project?.status === "archived"
                    ? "Unarchive this project?"
                    : "Archive this project?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {project?.status === "archived"
                    ? "Unarchiving will restore the project to active status and make it visible in active views again."
                    : "Archiving will hide the project from active views but preserve all data. You can unarchive the project later if needed."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isArchiving}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleArchiveProject}
                  disabled={isArchiving}
                >
                  {isArchiving
                    ? project?.status === "archived"
                      ? "Unarchiving..."
                      : "Archiving..."
                    : project?.status === "archived"
                    ? "Unarchive Project"
                    : "Archive Project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Edit Project Dialog */}
          {project && (
            <EditProjectDialog
              open={showEditDialog}
              onOpenChange={setShowEditDialog}
              project={project}
              onProjectUpdated={() => {
                // Refetch project data
                window.location.reload();
              }}
            />
          )}
        </>
      ) : (
        <div className="text-center py-10">
          <h3 className="text-lg font-medium">Project not found</h3>
          <p className="text-muted-foreground mt-1">
            The project you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/dashboard/projects")}
          >
            Back to Projects
          </Button>
        </div>
      )}
    </div>
  );
}
