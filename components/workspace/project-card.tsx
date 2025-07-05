"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Edit, Archive, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ProjectOrWorkspaceProject,
  isWorkspaceProject,
} from "@/src/types/project.types";
import { ProjectStatus } from "@/src/enums/project.enum";

interface ProjectCardProps {
  project: ProjectOrWorkspaceProject;
  onEdit: (projectId: string) => void;
  onArchive: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  const router = useRouter();

  const getStatusVariant = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED:
        return "default";
      case ProjectStatus.ARCHIVED:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Get completion percentage from either project type
  const getCompletionPercentage = () => {
    if (
      "stats" in project &&
      project.stats &&
      "completionPercentage" in project.stats
    ) {
      return project.stats.completionPercentage;
    }
    if ("stats" in project && project.stats) {
      return project.stats.totalTasks > 0
        ? Math.round(
            (project.stats.completedTasks / project.stats.totalTasks) * 100
          )
        : 0;
    }
    return project.tasksCount > 0
      ? Math.round((project.completedTasks / project.tasksCount) * 100)
      : 0;
  };

  // Get total tasks from either project type
  const getTotalTasks = () => {
    if ("stats" in project && project.stats && "totalTasks" in project.stats) {
      return project.stats.totalTasks;
    }
    return project.tasksCount || 0;
  };

  // Get completed tasks from either project type
  const getCompletedTasks = () => {
    if (
      "stats" in project &&
      project.stats &&
      "completedTasks" in project.stats
    ) {
      return project.stats.completedTasks;
    }
    return project.completedTasks || 0;
  };

  // Get total effort from project stats
  const getTotalEffort = () => {
    if ("stats" in project && project.stats && "totalEffort" in project.stats) {
      return project.stats.totalEffort;
    }
    return 0;
  };

  // Get completed effort from project stats
  const getCompletedEffort = () => {
    if (
      "stats" in project &&
      project.stats &&
      "completedEffort" in project.stats
    ) {
      return project.stats.completedEffort;
    }
    return 0;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              <Link
                href={`/dashboard/projects/${project._id}`}
                className="hover:text-blue-600 transition-colors"
              >
                {project.name}
              </Link>
            </CardTitle>
            {project.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {project.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/dashboard/projects/${project._id}`)
                }
              >
                View Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(project._id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onArchive(project._id)}
                disabled={project.status === ProjectStatus.ARCHIVED}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Project
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the project and all associated tasks.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(project._id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(project.status)}>
              {project.status}
            </Badge>
            <Badge variant={getPriorityColor(project.priority)}>
              {project.priority}
            </Badge>
          </div>
          <span className="text-muted-foreground">
            {getCompletionPercentage()}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{
              width: `${getCompletionPercentage()}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex flex-col gap-1">
            <span>
              {getCompletedTasks()}/{getTotalTasks()} tasks
            </span>
            {getTotalEffort() > 0 && (
              <span>
                {getCompletedEffort()}/{getTotalEffort()} hours effort
              </span>
            )}
          </div>
          {project.dueDate && (
            <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
