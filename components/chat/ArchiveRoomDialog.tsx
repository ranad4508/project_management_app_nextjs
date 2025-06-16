"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUpdateRoomMutation } from "@/src/store/api/chatApi";
import { toast } from "sonner";
import { Archive, Loader2, Info } from "lucide-react";
import type { ChatRoom } from "@/src/types/chat.types";

interface ArchiveRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
}

export function ArchiveRoomDialog({
  open,
  onOpenChange,
  room,
}: ArchiveRoomDialogProps) {
  const [updateRoom, { isLoading }] = useUpdateRoomMutation();

  const handleArchive = async () => {
    try {
      await updateRoom({
        roomId: room._id,
        data: {
          isArchived: true,
        },
      }).unwrap();

      toast.success("Room archived successfully");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error archiving room:", error);
      toast.error(error.message || "Failed to archive room");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Archive className="h-5 w-5" />
            <span>Archive Room</span>
          </DialogTitle>
          <DialogDescription>
            Archive this room to hide it from the active rooms list while preserving all messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens when you archive a room:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The room will be moved to the archived section</li>
                <li>All messages and files will be preserved</li>
                <li>Members can still access the room from archived rooms</li>
                <li>You can unarchive the room at any time</li>
                <li>New messages can still be sent in archived rooms</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Room Details:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Name:</strong> {room.name}</p>
              <p><strong>Type:</strong> {room.type}</p>
              <p><strong>Members:</strong> {room.members.length}</p>
              <p><strong>Created:</strong> {new Date(room.createdAt).toLocaleDateString()}</p>
              {room.description && (
                <p><strong>Description:</strong> {room.description}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? (
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
