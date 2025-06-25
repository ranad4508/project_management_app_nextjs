"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useArchiveRoomMutation,
  useGetRoomMembersQuery,
  useInviteMemberByEmailMutation,
  useRemoveMemberFromRoomMutation,
  useChangeMemberRoleMutation,
} from "@/src/store/api/chatApi";
import { toast } from "sonner";
import {
  Settings,
  Lock,
  Upload,
  Clock,
  Trash2,
  Shield,
  Edit,
  Archive,
  MessageSquareX,
  AlertTriangle,
  Loader2,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Key,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ChatRoom } from "@/src/types/chat.types";
import { MemberRole } from "@/src/enums/user.enum";

interface RoomSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
  currentUserId: string;
}

export function RoomSettingsDialog({
  open,
  onOpenChange,
  room,
  currentUserId,
}: RoomSettingsDialogProps) {
  const router = useRouter();
  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation();
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation();
  const [archiveRoom, { isLoading: isArchiving }] = useArchiveRoomMutation();

  // Member management hooks
  const { data: membersData, refetch: refetchMembers } = useGetRoomMembersQuery(
    room._id
  );
  const [inviteMemberByEmail, { isLoading: isInviting }] =
    useInviteMemberByEmailMutation();
  const [removeMemberFromRoom, { isLoading: isRemoving }] =
    useRemoveMemberFromRoomMutation();
  const [changeMemberRole, { isLoading: isChangingRole }] =
    useChangeMemberRoleMutation();

  // Tab state
  const [activeTab, setActiveTab] = useState("general");

  // Confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConversationConfirm, setShowDeleteConversationConfirm] =
    useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: room.name,
    description: room.description || "",
    type: room.type,
    isEncrypted: room.isEncrypted,
    settings: {
      allowFileUploads: room.settings.allowFileUploads,
      maxFileSize: room.settings.maxFileSize / (1024 * 1024), // Convert to MB
      allowedFileTypes: room.settings.allowedFileTypes.join(", "),
      messageRetention: room.settings.messageRetention,
    },
  });

  // Member management state
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Permission checks
  const currentMember = room.members.find(
    (m) => m.user && m.user._id === currentUserId
  );
  const isAdmin = currentMember?.role === MemberRole.ADMIN;
  const isOwner = room.createdBy && room.createdBy._id === currentUserId;
  const isMember = !!currentMember;

  console.log("🔐 [ROOM-SETTINGS] Permission check:", {
    currentUserId,
    isOwner,
    isAdmin,
    isMember,
    roomCreator: room.createdBy?._id,
    roomType: room.type,
    canEditSettings: isAdmin || isOwner,
    canDeleteRoom: isOwner && room.type !== "general",
    canDeleteConversation: isMember,
    dialogOpen: open,
    activeTab,
  });

  // Log when dialog opens
  useEffect(() => {
    if (open) {
      console.log("🔓 [ROOM-SETTINGS] Dialog opened with room:", {
        roomId: room._id,
        roomName: room.name,
        roomType: room.type,
        isOwner,
        isAdmin,
        currentUserId,
        createdBy: room.createdBy?._id,
      });
    }
  }, [open, room._id, room.name, room.type, isOwner, isAdmin, currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      toast.error("Only room owners can modify these settings");
      return;
    }

    try {
      console.log("🔧 [ROOM-SETTINGS] Updating room settings:", {
        roomId: room._id,
        changes: formData,
        isOwner,
      });

      await updateRoom({
        roomId: room._id,
        data: {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          isEncrypted: formData.isEncrypted,
          settings: {
            ...formData.settings,
            maxFileSize: formData.settings.maxFileSize * 1024 * 1024, // Convert back to bytes
            allowedFileTypes: formData.settings.allowedFileTypes
              .split(",")
              .map((type) => type.trim())
              .filter(Boolean),
          },
        },
      }).unwrap();

      console.log("✅ [ROOM-SETTINGS] Room settings updated successfully");
      toast.success("Room settings updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("❌ [ROOM-SETTINGS] Error updating room settings:", error);
      toast.error(error.message || "Failed to update room settings");
    }
  };

  const handleArchiveRoom = async () => {
    if (!isOwner) {
      toast.error("Only room owners can archive the room");
      return;
    }

    setIsProcessing(true);
    try {
      await archiveRoom(room._id).unwrap();

      toast.success("Room archived successfully");
      setShowArchiveConfirm(false);
      onOpenChange(false);

      // Redirect to chat page after successful archiving
      setTimeout(() => {
        router.push(`/dashboard/workspaces/${room.workspace}/chat`);
      }, 1000);
    } catch (error: any) {
      console.error("Error archiving room:", error);
      toast.error(error.message || "Failed to archive room");
    } finally {
      setIsProcessing(false);
    }
  };

  // Member management functions
  const handleInviteMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      console.log("📧 [ROOM-SETTINGS] Inviting member:", {
        roomId: room._id,
        email: newMemberEmail,
        isOwner,
      });

      const result = await inviteMemberByEmail({
        roomId: room._id,
        email: newMemberEmail.trim(),
      }).unwrap();

      console.log("✅ [ROOM-SETTINGS] Member invited successfully:", result);
      toast.success(result.message);
      setNewMemberEmail("");
      refetchMembers();
    } catch (error: any) {
      console.error("❌ [ROOM-SETTINGS] Error inviting member:", error);
      toast.error(error.message || "Failed to invite member");
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      console.log("🚪 [ROOM-SETTINGS] Removing member:", {
        roomId: room._id,
        memberId,
        memberName,
        isOwner,
      });

      const result = await removeMemberFromRoom({
        roomId: room._id,
        memberId,
      }).unwrap();

      console.log("✅ [ROOM-SETTINGS] Member removed successfully:", result);
      toast.success(result.message);
      refetchMembers();
    } catch (error: any) {
      console.error("❌ [ROOM-SETTINGS] Error removing member:", error);
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleChangeRole = async (
    memberId: string,
    newRole: string,
    memberName: string
  ) => {
    try {
      console.log("👑 [ROOM-SETTINGS] Changing member role:", {
        roomId: room._id,
        memberId,
        newRole,
        memberName,
        isOwner,
      });

      const result = await changeMemberRole({
        roomId: room._id,
        memberId,
        role: newRole,
      }).unwrap();

      console.log(
        "✅ [ROOM-SETTINGS] Member role changed successfully:",
        result
      );
      toast.success(result.message);
      refetchMembers();
    } catch (error: any) {
      console.error("❌ [ROOM-SETTINGS] Error changing member role:", error);
      toast.error(error.message || "Failed to change member role");
    }
  };

  const handleDeleteRoom = async () => {
    console.log("🗑️ [ROOM-SETTINGS] Delete room button clicked", {
      confirmationText,
      roomName: room.name,
      isValid: confirmationText === room.name,
      isOwner,
      roomType: room.type,
    });

    if (confirmationText !== room.name) {
      toast.error("Please type the room name to confirm deletion");
      return;
    }

    setIsProcessing(true);
    try {
      console.log("🗑️ [ROOM-SETTINGS] Starting room deletion...", {
        roomId: room._id,
        roomName: room.name,
        isOwner,
      });

      await deleteRoom(room._id).unwrap();

      console.log("✅ [ROOM-SETTINGS] Room deleted successfully");
      toast.success("Room deleted successfully");
      setShowDeleteConfirm(false);
      onOpenChange(false);

      // Redirect to workspace chat
      const workspaceId =
        typeof room.workspace === "string"
          ? room.workspace
          : (room.workspace as any)?._id || room.workspace;

      console.log("🔄 [ROOM-SETTINGS] Redirecting to workspace chat", {
        workspaceId,
      });
      router.push(`/dashboard/workspaces/${workspaceId}/chat`);
    } catch (error: any) {
      console.error("❌ [ROOM-SETTINGS] Error deleting room:", error);
      toast.error(error.message || "Failed to delete room");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConversation = async () => {
    const expectedText =
      isOwner || isAdmin ? "DELETE MESSAGES" : "HIDE MESSAGES";
    if (confirmationText !== expectedText) {
      toast.error(`Please type '${expectedText}' to confirm`);
      return;
    }

    setIsProcessing(true);
    try {
      console.log(
        "🗑️ [ROOM-SETTINGS] Deleting conversation for user:",
        currentUserId
      );

      const response = await fetch(`/api/chat/rooms/${room._id}/messages`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUserId,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete conversation");
      }

      const result = await response.json();
      console.log("✅ [ROOM-SETTINGS] Conversation deleted:", result);

      const actionType = result.data?.type || "deleted";
      const messageCount = result.data?.deletedCount || 0;

      if (actionType === "hidden") {
        toast.success(
          `Successfully hid ${messageCount} messages from your view`
        );
      } else {
        toast.success(
          `Successfully deleted ${messageCount} messages for everyone`
        );
      }
      setShowDeleteConversationConfirm(false);
      setConfirmationText("");

      // Close the dialog and refresh the chat
      onOpenChange(false);

      // Refresh the page to show empty conversation
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      console.error("❌ [ROOM-SETTINGS] Error deleting conversation:", error);
      toast.error(error.message || "Failed to delete conversation");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetConfirmationStates = () => {
    setShowDeleteConfirm(false);
    setShowArchiveConfirm(false);
    setShowDeleteConversationConfirm(false);
    setConfirmationText("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) resetConfirmationStates();
        onOpenChange(open);
      }}
    >
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col pointer-events-auto"
        style={{ pointerEvents: "auto", cursor: "default" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Room Settings</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            console.log("🔄 [ROOM-SETTINGS] Tab changed to:", value);
            setActiveTab(value);
          }}
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger
              value="general"
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center space-x-2">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Manage</span>
            </TabsTrigger>
            <TabsTrigger
              value="danger"
              className="flex items-center space-x-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Danger</span>
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent
            value="general"
            className="flex-1 overflow-y-auto space-y-6"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Room Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      disabled={!isOwner}
                      maxLength={50}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.name.length}/50 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      disabled={!isOwner}
                      rows={3}
                      maxLength={200}
                      placeholder="Room description..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/200 characters
                    </p>
                  </div>
                </div>

                {/* Owner-only Advanced Settings */}
                {isOwner && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="roomType">Room Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, type: value as any })
                        }
                        disabled={room.type === "general"} // Can't change general rooms
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">
                            <div className="flex items-center space-x-2">
                              <Lock className="h-4 w-4" />
                              <span>Private</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="general">
                            <div className="flex items-center space-x-2">
                              <Globe className="h-4 w-4" />
                              <span>General</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {room.type === "general"
                          ? "General rooms cannot be changed to private"
                          : "Private rooms require invitation to join"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>End-to-End Encryption</Label>
                          <p className="text-sm text-muted-foreground">
                            Secure messages with encryption
                          </p>
                        </div>
                        <Switch
                          checked={formData.isEncrypted}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isEncrypted: checked })
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.isEncrypted
                          ? "Messages are encrypted end-to-end"
                          : "Messages are stored in plain text"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Room Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Room Type</p>
                    <Badge variant="outline">{room.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Members</p>
                    <Badge variant="outline">{room.members.length}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Encryption</p>
                    <div className="flex items-center space-x-1">
                      {room.isEncrypted ? (
                        <>
                          <Lock className="h-4 w-4 text-green-600" />
                          <Badge variant="secondary" className="text-green-700">
                            Encrypted
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline">Not Encrypted</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                {isOwner && (
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent
            value="members"
            className="flex-1 overflow-y-auto space-y-6"
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Room Members</span>
                  <Badge variant="outline">
                    {membersData?.members.length || room.members.length}
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage room members and their permissions.
                </p>
              </div>

              {/* Add Member (Owner Only) */}
              {isOwner && (
                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="space-y-4">
                    <h4 className="font-medium text-green-800 flex items-center space-x-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Invite New Member</span>
                    </h4>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter email address"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleInviteMember}
                        disabled={!newMemberEmail || isInviting}
                        size="sm"
                      >
                        {isInviting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-4">
                <h4 className="font-medium">Current Members</h4>
                <div className="space-y-3">
                  {(membersData?.members || room.members).map((member) => (
                    <div
                      key={member._id || member.user._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                          {(member.name || member.user.name)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium flex items-center space-x-2">
                            <span>{member.name || member.user.name}</span>
                            {(member.isOwner ||
                              (member.user &&
                                member.user._id === room.createdBy._id)) && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.email || member.user.email}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge
                              variant={
                                member.role === MemberRole.ADMIN
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {member.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Joined{" "}
                              {new Date(member.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Member Actions (Owner Only) */}
                      {isOwner &&
                        (member._id || member.user._id) !== currentUserId && (
                          <div className="flex items-center space-x-2">
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => {
                                const memberId = member._id || member.user._id;
                                const memberName =
                                  member.name || member.user.name;
                                handleChangeRole(memberId, newRole, memberName);
                              }}
                              disabled={isChangingRole}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={MemberRole.ADMIN}>
                                  Admin
                                </SelectItem>
                                <SelectItem value={MemberRole.MODERATOR}>
                                  Moderator
                                </SelectItem>
                                <SelectItem value={MemberRole.MEMBER}>
                                  Member
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const memberId = member._id || member.user._id;
                                const memberName =
                                  member.name || member.user.name;
                                handleRemoveMember(memberId, memberName);
                              }}
                              disabled={isRemoving}
                              className="text-red-600 hover:text-red-700"
                            >
                              {isRemoving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserMinus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent
            value="settings"
            className="flex-1 overflow-y-auto space-y-6"
          >
            <div className="space-y-6">
              {/* Owner-only warning */}
              {!isOwner && (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    Only the room owner can modify these settings. You can view
                    the current configuration below.
                  </AlertDescription>
                </Alert>
              )}
              {/* File Upload Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>File Upload Settings</span>
                </h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow File Uploads</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable file sharing in this room
                    </p>
                  </div>
                  <Switch
                    checked={formData.settings.allowFileUploads}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          allowFileUploads: checked,
                        },
                      })
                    }
                    disabled={!isOwner}
                  />
                </div>

                {formData.settings.allowFileUploads && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxFileSize">
                        Maximum File Size (MB)
                      </Label>
                      <Select
                        value={formData.settings.maxFileSize.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              maxFileSize: Number.parseInt(value),
                            },
                          })
                        }
                        disabled={!isOwner}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 MB</SelectItem>
                          <SelectItem value="10">10 MB</SelectItem>
                          <SelectItem value="25">25 MB</SelectItem>
                          <SelectItem value="50">50 MB</SelectItem>
                          <SelectItem value="100">100 MB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allowedFileTypes">
                        Allowed File Types
                      </Label>
                      <Input
                        id="allowedFileTypes"
                        value={formData.settings.allowedFileTypes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              allowedFileTypes: e.target.value,
                            },
                          })
                        }
                        disabled={!isOwner}
                        placeholder="image/*, application/pdf, text/*"
                      />
                      <p className="text-xs text-muted-foreground">
                        Comma-separated MIME types
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Message Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Message Settings</span>
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="messageRetention">
                    Message Retention (days)
                  </Label>
                  <Select
                    value={formData.settings.messageRetention.toString()}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          messageRetention: Number.parseInt(value),
                        },
                      })
                    }
                    disabled={!isOwner}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="0">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How long messages are kept before automatic deletion
                  </p>
                </div>
              </div>

              {/* Security Info */}
              {room.isEncrypted && (
                <>
                  <Separator />
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-800">
                        End-to-End Encryption
                      </h4>
                    </div>
                    <p className="text-sm text-green-700">
                      This room uses end-to-end encryption. Messages are
                      encrypted on your device and can only be read by room
                      members.
                    </p>
                    {/* {room.encryptionKeyId && (
                      <p className="text-xs text-green-600 mt-2 font-mono">
                        Key ID: {room.encryptionKeyId}
                      </p>
                    )} */}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Manage Tab */}
          <TabsContent
            value="manage"
            className="flex-1 overflow-y-auto space-y-6"
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Room Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage room settings and perform administrative actions.
                </p>
              </div>

              {/* Archive Room - Only for Room Owner */}
              {isOwner && !showArchiveConfirm && (
                <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-start space-x-3">
                    <Archive className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-800">
                        Archive Room
                      </h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Archive this room to hide it from active rooms while
                        preserving all data.
                      </p>
                      <Button
                        onClick={() => setShowArchiveConfirm(true)}
                        variant="outline"
                        size="sm"
                        className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Room
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Archive Confirmation */}
              {showArchiveConfirm && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>
                        <strong>Archive this room?</strong>
                      </p>
                      <p className="text-sm">
                        The room will be moved to archived rooms but all
                        messages and files will be preserved. You can unarchive
                        it later if needed.
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleArchiveRoom}
                          disabled={isProcessing}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Archiving...
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive Room
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setShowArchiveConfirm(false)}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* Room Statistics */}
              <div className="space-y-4">
                <h4 className="font-medium">Room Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Members</p>
                    <p className="text-2xl font-bold">{room.members.length}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-lg font-semibold capitalize">
                      {room.type}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm">
                      {new Date(room.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Encryption</p>
                    <p className="text-sm">
                      {room.isEncrypted ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Danger Tab */}
          <TabsContent
            value="danger"
            className="flex-1 overflow-y-auto space-y-6"
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-destructive">
                  Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground">
                  These actions are irreversible. Please be careful.
                </p>
              </div>

              {/* Delete Conversation - Available for all members */}
              {isMember && !showDeleteConversationConfirm && (
                <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-start space-x-3">
                    <MessageSquareX className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-800">
                        Delete Conversation
                      </h4>
                      <p className="text-sm text-orange-700 mt-1">
                        {isOwner || isAdmin
                          ? "Delete all messages in this room for everyone. This action cannot be undone."
                          : "Hide all messages in this room from your view only. Other members will still see the messages. The room itself will remain active."}
                      </p>
                      <Button
                        onClick={() => setShowDeleteConversationConfirm(true)}
                        variant="outline"
                        size="sm"
                        className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        <MessageSquareX className="mr-2 h-4 w-4" />
                        {isOwner || isAdmin
                          ? "Delete Conversation"
                          : "Hide Conversation"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Conversation Confirmation */}
              {showDeleteConversationConfirm && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>
                        <strong>
                          {isOwner || isAdmin
                            ? "Delete all messages for everyone?"
                            : "Hide all messages from your view?"}
                        </strong>
                      </p>
                      <p className="text-sm">
                        {isOwner || isAdmin
                          ? "This will permanently delete all messages, reactions, and files in this room for all members. The room will remain active for new messages."
                          : "This will hide all messages from your view only. Other members will still see all messages. The room will remain active for new messages."}
                      </p>
                      <div className="space-y-2">
                        <Label>
                          Type "
                          {isOwner || isAdmin
                            ? "DELETE MESSAGES"
                            : "HIDE MESSAGES"}
                          " to confirm:
                        </Label>
                        <Input
                          value={confirmationText}
                          onChange={(e) => setConfirmationText(e.target.value)}
                          placeholder={
                            isOwner || isAdmin
                              ? "DELETE MESSAGES"
                              : "HIDE MESSAGES"
                          }
                          className="max-w-xs"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleDeleteConversation}
                          disabled={
                            confirmationText !==
                              (isOwner || isAdmin
                                ? "DELETE MESSAGES"
                                : "HIDE MESSAGES") || isProcessing
                          }
                          variant="destructive"
                          size="sm"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {isOwner || isAdmin ? "Deleting..." : "Hiding..."}
                            </>
                          ) : (
                            <>
                              <MessageSquareX className="mr-2 h-4 w-4" />
                              {isOwner || isAdmin
                                ? "Delete Messages"
                                : "Hide Messages"}
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowDeleteConversationConfirm(false);
                            setConfirmationText("");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Delete Room - Only for Room Owner */}
              {isOwner && room.type !== "general" && (
                <>
                  <Separator />

                  {!showDeleteConfirm && (
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start space-x-3">
                        <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-red-800">
                            Delete Room
                          </h4>
                          <p className="text-sm text-red-700 mt-1">
                            Permanently delete this room and all its data. This
                            cannot be undone.
                          </p>
                          <Button
                            onClick={() => {
                              console.log(
                                "🗑️ [ROOM-SETTINGS] Delete room button clicked - showing confirmation"
                              );
                              setShowDeleteConfirm(true);
                            }}
                            variant="destructive"
                            size="sm"
                            className="mt-3"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Room
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delete Room Confirmation */}
                  {showDeleteConfirm && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-3">
                          <p>
                            <strong>Delete this room permanently?</strong>
                          </p>
                          <p className="text-sm">
                            This will permanently delete the room, all messages,
                            files, and remove all members. This action cannot be
                            undone.
                          </p>
                          <div className="space-y-2">
                            <Label>
                              Type the room name "{room.name}" to confirm:
                            </Label>
                            <Input
                              value={confirmationText}
                              onChange={(e) =>
                                setConfirmationText(e.target.value)
                              }
                              placeholder={room.name}
                              className="max-w-xs"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleDeleteRoom}
                              disabled={
                                confirmationText !== room.name || isProcessing
                              }
                              variant="destructive"
                              size="sm"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Room
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setConfirmationText("");
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
