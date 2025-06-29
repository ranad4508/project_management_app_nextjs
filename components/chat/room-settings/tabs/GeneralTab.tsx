"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save, Edit3 } from "lucide-react";
import { toast } from "sonner";

import { TabProps } from "../types";

interface GeneralTabProps extends TabProps {
  isOwner: boolean;
  isAdmin: boolean;
}

export default function GeneralTab({
  room,
  currentUser,
  onRoomUpdate,
  isOwner,
  isAdmin,
}: GeneralTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: room.name || "",
    description: room.description || "",
    isPrivate: room.type === "private",
    isEncrypted: room.isEncrypted || false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const canEdit = isOwner || isAdmin; // Owners and admins can edit general settings

  // Debug logging for GeneralTab
  console.log("🔍 [GENERAL-TAB] Permission Debug:", {
    isOwner,
    isAdmin,
    canEdit,
    isEditing,
    shouldShowEditButton: canEdit && !isEditing,
  });

  const handleSave = async () => {
    if (!onRoomUpdate) return;

    setIsLoading(true);
    try {
      await onRoomUpdate(room._id, {
        name: formData.name,
        description: formData.description,
        type: formData.isPrivate ? "private" : "public",
        isEncrypted: formData.isEncrypted,
      });

      setIsEditing(false);
      toast.success("Room settings updated successfully");
    } catch (error) {
      toast.error("Failed to update room settings");
      console.error("Error updating room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: room.name || "",
      description: room.description || "",
      isPrivate: room.type === "private",
      isEncrypted: room.isEncrypted || false,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Basic Information</span>
            {/* Temporarily force show edit button for testing */}
            {(canEdit || true) && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className={!canEdit ? "opacity-50" : ""}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Manage basic room information and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={!isEditing}
              placeholder="Enter room name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-description">Description</Label>
            <Textarea
              id="room-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={!isEditing}
              placeholder="Enter room description"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Private Room</Label>
                <p className="text-sm text-muted-foreground">
                  Only invited members can join this room
                </p>
              </div>
              <Switch
                checked={formData.isPrivate}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPrivate: checked })
                }
                disabled={!isEditing}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>End-to-End Encryption</Label>
                <p className="text-sm text-muted-foreground">
                  Encrypt all messages in this room
                </p>
              </div>
              <Switch
                checked={formData.isEncrypted}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isEncrypted: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex space-x-2 pt-4">
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Room Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Created:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(room.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Members:</span>
            <span className="text-sm text-muted-foreground">
              {room.members?.length || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Room ID:</span>
            <span className="text-sm text-muted-foreground font-mono">
              {room._id}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
