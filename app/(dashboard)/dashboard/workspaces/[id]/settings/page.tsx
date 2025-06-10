"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Save, Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  useGetWorkspaceByIdQuery,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetWorkspaceSettingsQuery,
  useUpdateWorkspaceSettingsMutation,
} from "@/src/store/api/workspaceApi";

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const { data: session } = useSession();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Form states
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [settings, setSettings] = useState({
    allowGuestAccess: false,
    requireApprovalForTasks: false,
    defaultTaskStatus: "todo",
    timeZone: "UTC",
    workingHours: {
      start: "09:00",
      end: "17:00",
      days: [1, 2, 3, 4, 5], // Monday to Friday
    },
  });

  // Redux queries and mutations
  const { data: workspace, isLoading: workspaceLoading } =
    useGetWorkspaceByIdQuery(workspaceId);
  const { data: workspaceSettings, isLoading: settingsLoading } =
    useGetWorkspaceSettingsQuery(workspaceId);
  const [updateWorkspace, { isLoading: isUpdatingWorkspace }] =
    useUpdateWorkspaceMutation();
  const [deleteWorkspace, { isLoading: isDeletingWorkspace }] =
    useDeleteWorkspaceMutation();
  const [updateWorkspaceSettings, { isLoading: isUpdatingSettings }] =
    useUpdateWorkspaceSettingsMutation();

  // Initialize form data when workspace loads
  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
      setWorkspaceDescription(workspace.description || "");
    }
  }, [workspace]);

  useEffect(() => {
    if (workspaceSettings?.settings) {
      setSettings(workspaceSettings.settings);
    }
  }, [workspaceSettings]);

  const isOwner = workspace?.owner._id === session?.user?.id;

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateWorkspace({
        id: workspaceId,
        data: {
          name: workspaceName,
          description: workspaceDescription,
        },
      }).unwrap();

      toast.success("Workspace updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to update workspace");
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateWorkspaceSettings({
        id: workspaceId,
        settings,
      }).unwrap();

      toast.success("Settings updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to update settings");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmation !== workspace?.name) {
      toast.error("Please type the workspace name to confirm deletion");
      return;
    }

    try {
      await deleteWorkspace(workspaceId).unwrap();
      toast.success("Workspace deleted successfully");
      router.push("/dashboard/workspaces");
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to delete workspace");
    }
  };

  if (workspaceLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Workspace not found</h3>
          <p className="text-muted-foreground">
            The workspace you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Only workspace owners can access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/workspaces/${workspaceId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workspace
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Workspace Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your workspace configuration and preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Information</CardTitle>
              <CardDescription>
                Update your workspace name and description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={workspaceDescription}
                    onChange={(e) => setWorkspaceDescription(e.target.value)}
                    placeholder="Enter workspace description"
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={isUpdatingWorkspace}>
                  {isUpdatingWorkspace ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Preferences</CardTitle>
              <CardDescription>
                Configure workspace behavior and defaults
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Guest Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow non-members to view public projects
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowGuestAccess}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({
                          ...prev,
                          allowGuestAccess: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Task Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        Require admin approval for new tasks
                      </p>
                    </div>
                    <Switch
                      checked={settings.requireApprovalForTasks}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({
                          ...prev,
                          requireApprovalForTasks: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Default Task Status</Label>
                    <Select
                      value={settings.defaultTaskStatus}
                      onValueChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaultTaskStatus: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Zone</Label>
                    <Select
                      value={settings.timeZone}
                      onValueChange={(value) =>
                        setSettings((prev) => ({ ...prev, timeZone: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">
                          Eastern Time
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time
                        </SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Working Hours</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={settings.workingHours.start}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                start: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-time">End Time</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={settings.workingHours.end}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                end: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isUpdatingSettings}>
                  {isUpdatingSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">
                      Delete Workspace
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      Once you delete a workspace, there is no going back. This
                      will permanently delete the workspace, all projects,
                      tasks, and remove all team members.
                    </p>
                    <Dialog
                      open={deleteDialogOpen}
                      onOpenChange={setDeleteDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="mt-3">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Workspace
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Workspace</DialogTitle>
                          <DialogDescription>
                            This action cannot be undone. This will permanently
                            delete the workspace and all associated data.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>
                              Type <strong>{workspace.name}</strong> to confirm
                              deletion:
                            </Label>
                            <Input
                              value={deleteConfirmation}
                              onChange={(e) =>
                                setDeleteConfirmation(e.target.value)
                              }
                              placeholder={workspace.name}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setDeleteDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDeleteWorkspace}
                              disabled={
                                isDeletingWorkspace ||
                                deleteConfirmation !== workspace.name
                              }
                            >
                              {isDeletingWorkspace ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Workspace
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
