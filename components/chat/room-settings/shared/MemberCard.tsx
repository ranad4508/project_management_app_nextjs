"use client";

import { Button } from "@/components/ui/button";
import { Crown, UserMinus } from "lucide-react";
import { MemberRole } from "@/src/types/chat.types";

import RoleSelector from "./RoleSelector";
import { MemberCardProps } from "../types";

export default function MemberCard({
  member,
  currentUser,
  room,
  onRemove,
  onRoleChange,
}: MemberCardProps) {
  // Safety checks for member data
  if (!member || (!member.name && !member.user)) {
    return null;
  }

  const memberName = member.name || (member.user && member.user.name) || 'Unknown User';
  const memberEmail = member.email || (member.user && member.user.email) || 'No email';
  const memberId = member._id || (member.user && member.user._id) || 'unknown';
  
  // Check if this member is the room owner
  const isOwner = member.isOwner || (member.user && room.createdBy && member.user._id === room.createdBy._id);
  
  // Check if current user is the room owner
  const currentUserIsOwner = room.createdBy && room.createdBy._id === currentUser?.id;
  
  // Check if current user is admin
  const currentUserMember = room.members?.find(
    (m) => m.user && m.user._id === currentUser?.id
  );
  const currentUserIsAdmin = currentUserMember?.role === "admin" || currentUserIsOwner;
  
  // Can't remove or change role of owner
  const canModify = !isOwner && currentUserIsAdmin && memberId !== currentUser?.id;

  const handleRoleChange = (newRole: MemberRole) => {
    if (onRoleChange) {
      onRoleChange(memberId, newRole, memberName);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(memberId, memberName);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
          {memberName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium flex items-center space-x-2">
            <span>{memberName}</span>
            {isOwner && (
              <Crown className="h-4 w-4 text-yellow-500" />
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {memberEmail}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {!isOwner && (
          <RoleSelector
            currentRole={member.role || "member"}
            onRoleChange={handleRoleChange}
            disabled={!canModify}
            canChangeRole={canModify}
          />
        )}
        
        {canModify && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700"
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
