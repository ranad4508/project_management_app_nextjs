"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  Home,
  MoreVertical,
  Plus,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import {
  useGetProjectByIdQuery,
  useArchiveProjectMutation,
  useDeleteProjectMutation,
} from "@/src/store/api/projectApi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const { data: project, isLoading, error } = useGetProjectByIdQuery(projectId);
  const [archiveProject, { isLoading: isArchiving }] =
    useArchiveProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

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
      toast({
        title: "Success",
        description: "Project archived successfully",
      });
      setIsArchiveDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive project. Please try again.",
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
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/dashboard/projects/${projectId}/edit`)
                }
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
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
                    disabled={project.status === "archived"}
                  >
                    <Archive className="mr-2 h-4 w-4" /> Archive Project
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex -space-x-2 mb-4">
                  {project.members.slice(0, 5).map((member) => (
                    <Avatar
                      key={member._id}
                      className="border-2 border-background"
                    >
                      <AvatarImage
                        src={member.avatar || "/placeholder.svg"}
                        alt={member.name}
                      />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {project.members.length > 5 && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-medium">
                      +{project.members.length - 5}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Users className="mr-2 h-4 w-4" /> Manage Team
                </Button>
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
            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Tasks</h2>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Task
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Task List</CardTitle>
                  <CardDescription>
                    Manage and track project tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-10">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-lg font-medium">No tasks yet</h3>
                    <p className="text-muted-foreground mt-1">
                      Create your first task to get started
                    </p>
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" /> Create Task
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              {/* Files tab content */}
            </TabsContent>

            <TabsContent value="team" className="mt-6">
              {/* Team tab content */}
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              {/* Activity tab content */}
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

          {/* Archive Project Dialog */}
          <AlertDialog
            open={isArchiveDialogOpen}
            onOpenChange={setIsArchiveDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  Archiving will hide the project from active views but preserve
                  all data. You can unarchive the project later if needed.
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
                  {isArchiving ? "Archiving..." : "Archive Project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
