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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { MessageSquareX, Loader2, AlertTriangle } from "lucide-react";
import type { ChatRoom } from "@/src/types/chat.types";

interface DeleteConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
}

export function DeleteConversationDialog({
  open,
  onOpenChange,
  room,
}: DeleteConversationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const expectedText = "DELETE MESSAGES";
  const isConfirmationValid = confirmationText === expectedText;

  const handleDeleteConversation = async () => {
    if (!isConfirmationValid) {
      toast.error("Please type 'DELETE MESSAGES' to confirm");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/chat/rooms/${room._id}/messages`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete conversation");
      }

      toast.success("All messages deleted successfully");
      onOpenChange(false);
      setConfirmationText("");
      
      // Refresh the page to show empty conversation
      window.location.reload();
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      toast.error(error.message || "Failed to delete conversation");
    } finally {
      setIsLoading(false);
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
          <DialogTitle className="flex items-center space-x-2 text-orange-600">
            <MessageSquareX className="h-5 w-5" />
            <span>Delete Conversation</span>
          </DialogTitle>
          <DialogDescription>
            This will permanently delete all messages in this room. The room itself will remain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Permanently delete all messages in this room</li>
                <li>Remove all message reactions and replies</li>
                <li>Delete all uploaded files and attachments</li>
                <li>Clear the entire conversation history</li>
                <li><strong>This action cannot be undone</strong></li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> The room will remain active and members can continue sending new messages after the conversation is deleted.
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
              {room.isEncrypted && (
                <p className="text-green-600"><strong>🔒 End-to-End Encrypted</strong></p>
              )}
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
              onClick={handleDeleteConversation}
              disabled={!isConfirmationValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <MessageSquareX className="mr-2 h-4 w-4" />
                  Delete Conversation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
