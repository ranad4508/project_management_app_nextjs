"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Search } from "lucide-react";
import { toast } from "sonner";

import MemberCard from "../shared/MemberCard";
import { TabProps } from "../types";
import { MemberRole } from "@/src/types/chat.types";

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

  useEffect(() => {
    setMembers(room.members || []);
  }, [room.members]);

  const filteredMembers = members.filter((member) => {
    if (!member) return false;
    const memberName = member.name || (member.user && member.user.name) || '';
    const memberEmail = member.email || (member.user && member.user.email) || '';
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
      setMembers(prev => prev.filter(m => {
        const id = m._id || (m.user && m.user._id);
        return id !== memberId;
      }));
      
      toast.success(`${memberName} has been removed from the room`);
    } catch (error) {
      toast.error(`Failed to remove ${memberName}`);
      console.error("Error removing member:", error);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: MemberRole, memberName: string) => {
    if (!onMemberRoleChange) return;

    try {
      await onMemberRoleChange(room._id, memberId, newRole);
      
      // Update local state
      setMembers(prev => prev.map(m => {
        const id = m._id || (m.user && m.user._id);
        if (id === memberId) {
          return { ...m, role: newRole };
        }
        return m;
      }));
      
      toast.success(`${memberName}'s role has been updated to ${newRole}`);
    } catch (error) {
      toast.error(`Failed to update ${memberName}'s role`);
      console.error("Error updating member role:", error);
    }
  };

  const canManageMembers = isAdmin; // Admins and owners can manage members

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Room Members ({filteredMembers.length})</span>
            {canManageMembers && (
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
            )}
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

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const memberId = member._id || (member.user && member.user._id) || 'unknown';
                return (
                  <MemberCard
                    key={memberId}
                    member={member}
                    currentUser={currentUser}
                    room={room}
                    onRemove={canManageMembers ? handleMemberRemove : undefined}
                    onRoleChange={canManageMembers ? handleRoleChange : undefined}
                  />
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No members found matching your search" : "No members found"}
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
              {members.filter(m => m.role === "admin").length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Regular Members:</span>
            <span className="text-sm text-muted-foreground">
              {members.filter(m => m.role === "member").length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
