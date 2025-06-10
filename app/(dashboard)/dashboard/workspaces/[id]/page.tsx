"use client";

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
import { toast } from "sonner";
import {
  Users,
  FolderOpen,
  Calendar,
  Settings,
  Loader2,
  Plus,
  MessageSquare,
  BarChart3,
  Mail,
} from "lucide-react";
import Link from "next/link";
import {
  useGetWorkspaceByIdQuery,
  useGetWorkspaceMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from "@/src/store/api/workspaceApi";
import { MemberRole } from "@/src/enums/user.enum";

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>(MemberRole.MEMBER);

  // Redux queries
  const {
    data: workspace,
    isLoading,
    error,
    refetch,
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

  // Mutations
  const [inviteMember, { isLoading: isInviting }] = useInviteMemberMutation();
  const [updateMemberRole, { isLoading: isUpdatingRole }] =
    useUpdateMemberRoleMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveMemberMutation();

  const getUserRole = () => {
    if (!workspace || !session?.user) return MemberRole.MEMBER;
    if (workspace.owner._id === session.user.id) return MemberRole.ADMIN; // Owner is treated as admin
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Workspace not found</h3>
          <p className="text-muted-foreground mb-4">
            The workspace you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workspace.stats.totalProjects}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workspace.stats.totalTasks}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Tasks
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workspace.stats.completedTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              {workspace.stats.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workspace.stats.activeMembers}
            </div>
          </CardContent>
        </Card>
      </div>

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
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Projects</h3>
            <Button asChild>
              <Link href={`/dashboard/workspaces/${workspaceId}/projects/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workspace.projects && workspace.projects.length > 0 ? (
              workspace.projects.map((project) => (
                <Card key={project._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">
                        <Link
                          href={`/dashboard/projects/${project._id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {project.name}
                        </Link>
                      </CardTitle>
                      <Badge
                        variant={
                          project.status === "active" ? "default" : "secondary"
                        }
                      >
                        {project.status}
                      </Badge>
                    </div>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {project.completedTasks}/{project.tasksCount} tasks
                      </span>
                      <span className="text-muted-foreground">
                        {project.tasksCount > 0
                          ? Math.round(
                              (project.completedTasks / project.tasksCount) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${
                            project.tasksCount > 0
                              ? (project.completedTasks / project.tasksCount) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first project to get started.
                </p>
                <Button asChild>
                  <Link
                    href={`/dashboard/workspaces/${workspaceId}/projects/new`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Link>
                </Button>
              </div>
            )}
          </div>
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
                    <div className="flex justify-end gap-2">
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
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {(membersData?.members || workspace.members).map((member) => (
                <Card key={member.user._id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
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
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined{" "}
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          member.role === MemberRole.ADMIN
                            ? "default"
                            : "outline"
                        }
                      >
                        {member.user._id === workspace.owner._id
                          ? "Owner"
                          : member.role}
                      </Badge>
                      {isAdmin() &&
                        member.user._id !== session?.user?.id &&
                        member.user._id !== workspace.owner._id && (
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pending Invitations */}
              {membersData?.pendingInvitations &&
                membersData.pendingInvitations.length > 0 && (
                  <div className="space-y-2">
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
    </div>
  );
}
