"use client";

import type React from "react";

import { useState } from "react";
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
    settings: {
      allowFileUploads: room.settings.allowFileUploads,
      maxFileSize: room.settings.maxFileSize / (1024 * 1024), // Convert to MB
      allowedFileTypes: room.settings.allowedFileTypes.join(", "),
      messageRetention: room.settings.messageRetention,
    },
  });

  const isAdmin =
    room.members.find((m) => m.user && m.user._id === currentUserId)?.role ===
    MemberRole.ADMIN;
  const isOwner = room.createdBy && room.createdBy._id === currentUserId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateRoom({
        roomId: room._id,
        data: {
          name: formData.name,
          description: formData.description,
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

      toast.success("Room settings updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating room settings:", error);
      toast.error(error.message || "Failed to update room settings");
    }
  };

  const handleArchiveRoom = async () => {
    setIsProcessing(true);
    try {
      await updateRoom({
        roomId: room._id,
        data: { isArchived: true },
      }).unwrap();

      toast.success("Room archived successfully");
      setShowArchiveConfirm(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error archiving room:", error);
      toast.error(error.message || "Failed to archive room");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (confirmationText !== room.name) {
      toast.error("Please type the room name to confirm deletion");
      return;
    }

    setIsProcessing(true);
    try {
      await deleteRoom(room._id).unwrap();

      toast.success("Room deleted successfully");
      setShowDeleteConfirm(false);
      onOpenChange(false);

      // Redirect to workspace chat
      const workspaceId =
        typeof room.workspace === "string"
          ? room.workspace
          : (room.workspace as any)?._id || room.workspace;
      router.push(`/dashboard/workspaces/${workspaceId}/chat`);
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast.error(error.message || "Failed to delete room");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (confirmationText !== "DELETE MESSAGES") {
      toast.error("Please type 'DELETE MESSAGES' to confirm");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/chat/rooms/${room._id}/messages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete conversation");
      }

      toast.success("All messages deleted successfully");
      setShowDeleteConversationConfirm(false);
      setConfirmationText("");

      // Refresh the page to show empty conversation
      window.location.reload();
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Room Settings</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="general"
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
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
                      disabled={!isAdmin && !isOwner}
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
                      disabled={!isAdmin && !isOwner}
                      rows={3}
                      maxLength={200}
                      placeholder="Room description..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/200 characters
                    </p>
                  </div>
                </div>

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
                {(isAdmin || isOwner) && (
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

          {/* Settings Tab */}
          <TabsContent
            value="settings"
            className="flex-1 overflow-y-auto space-y-6"
          >
            <div className="space-y-6">
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
                    disabled={!isAdmin && !isOwner}
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
                        disabled={!isAdmin && !isOwner}
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
                        disabled={!isAdmin && !isOwner}
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
                    disabled={!isAdmin && !isOwner}
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
                    {room.encryptionKeyId && (
                      <p className="text-xs text-green-600 mt-2 font-mono">
                        Key ID: {room.encryptionKeyId}
                      </p>
                    )}
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

              {/* Archive Room */}
              {(isAdmin || isOwner) && !showArchiveConfirm && (
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

              {/* Delete Conversation */}
              {!showDeleteConversationConfirm && (
                <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-start space-x-3">
                    <MessageSquareX className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-800">
                        Delete Conversation
                      </h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Delete all messages in this room. The room itself will
                        remain active.
                      </p>
                      <Button
                        onClick={() => setShowDeleteConversationConfirm(true)}
                        variant="outline"
                        size="sm"
                        className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        <MessageSquareX className="mr-2 h-4 w-4" />
                        Delete Conversation
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
                        <strong>Delete all messages?</strong>
                      </p>
                      <p className="text-sm">
                        This will permanently delete all messages, reactions,
                        and files in this room. The room will remain active for
                        new messages.
                      </p>
                      <div className="space-y-2">
                        <Label>Type "DELETE MESSAGES" to confirm:</Label>
                        <Input
                          value={confirmationText}
                          onChange={(e) => setConfirmationText(e.target.value)}
                          placeholder="DELETE MESSAGES"
                          className="max-w-xs"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleDeleteConversation}
                          disabled={
                            confirmationText !== "DELETE MESSAGES" ||
                            isProcessing
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
                              <MessageSquareX className="mr-2 h-4 w-4" />
                              Delete Messages
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

              {/* Delete Room */}
              {(isAdmin || isOwner) && room.type !== "general" && (
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
                            onClick={() => setShowDeleteConfirm(true)}
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
