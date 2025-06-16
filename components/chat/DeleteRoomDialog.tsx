"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDeleteRoomMutation } from "@/src/store/api/chatApi";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import type { ChatRoom } from "@/src/types/chat.types";

interface DeleteRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
  workspaceId: string;
}

export function DeleteRoomDialog({
  open,
  onOpenChange,
  room,
  workspaceId,
}: DeleteRoomDialogProps) {
  const router = useRouter();
  const [deleteRoom, { isLoading }] = useDeleteRoomMutation();
  const [confirmationText, setConfirmationText] = useState("");

  const expectedText = room.name;
  const isConfirmationValid = confirmationText === expectedText;

  const handleDelete = async () => {
    if (!isConfirmationValid) {
      toast.error("Please type the room name to confirm deletion");
      return;
    }

    try {
      await deleteRoom(room._id).unwrap();
      
      toast.success("Room deleted successfully");
      onOpenChange(false);
      
      // Redirect to workspace chat
      router.push(`/dashboard/workspaces/${workspaceId}/chat`);
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast.error(error.message || "Failed to delete room");
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            <span>Delete Room</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the room and all its messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting this room will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Permanently delete all messages in this room</li>
                <li>Remove all members from the room</li>
                <li>Delete all room invitations</li>
                <li>This action cannot be undone</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <strong>{expectedText}</strong> to confirm deletion:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Type "${expectedText}" here`}
              className={
                confirmationText && !isConfirmationValid
                  ? "border-destructive focus:border-destructive"
                  : ""
              }
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-destructive">
                Text doesn't match. Please type "{expectedText}" exactly.
              </p>
            )}
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Room Details:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Name:</strong> {room.name}</p>
              <p><strong>Type:</strong> {room.type}</p>
              <p><strong>Members:</strong> {room.members.length}</p>
              <p><strong>Created:</strong> {new Date(room.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isConfirmationValid || isLoading}
            >
              {isLoading ? (
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
