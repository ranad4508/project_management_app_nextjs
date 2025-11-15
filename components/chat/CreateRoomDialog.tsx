"use client";

import type React from "react";

import { useState } from "react";
import { useCreateRoomMutation } from "@/src/store/api/chatApi";
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
import { Loader2 } from "lucide-react";
import { RoomType } from "@/src/types/chat.types";

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  hasGeneralRoom?: boolean;
}

export function CreateRoomDialog({
  open,
  onOpenChange,
  workspaceId,
  hasGeneralRoom = true,
}: CreateRoomDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: RoomType.PRIVATE,
    isEncrypted: true,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createRoom, { isLoading }] = useCreateRoomMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setErrorMessage(null);
      await createRoom({
        ...formData,
        workspaceId,
      }).unwrap();

      // Reset form and close dialog
      setFormData({
        name: "",
        description: "",
        type: RoomType.PRIVATE,
        isEncrypted: true,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create room:", error);
      if (typeof error === "object" && error !== null && "data" in error) {
        const apiError = error as { data?: { message?: string } };
        setErrorMessage(
          apiError.data?.message || "Failed to create room. Please choose another name."
        );
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to create room. Please choose another name.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter room name"
              required
            />
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter room description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Room Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as RoomType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RoomType.PRIVATE}>Private Room</SelectItem>
                {!hasGeneralRoom && (
                  <SelectItem value={RoomType.GENERAL}>General Room</SelectItem>
                )}
                {hasGeneralRoom && (
                  <SelectItem value={RoomType.GENERAL} disabled>
                    General Room (Already exists)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="encrypted">End-to-End Encryption</Label>
              <p className="text-sm text-muted-foreground">
                Enable encryption for secure messaging
              </p>
            </div>
            <Switch
              id="encrypted"
              checked={formData.isEncrypted}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isEncrypted: checked })
              }
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Room
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
