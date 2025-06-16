"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useInviteToRoomMutation } from "@/src/store/api/chatApi";
import { useGetWorkspaceMembersQuery } from "@/src/store/api/workspaceApi";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Loader2, Mail, AlertCircle } from "lucide-react";
import type { ChatRoom } from "@/src/types/chat.types";

interface InviteToRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
  workspaceId: string;
}

export function InviteToRoomDialog({
  open,
  onOpenChange,
  room,
  workspaceId,
}: InviteToRoomDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [inviteToRoom, { isLoading: isInviting }] = useInviteToRoomMutation();

  // Use the workspace API to fetch members
  const {
    data: workspaceMembersData,
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useGetWorkspaceMembersQuery(workspaceId, {
    skip: !open || !workspaceId, // Only fetch when dialog is open and workspaceId exists
  });

  // Extract members from the API response
  const workspaceMembers = workspaceMembersData?.members || [];

  // Filter members who are not already in the room and match search query
  const availableMembers = workspaceMembers
    .filter((member) => member.user) // Filter out members with null user
    .filter((member) => {
      const isNotInRoom = !room.members.some(
        (roomMember) =>
          roomMember.user && roomMember.user._id === member.user._id
      );
      const matchesSearch =
        member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase());

      return isNotInRoom && matchesSearch;
    });

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;

    try {
      // Send invitations for each selected user
      const invitePromises = selectedUsers.map((userId) =>
        inviteToRoom({
          roomId: room._id,
          userId,
        }).unwrap()
      );

      await Promise.all(invitePromises);

      toast({
        title: "Invitations sent!",
        description: `Successfully invited ${selectedUsers.length} member(s) to the room. Email notifications have been sent.`,
      });

      // Reset state and close dialog
      setSelectedUsers([]);
      setSearchQuery("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to send invitations:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitations",
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    refetchMembers();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Invite to {room.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workspace members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={isLoadingMembers}
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-80">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Loading workspace members...
                  </p>
                </div>
              </div>
            ) : membersError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Failed to load workspace members
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {availableMembers.map((member) => (
                  <div
                    key={member.user._id}
                    className="flex items-center space-x-3 p-3 rounded-lg border"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(member.user._id)}
                      onCheckedChange={() => handleUserToggle(member.user._id)}
                    />

                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={member.user?.avatar || "/placeholder.svg"}
                      />
                      <AvatarFallback>
                        {member.user?.name
                          ? member.user.name.charAt(0).toUpperCase()
                          : "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate">
                          {member.user?.name || "Unknown User"}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.user?.email || "No email"}
                      </p>
                    </div>
                  </div>
                ))}

                {availableMembers.length === 0 &&
                  !isLoadingMembers &&
                  !membersError && (
                    <div className="text-center py-8">
                      <UserPlus className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {searchQuery
                          ? "No members found matching your search"
                          : workspaceMembers.length === 0
                          ? "No members in this workspace"
                          : "All workspace members are already in this room"}
                      </p>
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="mt-2 text-xs"
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  )}
              </div>
            )}
          </ScrollArea>

          {/* Selected count and email notification info */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>
                  {selectedUsers.length} member(s) will receive email
                  invitations
                </span>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                💡 Invited members will receive an email with a direct link to
                join this encrypted room
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedUsers([]);
                setSearchQuery("");
                onOpenChange(false);
              }}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={
                selectedUsers.length === 0 || isInviting || isLoadingMembers
              }
            >
              {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitations{" "}
              {selectedUsers.length > 0 && `(${selectedUsers.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
