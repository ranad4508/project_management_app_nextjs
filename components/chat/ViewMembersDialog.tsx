"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  Crown,
  Shield,
  User,
  UserMinus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ChatRoom } from "@/src/types/chat.types";
import { MemberRole } from "@/src/enums/user.enum";

interface ViewMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
  currentUserId: string;
  onRemoveMember?: (memberId: string) => void;
  onUpdateRole?: (memberId: string, role: MemberRole) => void;
}

export function ViewMembersDialog({
  open,
  onOpenChange,
  room,
  currentUserId,
  onRemoveMember,
  onUpdateRole,
}: ViewMembersDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = room.members
    .filter((member) => member.user) // Filter out members with null user
    .filter(
      (member) =>
        member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case MemberRole.ADMIN:
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case MemberRole.MODERATOR:
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: MemberRole) => {
    const variants: Record<
      MemberRole,
      "default" | "secondary" | "outline" | "destructive"
    > = {
      [MemberRole.ADMIN]: "default",
      [MemberRole.MODERATOR]: "secondary",
      [MemberRole.MEMBER]: "outline",
      [MemberRole.GUEST]: "outline",
    };

    return (
      <Badge variant={variants[role]} className="text-xs">
        {role}
      </Badge>
    );
  };

  const isCurrentUserAdmin =
    room.members.find((m) => m.user && m.user._id === currentUserId)?.role ===
      MemberRole.ADMIN ||
    room.members.find((m) => m.user && m.user._id === currentUserId)?.role ===
      MemberRole.MODERATOR;
  const isOwner = room.createdBy && room.createdBy._id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Room Members ({room.members.length})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.user._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
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
                        {getRoleIcon(member.role)}
                        {member.user?._id === currentUserId && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.user?.email || "No email"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{" "}
                        {formatDistanceToNow(new Date(member.joinedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getRoleBadge(member.role)}

                    {/* Actions for admins */}
                    {(isCurrentUserAdmin || isOwner) &&
                      member.user?._id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role !== MemberRole.ADMIN && (
                              <DropdownMenuItem
                                onClick={() =>
                                  member.user?._id &&
                                  onUpdateRole?.(
                                    member.user._id,
                                    MemberRole.ADMIN
                                  )
                                }
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                            )}

                            {member.role !== MemberRole.MODERATOR && (
                              <DropdownMenuItem
                                onClick={() =>
                                  member.user?._id &&
                                  onUpdateRole?.(
                                    member.user._id,
                                    MemberRole.MODERATOR
                                  )
                                }
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Make Moderator
                              </DropdownMenuItem>
                            )}

                            {member.role !== MemberRole.MEMBER && (
                              <DropdownMenuItem
                                onClick={() =>
                                  member.user?._id &&
                                  onUpdateRole?.(
                                    member.user._id,
                                    MemberRole.MEMBER
                                  )
                                }
                              >
                                <User className="mr-2 h-4 w-4" />
                                Make Member
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() =>
                                member.user?._id &&
                                onRemoveMember?.(member.user._id)
                              }
                              className="text-destructive"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                  </div>
                </div>
              ))}

              {filteredMembers.length === 0 && (
                <div className="text-center py-8">
                  <User className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No members found
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
