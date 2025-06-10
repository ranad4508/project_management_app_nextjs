"use client";

import type React from "react";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  MessageSquare,
  Settings,
  Loader2,
  Plus,
  Mail,
  Search,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import {
  useGetWorkspaceByIdQuery,
  useGetWorkspaceMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from "@/src/store/api/workspaceApi";
import {
  useGetWorkspaceProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
  useDeleteProjectMutation,
} from "@/src/store/api/projectApi";
import { MemberRole } from "@/src/enums/user.enum";
import { ProjectStatus } from "@/src/enums/project.enum";
import { WorkspaceStatsCards } from "@/components/workspace/workspace-stats";
import { ProjectCard } from "@/components/workspace/project-card";
import { ProjectDialog } from "@/components/workspace/project-dialog";
import { MemberCard } from "@/components/workspace/member-card";
import type { Project } from "@/src/types/project.types";
import type { WorkspaceProject } from "@/src/types/workspace.types";

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>(MemberRole.MEMBER);

  // Project state
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<ProjectStatus | "all">(
    "all"
  );
  const [projectPage, setProjectPage] = useState(1);
  const [editingProject, setEditingProject] = useState<string | null>(null);

  // Redux queries
  const {
    data: workspace,
    isLoading: workspaceLoading,
    error: workspaceError,
    refetch: refetchWorkspace,
  } = useGetWorkspaceByIdQuery(workspaceId, {
    skip: !workspaceId,
  });

  const {
    data: membersData,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGetWorkspaceMembersQuery(workspaceId, {
    skip: !workspaceId || activeTab !== "members",
  });

  // Project queries
  const {
    data: projectsData,
    isLoading: projectsLoading,
    isFetching: projectsFetching,
    refetch: refetchProjects,
  } = useGetWorkspaceProjectsQuery(
    {
      workspaceId,
      pagination: {
        page: projectPage,
        limit: 9,
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
      filters: {
        search: projectSearch || undefined,
        status: projectFilter !== "all" ? projectFilter : undefined,
      },
    },
    {
      skip: !workspaceId || activeTab !== "projects",
    }
  );

  // Mutations
  const [inviteMember, { isLoading: isInviting }] = useInviteMemberMutation();
  const [updateMemberRole] = useUpdateMemberRoleMutation();
  const [removeMember] = useRemoveMemberMutation();

  // Project mutations
  const [createProject, { isLoading: isCreatingProject }] =
    useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdatingProject }] =
    useUpdateProjectMutation();
  const [archiveProject] = useArchiveProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();

  const getUserRole = () => {
    if (!workspace || !session?.user) return MemberRole.MEMBER;
    if (workspace.owner._id === session.user.id) return MemberRole.ADMIN;
    const member = workspace.members.find(
      (m) => m.user._id === session.user.id
    );
    return member?.role || MemberRole.MEMBER;
  };

  const isOwner = () => workspace?.owner._id === session?.user?.id;
  const isAdmin = () => {
    const role = getUserRole();
    return role === MemberRole.ADMIN || isOwner();
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      await inviteMember({
        workspaceId,
        data: {
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      }).unwrap();

      toast.success("Invitation sent successfully");
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole(MemberRole.MEMBER);
      refetchMembers();
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to send invitation");
    }
  };

  const handleUpdateRole = async (userId: string, role: MemberRole) => {
    try {
      await updateMemberRole({
        workspaceId,
        userId,
        role,
      }).unwrap();
      toast.success("Member role updated successfully");
      refetchMembers();
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to update member role");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember({
        workspaceId,
        userId,
      }).unwrap();
      toast.success("Member removed successfully");
      refetchMembers();
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to remove member");
    }
  };

  // Project handlers
  const handleCreateProject = async (data: {
    name: string;
    description?: string;
    priority: any;
    dueDate?: string;
  }) => {
    try {
      if (editingProject) {
        await updateProject({
          id: editingProject,
          data,
        }).unwrap();
        toast.success("Project updated successfully");
      } else {
        await createProject({
          ...data,
          workspaceId,
        }).unwrap();
        toast.success("Project created successfully");
      }

      setProjectDialogOpen(false);
      setEditingProject(null);
      refetchProjects();
      refetchWorkspace();
    } catch (error: any) {
      toast.error(
        error?.data?.error ||
          `Failed to ${editingProject ? "update" : "create"} project`
      );
      throw error;
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      await archiveProject(projectId).unwrap();
      toast.success("Project archived successfully");
      refetchProjects();
      refetchWorkspace();
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to archive project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId).unwrap();
      toast.success("Project deleted successfully");
      refetchProjects();
      refetchWorkspace();
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to delete project");
    }
  };

  const handleEditProject = (projectId: string) => {
    setEditingProject(projectId);
    setProjectDialogOpen(true);
  };

  // Helper function to adapt WorkspaceProject to Project
  const adaptProject = (project: WorkspaceProject): Project => {
    return {
      ...project,
      workspaceId,
      members: [],
      assignedTo: project.assignedTo || [],
      tasksCount: project.tasksCount || 0,
      completedTasks: project.completedTasks || 0,
      stats: {
        totalTasks: project.stats?.totalTasks || project.tasksCount || 0,
        completedTasks:
          project.stats?.completedTasks || project.completedTasks || 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        completionPercentage: project.stats?.completionPercentage || 0,
      },
    };
  };

  // Find editing project and adapt it if needed
  const getEditingProject = (): Project | null => {
    if (!editingProject) return null;

    // Try to find in workspace projects
    if (workspace?.projects) {
      const workspaceProject = workspace.projects.find(
        (p) => p._id === editingProject
      );
      if (workspaceProject) {
        return adaptProject(workspaceProject);
      }
    }

    // Try to find in fetched projects
    if (projectsData?.projects) {
      const fetchedProject = projectsData.projects.find(
        (p) => p._id === editingProject
      );
      if (fetchedProject) {
        return fetchedProject as any;
      }
    }

    return null;
  };

  if (workspaceLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    );
  }

  if (workspaceError || !workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Workspace not found</h3>
          <p className="text-muted-foreground mb-4">
            The workspace you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Button onClick={() => refetchWorkspace()}>Retry</Button>
        </div>
      </div>
    );
  }

  const editingProjectData = getEditingProject();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {workspace.name}
            </h1>
            <Badge variant={isOwner() ? "default" : "secondary"}>
              {isOwner() ? "Owner" : getUserRole()}
            </Badge>
          </div>
          {workspace.description && (
            <p className="text-muted-foreground">{workspace.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Created {new Date(workspace.createdAt).toLocaleDateString()}
            </span>
            <span>•</span>
            <span>Owner: {workspace.owner.name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/workspaces/${workspaceId}/chat`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Link>
          </Button>
          {isAdmin() && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/workspaces/${workspaceId}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <WorkspaceStatsCards stats={workspace.stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>
                  Latest projects in this workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workspace.projects && workspace.projects.length > 0 ? (
                  workspace.projects.slice(0, 5).map((project) => (
                    <div
                      key={project._id}
                      className="flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          <Link
                            href={`/dashboard/projects/${project._id}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {project.name}
                          </Link>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {project.completedTasks}/{project.tasksCount} tasks
                          completed
                        </p>
                      </div>
                      <Badge
                        variant={
                          project.status === "active" ? "default" : "secondary"
                        }
                      >
                        {project.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No projects yet
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveTab("projects")}
                >
                  View All Projects
                </Button>
              </CardFooter>
            </Card>

            {/* Team Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Active members in this workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workspace.members.slice(0, 5).map((member) => (
                  <div
                    key={member.user._id}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.user.avatar || "/placeholder.svg"}
                      />
                      <AvatarFallback>
                        {member.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveTab("members")}
                >
                  View All Members
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-8"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                />
              </div>
              <Select
                value={projectFilter}
                onValueChange={(value) =>
                  setProjectFilter(value as ProjectStatus | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value={ProjectStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={ProjectStatus.COMPLETED}>
                    Completed
                  </SelectItem>
                  <SelectItem value={ProjectStatus.ARCHIVED}>
                    Archived
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setProjectDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          {projectsLoading || projectsFetching ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <Skeleton className="h-5 w-40 mb-2" />
                          <Skeleton className="h-4 w-60" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-4 w-32" />
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : projectsData && projectsData.projects.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projectsData.projects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project as any}
                    onEdit={handleEditProject}
                    onArchive={handleArchiveProject}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>

              {/* Pagination */}
              {projectsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setProjectPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={projectPage === 1 || projectsLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {projectPage} of {projectsData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setProjectPage((prev) =>
                        Math.min(prev + 1, projectsData.pagination.totalPages)
                      )
                    }
                    disabled={
                      projectPage === projectsData.pagination.totalPages ||
                      projectsLoading
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                {projectSearch || projectFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Create your first project to get started."}
              </p>
              <Button onClick={() => setProjectDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Members ({membersData?.members.length || workspace.members.length}
              )
            </h3>
            {isAdmin() && (
              <Dialog
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleInviteMember} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value) =>
                          setInviteRole(value as MemberRole)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MemberRole.MEMBER}>
                            Member
                          </SelectItem>
                          <SelectItem value={MemberRole.ADMIN}>
                            Admin
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInviteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isInviting}>
                        {isInviting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {membersLoading ? (
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {(membersData?.members || workspace.members).map((member) => (
                <MemberCard
                  key={member.user._id}
                  member={member}
                  owner={workspace.owner}
                  currentUserId={session?.user?.id}
                  isAdmin={isAdmin()}
                  onUpdateRole={handleUpdateRole}
                  onRemoveMember={handleRemoveMember}
                />
              ))}

              {/* Pending Invitations */}
              {membersData?.pendingInvitations &&
                membersData.pendingInvitations.length > 0 && (
                  <div className="space-y-2 mt-6">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Pending Invitations
                    </h4>
                    {membersData.pendingInvitations.map((invitation) => (
                      <Card key={invitation._id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Invited by {invitation.invitedBy.name} •{" "}
                              {new Date(
                                invitation.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {invitation.role} (Pending)
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Project Dialog */}
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={handleCreateProject}
        editingProject={editingProjectData}
        isLoading={isCreatingProject || isUpdatingProject}
      />
    </div>
  );
}
