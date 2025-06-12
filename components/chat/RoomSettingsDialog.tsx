"use client";

import type React from "react";

import { useState } from "react";
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
import { useUpdateRoomMutation } from "@/src/store/api/chatApi";
import { useToast } from "@/hooks/use-toast";
import { Settings, Lock, Upload, Clock, Trash2, Shield } from "lucide-react";
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
  const { toast } = useToast();
  const [updateRoom, { isLoading }] = useUpdateRoomMutation();

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
    room.members.find((m) => m.user._id === currentUserId)?.role ===
    MemberRole.ADMIN;
  const isOwner = room.createdBy._id === currentUserId;

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

      toast({
        title: "Settings updated",
        description: "Room settings have been updated successfully.",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update room settings",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Room Settings</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="name">Room Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={!isAdmin && !isOwner}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={!isAdmin && !isOwner}
                rows={3}
                placeholder="Room description..."
              />
            </div>

            {/* Room Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Room Type</p>
                <Badge variant="outline">{room.type}</Badge>
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

          <Separator />

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
              <>
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
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
                  <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
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
                    Comma-separated MIME types (e.g., image/*, application/pdf)
                  </p>
                </div>
              </>
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
              <Label htmlFor="messageRetention">Message Retention (days)</Label>
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
                  This room uses end-to-end encryption. Messages are encrypted
                  on your device and can only be read by room members.
                </p>
                {room.encryptionKeyId && (
                  <p className="text-xs text-green-600 mt-2 font-mono">
                    Key ID: {room.encryptionKeyId}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <div>
              {(isOwner || isAdmin) && room.type === "private" && (
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Room
                </Button>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {(isAdmin || isOwner) && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
