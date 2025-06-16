"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreVertical } from "lucide-react";
import type { WorkspaceMember, User } from "@/src/types/workspace.types";
import { MemberRole } from "@/src/enums/user.enum";

interface MemberCardProps {
  member: WorkspaceMember;
  owner: User;
  currentUserId?: string;
  isAdmin: boolean;
  onUpdateRole: (userId: string, role: MemberRole) => void;
  onRemoveMember: (userId: string) => void;
}

export function MemberCard({
  member,
  owner,
  currentUserId,
  isAdmin,
  onUpdateRole,
  onRemoveMember,
}: MemberCardProps) {
  // Add null checks for member.user
  if (!member.user) {
    return null; // Don't render if user is null
  }

  const isOwner = member.user._id === owner._id;
  const isCurrentUser = member.user._id === currentUserId;

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.user?.avatar || "/placeholder.svg"} />
            <AvatarFallback>
              {member.user?.name
                ? member.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{member.user?.name || "Unknown User"}</p>
            <p className="text-sm text-muted-foreground">
              {member.user?.email || "No email"}
            </p>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={member.role === MemberRole.ADMIN ? "default" : "outline"}
          >
            {isOwner ? "Owner" : member.role}
          </Badge>
          {isAdmin && !isCurrentUser && !isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    onUpdateRole(
                      member.user._id,
                      member.role === MemberRole.ADMIN
                        ? MemberRole.MEMBER
                        : MemberRole.ADMIN
                    )
                  }
                >
                  {member.role === MemberRole.ADMIN
                    ? "Demote to Member"
                    : "Promote to Admin"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-red-600"
                    >
                      Remove Member
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {member.user?.name || "this user"} from
                        the workspace. They will lose access to all projects and
                        tasks.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onRemoveMember(member.user._id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
