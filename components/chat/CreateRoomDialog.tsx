"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2, Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreating: boolean;
  onSubmit: (data: {
    name: string;
    description: string;
    type: "group" | "workspace";
  }) => Promise<void>;
  showTrigger?: boolean; // Optional prop to show/hide the trigger button
}

export default function CreateRoomDialog({
  open,
  onOpenChange,
  isCreating,
  onSubmit,
  showTrigger = true,
}: CreateRoomDialogProps) {
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] = useState<"group" | "workspace">(
    "group"
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      await onSubmit({
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
        type: newRoomType,
      });
      // Don't close dialog here - let parent component handle it
      resetForm();
    } catch (error) {
      // Error handling can be done by parent component
      console.error("Failed to create room:", error);
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomType("group");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Encrypted Chat Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="roomName" className="text-sm font-medium">
              Room Name *
            </label>
            <Input
              id="roomName"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name"
              required
              disabled={isCreating}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="roomDescription" className="text-sm font-medium">
              Description (Optional)
            </label>
            <Textarea
              id="roomDescription"
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              placeholder="Enter room description"
              rows={3}
              disabled={isCreating}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="roomType" className="text-sm font-medium">
              Room Type
            </label>
            <Select
              value={newRoomType}
              onValueChange={(value: "group" | "workspace") =>
                setNewRoomType(value)
              }
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Group Chat</SelectItem>
                <SelectItem value="workspace">Workspace Channel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              All messages in this room will be end-to-end encrypted.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !newRoomName.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Room"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
