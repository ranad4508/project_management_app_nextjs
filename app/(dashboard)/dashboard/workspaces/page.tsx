"use client";

import type React from "react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Users,
  FolderOpen,
  Calendar,
  Settings,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useUserWorkspaces } from "@/hooks/use-dashboard-data";
import {
  useCreateWorkspaceMutation,
  type CreateWorkspaceData,
} from "@/src/store/api/workspaceApi";

export default function WorkspacesPage() {
  const { data: session } = useSession();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState<CreateWorkspaceData>({
    name: "",
    description: "",
  });

  // SWR queries and RTK mutations
  const { workspaces, isLoading, error, mutate: refetch } = useUserWorkspaces();

  const [createWorkspace, { isLoading: isCreating }] =
    useCreateWorkspaceMutation();

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newWorkspace.name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    try {
      await createWorkspace(newWorkspace).unwrap();
      setNewWorkspace({ name: "", description: "" });
      setCreateDialogOpen(false);
      toast.success("Workspace created successfully");
    } catch (error: any) {
      console.error("Error creating workspace:", error);
      toast.error(error?.data?.error || "Failed to create workspace");
    }
  };

  const getUserRole = (workspace: any) => {
    if (workspace.owner._id === session?.user?.id) return "Owner";
    const member = workspace.members.find(
      (m: any) => m.user._id === session?.user?.id
    );
    return member?.role || "Member";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Error loading workspaces</h3>
          <p className="text-muted-foreground mb-4">
            Failed to load your workspaces. Please try again.
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  // workspaces is already available from the hook

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">
            Manage your workspaces and collaborate with your team
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Create a new workspace to organize your projects and collaborate
                with your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  value={newWorkspace.name}
                  onChange={(e) =>
                    setNewWorkspace((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter workspace name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="workspace-description"
                  value={newWorkspace.description}
                  onChange={(e) =>
                    setNewWorkspace((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe your workspace..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Workspace"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workspaces found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first workspace to start organizing your projects and
              collaborating with your team.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace: any) => (
            <Card
              key={workspace._id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      <Link
                        href={`/dashboard/workspaces/${workspace._id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {workspace.name}
                      </Link>
                    </CardTitle>
                    <Badge
                      variant={
                        getUserRole(workspace) === "Owner"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {getUserRole(workspace)}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                {workspace.description && (
                  <CardDescription className="line-clamp-2">
                    {workspace.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{workspace.stats.totalProjects} projects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{workspace.stats.totalTasks} tasks</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {workspace.members.length} members
                    </span>
                  </div>
                  <div className="flex -space-x-1">
                    {workspace.members.slice(0, 3).map((member: any) => (
                      <Avatar
                        key={member.user._id}
                        className="h-6 w-6 border border-background"
                      >
                        <AvatarImage
                          src={member.user.avatar || "/placeholder.svg"}
                        />
                        <AvatarFallback className="text-xs">
                          {member.user.name
                            .split(" ")
                            .map((n: any) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {workspace.members.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border border-background flex items-center justify-center">
                        <span className="text-xs">
                          +{workspace.members.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion Rate</span>
                    <span>{workspace.stats.completionRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${workspace.stats.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/dashboard/workspaces/${workspace._id}`}>
                      Open
                    </Link>
                  </Button>
                  {getUserRole(workspace) === "Owner" && (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/dashboard/workspaces/${workspace._id}/settings`}
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
