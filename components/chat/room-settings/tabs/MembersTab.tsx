"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Search, UserMinus, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";

import MemberCard from "../shared/MemberCard";
import { TabProps } from "../types";
import { MemberRole } from "@/src/types/chat.types";
import { useInviteMemberByEmailMutation } from "@/src/store/api/chatApi";

interface MembersTabProps extends TabProps {
  isOwner: boolean;
  isAdmin: boolean;
}

export default function MembersTab({
  room,
  currentUser,
  onMemberRemove,
  onMemberRoleChange,
  isOwner,
  isAdmin,
}: MembersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState(room.members || []);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [inviteMemberByEmail] = useInviteMemberByEmailMutation();

  useEffect(() => {
    setMembers(room.members || []);
    setSelectedMembers([]); // Clear selection when room changes
  }, [room.members]);

  // Handle member selection
  const handleMemberSelect = (memberId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers((prev) => [...prev, memberId]);
    } else {
      setSelectedMembers((prev) => prev.filter((id) => id !== memberId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableMembers = filteredMembers
        .filter((member) => {
          const memberId = member._id || (member.user && member.user._id);
          const isOwner =
            member.isOwner ||
            (member.user &&
              room.createdBy &&
              member.user._id === room.createdBy._id);
          return memberId !== currentUser?.id && !isOwner; // Can't select self or owner
        })
        .map((member) => member._id || (member.user && member.user._id))
        .filter(Boolean);
      setSelectedMembers(selectableMembers);
    } else {
      setSelectedMembers([]);
    }
  };

  // Handle invite member
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsInviting(true);
    try {
      const result = await inviteMemberByEmail({
        roomId: room._id,
        email: inviteEmail.trim(),
      }).unwrap();

      toast.success(result.message);
      setInviteEmail("");
      setShowInviteDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  // Handle bulk remove
  const handleBulkRemove = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select members to remove");
      return;
    }

    setIsRemoving(true);
    try {
      const promises = selectedMembers.map(async (memberId) => {
        const member = members.find(
          (m) => (m._id || (m.user && m.user._id)) === memberId
        );
        const memberName =
          member?.name || (member?.user && member.user.name) || "Unknown";

        if (onMemberRemove) {
          await onMemberRemove(room._id, memberId);
        }
        return memberName;
      });

      const removedNames = await Promise.all(promises);

      // Update local state
      setMembers((prev) =>
        prev.filter((m) => {
          const id = m._id || (m.user && m.user._id);
          return !selectedMembers.includes(id);
        })
      );

      setSelectedMembers([]);
      setShowRemoveDialog(false);

      toast.success(
        `Successfully removed ${
          removedNames.length
        } member(s): ${removedNames.join(", ")}`
      );
    } catch (error) {
      toast.error("Failed to remove some members");
      console.error("Error removing members:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    if (!member) return false;
    const memberName = member.name || (member.user && member.user.name) || "";
    const memberEmail =
      member.email || (member.user && member.user.email) || "";
    const searchLower = searchTerm.toLowerCase();
    return (
      memberName.toLowerCase().includes(searchLower) ||
      memberEmail.toLowerCase().includes(searchLower)
    );
  });

  const handleMemberRemove = async (memberId: string, memberName: string) => {
    if (!onMemberRemove) return;

    try {
      await onMemberRemove(room._id, memberId);

      // Update local state
      setMembers((prev) =>
        prev.filter((m) => {
          const id = m._id || (m.user && m.user._id);
          return id !== memberId;
        })
      );

      toast.success(`${memberName} has been removed from the room`);
    } catch (error) {
      toast.error(`Failed to remove ${memberName}`);
      console.error("Error removing member:", error);
    }
  };

  const handleRoleChange = async (
    memberId: string,
    newRole: MemberRole,
    memberName: string
  ) => {
    if (!onMemberRoleChange) return;

    try {
      await onMemberRoleChange(room._id, memberId, newRole);

      // Update local state
      setMembers((prev) =>
        prev.map((m) => {
          const id = m._id || (m.user && m.user._id);
          if (id === memberId) {
            return { ...m, role: newRole };
          }
          return m;
        })
      );

      toast.success(`${memberName}'s role has been updated to ${newRole}`);
    } catch (error) {
      toast.error(`Failed to update ${memberName}'s role`);
      console.error("Error updating member role:", error);
    }
  };

  const canManageMembers = isAdmin || isOwner; // Admins and owners can manage members

  // Calculate selection state
  const selectableMembers = filteredMembers.filter((member) => {
    const memberId = member._id || (member.user && member.user._id);
    const isMemberOwner =
      member.isOwner ||
      (member.user && room.createdBy && member.user._id === room.createdBy._id);
    return memberId !== currentUser?.id && !isMemberOwner;
  });

  const allSelectableSelected =
    selectableMembers.length > 0 &&
    selectableMembers.every((member) => {
      const memberId = member._id || (member.user && member.user._id);
      return selectedMembers.includes(memberId);
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Room Members ({filteredMembers.length})</span>
            <div className="flex items-center space-x-2">
              {canManageMembers && selectedMembers.length > 0 && (
                <AlertDialog
                  open={showRemoveDialog}
                  onOpenChange={setShowRemoveDialog}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Selected ({selectedMembers.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-600">
                        Remove Selected Members?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will remove {selectedMembers.length}{" "}
                        member(s) from the room "{room.name}". They will lose
                        access to all messages and room content. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isRemoving}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkRemove}
                        disabled={isRemoving}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isRemoving ? "Removing..." : "Remove Members"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {canManageMembers && (
                <Dialog
                  open={showInviteDialog}
                  onOpenChange={setShowInviteDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Member to Room</DialogTitle>
                      <DialogDescription>
                        Enter the email address of the person you want to invite
                        to "{room.name}". They will receive an email invitation
                        with a link to join.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="Enter email address..."
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={isInviting}
                        />
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>
                          An email invitation will be sent to this address
                        </span>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowInviteDialog(false)}
                        disabled={isInviting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleInviteMember}
                        disabled={isInviting || !inviteEmail.trim()}
                      >
                        {isInviting ? "Sending..." : "Send Invitation"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Manage room members and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All Checkbox */}
          {canManageMembers && selectableMembers.length > 0 && (
            <div className="flex items-center space-x-2 p-2 border rounded-lg bg-muted/50">
              <Checkbox
                id="select-all"
                checked={allSelectableSelected}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                Select all removable members ({selectableMembers.length})
              </Label>
              {selectedMembers.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({selectedMembers.length} selected)
                </span>
              )}
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const memberId =
                  member._id || (member.user && member.user._id) || "unknown";
                const isMemberOwner =
                  member.isOwner ||
                  (member.user &&
                    room.createdBy &&
                    member.user._id === room.createdBy._id);
                const isCurrentUser = memberId === currentUser?.id;
                const canSelect =
                  canManageMembers && !isMemberOwner && !isCurrentUser;
                const isSelected = selectedMembers.includes(memberId);

                return (
                  <div key={memberId} className="flex items-center space-x-3">
                    {canSelect && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleMemberSelect(memberId, checked as boolean)
                        }
                      />
                    )}
                    <div className="flex-1">
                      <MemberCard
                        member={member}
                        currentUser={currentUser}
                        room={room}
                        onRemove={
                          canManageMembers ? handleMemberRemove : undefined
                        }
                        onRoleChange={
                          canManageMembers ? handleRoleChange : undefined
                        }
                        hideRemoveButton={canSelect}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm
                  ? "No members found matching your search"
                  : "No members found"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Member Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Total Members:</span>
            <span className="text-sm text-muted-foreground">
              {members.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Admins:</span>
            <span className="text-sm text-muted-foreground">
              {members.filter((m) => m.role === "admin").length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Regular Members:</span>
            <span className="text-sm text-muted-foreground">
              {members.filter((m) => m.role === "member").length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
