"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Shield, MoreHorizontal } from "lucide-react";

import { GeneralTab, MembersTab, SecurityTab, AdvancedTab } from "./tabs";
import { RoomSettingsProps } from "./types";
import { useGetWorkspaceByIdQuery } from "@/src/store/api/workspaceApi";

export default function RoomSettingsDialog({
  room,
  isOpen,
  onClose,
  currentUser,
  onRoomUpdate,
  onMemberRemove,
  onMemberRoleChange,
}: RoomSettingsProps) {
  const [activeTab, setActiveTab] = useState("general");

  // Get workspace data to check if current user is workspace owner
  const workspaceId = room.workspace;
  const { data: workspace } = useGetWorkspaceByIdQuery(workspaceId, {
    skip: !workspaceId,
  });

  // Check if current user is room owner
  const isRoomOwnerStrict = room.createdBy?._id === currentUser?.id;
  const isRoomOwnerString =
    String(room.createdBy?._id) === String(currentUser?.id);
  const isRoomOwner = isRoomOwnerStrict || isRoomOwnerString;

  // Check if current user is workspace owner
  const isWorkspaceOwnerStrict = workspace?.owner?._id === currentUser?.id;
  const isWorkspaceOwnerString =
    String(workspace?.owner?._id) === String(currentUser?.id);
  const isWorkspaceOwner = isWorkspaceOwnerStrict || isWorkspaceOwnerString;

  // Combined owner check (room owner OR workspace owner)
  const isOwner = isRoomOwner || isWorkspaceOwner;

  // Check if current user is admin
  const userMember = room.members?.find(
    (m) =>
      m.user &&
      (m.user._id === currentUser?.id ||
        String(m.user._id) === String(currentUser?.id))
  );
  const isAdmin = userMember?.role === "admin";

  // Check if user is a member of the room
  const isMemberOfRoom = room.members?.some(
    (m) =>
      m.user &&
      (m.user._id === currentUser?.id ||
        String(m.user._id) === String(currentUser?.id))
  );

  // Proper access control
  const canEditSettings = isOwner || isAdmin;
  const canManageMembers = isOwner || isAdmin;
  const canDeleteRoom = isOwner || isAdmin; // Owners and admins can delete rooms
  const canArchiveRoom = isOwner; // Only owners can archive rooms

  // Enhanced debug logging
  console.log("🔍 [ROOM-SETTINGS] Permission Debug:", {
    // Room data structure
    room: room,
    roomKeys: Object.keys(room),

    // Current user info
    currentUser: currentUser,
    currentUserId: currentUser?.id,
    currentUserIdType: typeof currentUser?.id,

    // Room creator info
    roomCreatedBy: room.createdBy,
    roomCreatedByType: typeof room.createdBy,
    roomCreatedById: room.createdBy?._id,
    roomCreatedByIdType: typeof room.createdBy?._id,
    roomCreatedByName: room.createdBy?.name,

    // Workspace info
    workspace: workspace,
    workspaceOwner: workspace?.owner,
    workspaceOwnerId: workspace?.owner?._id,

    // Permission calculations
    isRoomOwnerStrict,
    isRoomOwnerString,
    isRoomOwner,
    isWorkspaceOwnerStrict,
    isWorkspaceOwnerString,
    isWorkspaceOwner,
    isOwner,

    // Member info
    userMember,
    userMemberRole: userMember?.role,
    isAdmin,
    isMemberOfRoom,

    // Final permissions
    canEditSettings,
    canManageMembers,
    canDeleteRoom,
    canArchiveRoom,
    roomMembers: room.members?.map((m) => ({
      userId: m.user?._id,
      userIdType: typeof m.user?._id,
      role: m.role,
      name: m.user?.name,
    })),
    // String comparison test
    stringComparison: room.createdBy?._id === currentUser?.id,
    stringComparisonResult: `"${room.createdBy?._id}" === "${currentUser?.id}"`,

    // Additional debugging for ID comparison
    exactComparison: {
      roomCreatorId: room.createdBy?._id,
      currentUserId: currentUser?.id,
      strictEqual: room.createdBy?._id === currentUser?.id,
      stringEqual: String(room.createdBy?._id) === String(currentUser?.id),
      bothAsStrings: `"${String(room.createdBy?._id)}" === "${String(
        currentUser?.id
      )}"`,
    },
  });

  const tabProps = {
    room,
    currentUser,
    onRoomUpdate,
    onMemberRemove,
    onMemberRoleChange,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Room Settings - {room.name}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="general"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="flex items-center space-x-2"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span>Advanced</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 overflow-y-auto max-h-[60vh]">
            <TabsContent value="general" className="space-y-6">
              <GeneralTab {...tabProps} isOwner={isOwner} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="members" className="space-y-6">
              <MembersTab {...tabProps} isOwner={isOwner} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <SecurityTab {...tabProps} isOwner={isOwner} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <AdvancedTab {...tabProps} isOwner={isOwner} isAdmin={isAdmin} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
