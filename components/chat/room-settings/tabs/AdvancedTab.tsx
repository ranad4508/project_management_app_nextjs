"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Download,
  AlertTriangle,
  Archive,
  MessageSquareX,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { TabProps } from "../types";
import {
  exportRoomDataExcel,
  exportRoomDataPDF,
  archiveRoom,
  deleteRoom,
  deleteConversation,
} from "@/src/lib/api/room-settings";

interface AdvancedTabProps extends TabProps {
  isOwner: boolean;
  isAdmin: boolean;
}

export default function AdvancedTab({
  room,
  currentUser,
  isOwner,
  isAdmin,
}: AdvancedTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteRoomDialog, setShowDeleteRoomDialog] = useState(false);
  const [showDeleteConversationDialog, setShowDeleteConversationDialog] =
    useState(false);

  const canDeleteRoom = isOwner; // Only owners can delete rooms

  const handleExportExcel = async () => {
    setIsLoading(true);
    try {
      await exportRoomDataExcel(room._id);
      toast.success("Room data exported to Excel successfully");
    } catch (error) {
      toast.error("Failed to export room data to Excel");
      console.error("Error exporting data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsLoading(true);
    try {
      await exportRoomDataPDF(room._id);
      toast.success("Room data exported to PDF successfully");
    } catch (error) {
      toast.error("Failed to export room data to PDF");
      console.error("Error exporting data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveRoom = async () => {
    setIsLoading(true);
    try {
      await archiveRoom(room._id);
      toast.success("Room has been archived");
    } catch (error) {
      toast.error("Failed to archive room");
      console.error("Error archiving room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async () => {
    setIsLoading(true);
    try {
      await deleteConversation(room._id);
      toast.success(
        "The chat history for this conversation has been deleted successfully from your view"
      );
      setShowDeleteConversationDialog(false);
      // Optionally refresh the page to show empty conversation
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error("Failed to delete conversation");
      console.error("Error deleting conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!canDeleteRoom) return;

    setIsLoading(true);
    try {
      await deleteRoom(room._id);
      toast.success("Room has been permanently deleted successfully");
      setShowDeleteRoomDialog(false);
      // Redirect to chat page after successful deletion
      setTimeout(() => {
        window.location.href =
          "/dashboard/workspaces/" + room.workspace + "/chat";
      }, 1000);
    } catch (error) {
      toast.error("Failed to delete room");
      console.error("Error deleting room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export or manage room data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium">Export Room Data</p>
              <p className="text-sm text-muted-foreground">
                Download all messages and files from this room
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Room Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Created:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(room.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Last Activity:</span>
            <span className="text-sm text-muted-foreground">
              {room.updatedAt
                ? new Date(room.updatedAt).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Room Type:</span>
            <Badge variant={room.type === "private" ? "secondary" : "outline"}>
              {room.type || "public"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Encryption:</span>
            <Badge variant={room.isEncrypted ? "secondary" : "outline"}>
              {room.isEncrypted ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            {isOwner
              ? "Irreversible actions that affect the entire room"
              : "Actions that affect your participation in this room"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwner && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Archive Room</p>
                  <p className="text-sm text-muted-foreground">
                    Archive this room to make it read-only
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchiveRoom}
                  disabled={isLoading}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-red-200">
                <div className="space-y-0.5">
                  <p className="font-medium text-red-600">Delete Room</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this room and all its data for all
                    members
                  </p>
                </div>
                <AlertDialog
                  open={showDeleteRoomDialog}
                  onOpenChange={setShowDeleteRoomDialog}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Room
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-600">
                        Delete Room Permanently?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the room "{room.name}", all messages, files, and
                        remove all members. All chat history will be lost
                        forever.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isLoading}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteRoom}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700"
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
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium text-red-600">Delete Conversation</p>
              <p className="text-sm text-muted-foreground">
                Remove this conversation from your view only
              </p>
            </div>
            <AlertDialog
              open={showDeleteConversationDialog}
              onOpenChange={setShowDeleteConversationDialog}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isLoading}>
                  <MessageSquareX className="h-4 w-4 mr-2" />
                  Delete Conversation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">
                    Delete Your Conversation?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all messages from your view in "{room.name}
                    ". This action only affects your account - other members
                    will still see the messages. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConversation}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700"
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
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Important Notice
              </p>
              <p className="text-sm text-amber-700">
                Some actions in this section are irreversible. Please make sure
                you understand the consequences before proceeding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
