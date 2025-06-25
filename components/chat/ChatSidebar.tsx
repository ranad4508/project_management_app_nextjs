"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { setActiveRoom } from "@/src/store/slices/chatSlice";
import { Hash, Lock, Users, MoreHorizontal, UserPlus } from "lucide-react";
import type { ChatRoom } from "@/src/types/chat.types";
import { MemberRole } from "@/src/enums/user.enum";
import { InviteToRoomDialog } from "./InviteToRoomDialog";
import { EncryptionStatus } from "./EncryptionStatus";

interface ChatSidebarProps {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  currentUser: any;
  onlineUsers: Array<{ userId: string; userName: string }>;
  isConnected: boolean;
  workspaceId: string;
}

export function ChatSidebar({
  rooms,
  activeRoomId,
  currentUser,
  onlineUsers,
  isConnected,
  workspaceId,
}: ChatSidebarProps) {
  const dispatch = useDispatch();
  const [inviteRoom, setInviteRoom] = useState<ChatRoom | null>(null);

  const handleRoomSelect = (roomId: string) => {
    dispatch(setActiveRoom(roomId));
  };

  const getUnreadCount = (room: ChatRoom) => {
    // This would be calculated based on lastReadAt vs lastMessage
    return 0; // Placeholder
  };

  const getRoomIcon = (room: ChatRoom) => {
    return room.type === "private" ? (
      <Lock className="h-4 w-4" />
    ) : room.type === "general" ? (
      <Hash className="h-4 w-4" />
    ) : (
      <Users className="h-4 w-4" />
    );
  };

  const getOnlineMembersCount = (room: ChatRoom) => {
    console.log(`👥 [SIDEBAR] Calculating online count for room: ${room.name}`);
    console.log(`👥 [SIDEBAR] Total online users: ${onlineUsers.length}`);
    console.log(
      `👥 [SIDEBAR] Online users:`,
      onlineUsers.map((u) => ({ id: u.userId, name: u.userName }))
    );
    console.log(
      `👥 [SIDEBAR] Room members:`,
      room.members
        .filter((m) => m.user)
        .map((m) => ({ id: m.user._id, name: m.user.name }))
    );

    const count = room.members.filter((member) => {
      if (!member.user) return false; // Skip members with null user
      const memberId = member.user._id;
      const isOnline = onlineUsers.some((user) => user.userId === memberId);
      console.log(
        `👥 [SIDEBAR] Member ${member.user.name} (${memberId}): ${
          isOnline ? "ONLINE" : "OFFLINE"
        }`
      );
      return isOnline;
    }).length;

    console.log(
      `👥 [SIDEBAR] Room ${room.name}: ${count} online out of ${room.members.length} members`
    );

    return count;
  };

  const canInviteToRoom = (room: ChatRoom) => {
    if (room.type !== "private") return false;
    const userMember = room.members.find(
      (m) => m.user && m.user._id === currentUser?.id
    );
    return (
      userMember?.role === MemberRole.ADMIN ||
      room.createdBy?._id === currentUser?.id
    );
  };

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-1 sm:p-2">
          {rooms.map((room) => {
            const unreadCount = getUnreadCount(room);
            const onlineMembersCount = getOnlineMembersCount(room);
            const isActive = activeRoomId === room._id;
            const canInvite = canInviteToRoom(room);

            return (
              <div key={room._id} className="group relative">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto p-2 sm:p-3 text-left pr-6 sm:pr-8",
                    isActive && "bg-accent"
                  )}
                  onClick={() => handleRoomSelect(room._id)}
                >
                  <div className="flex items-start space-x-2 sm:space-x-3 w-full">
                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                      {getRoomIcon(room)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-medium truncate">
                          {room.name}
                        </h4>
                        {unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-1 sm:ml-2 h-4 sm:h-5 min-w-[16px] sm:min-w-[20px] text-xs"
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Badge>
                        )}
                      </div>

                      {/* 🔒 Add Encryption Status in Sidebar - Hidden on mobile */}
                      <div className="hidden sm:flex items-center space-x-2 mt-1">
                        <EncryptionStatus
                          room={room}
                          isConnected={isConnected}
                        />
                      </div>

                      {/* Online members count */}
                      <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{onlineMembersCount} online</span>
                      </div>
                    </div>
                  </div>
                </Button>

                {/* Invite button for private rooms */}
                {canInvite && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setInviteRoom(room);
                          }}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Invite Members
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Invite Dialog */}
      {inviteRoom && (
        <InviteToRoomDialog
          open={!!inviteRoom}
          onOpenChange={(open) => !open && setInviteRoom(null)}
          room={inviteRoom}
          workspaceId={workspaceId}
        />
      )}
    </>
  );
}
