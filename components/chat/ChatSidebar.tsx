"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setActiveRoom } from "@/src/store/slices/chatSlice";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hash, Lock, Users, MoreHorizontal, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { InviteToRoomDialog } from "./InviteToRoomDialog";
import type { ChatRoom } from "@/src/types/chat.types";
import type { RootState } from "@/src/store";
import { MemberRole } from "@/src/enums/user.enum";

interface ChatSidebarProps {
  rooms: ChatRoom[];
  workspaceId: string;
}

export function ChatSidebar({ rooms, workspaceId }: ChatSidebarProps) {
  const dispatch = useDispatch();
  const { activeRoomId, onlineUsers } = useSelector(
    (state: RootState) => state.chat
  );
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [inviteRoom, setInviteRoom] = useState<ChatRoom | null>(null);

  const handleRoomSelect = (roomId: string) => {
    dispatch(setActiveRoom(roomId));
  };

  const getUnreadCount = (room: ChatRoom) => {
    // This would be calculated based on lastReadAt vs lastMessage
    return 0; // Placeholder
  };

  const getRoomIcon = (room: ChatRoom) => {
    if (room.type === "general") {
      return <Hash className="h-4 w-4" />;
    }
    return room.isEncrypted ? (
      <Lock className="h-4 w-4" />
    ) : (
      <Users className="h-4 w-4" />
    );
  };

  const getOnlineMembersCount = (room: ChatRoom) => {
    return room.members.filter((member) =>
      onlineUsers.some((user) => user.userId === member.user._id)
    ).length;
  };

  const canInviteToRoom = (room: ChatRoom) => {
    if (room.type !== "private") return false;
    const userMember = room.members.find((m) => m.user._id === currentUser?.id);
    return (
      userMember?.role === MemberRole.ADMIN ||
      room.createdBy._id === currentUser?.id
    );
  };

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
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
                    "w-full justify-start h-auto p-3 text-left pr-8",
                    isActive && "bg-accent"
                  )}
                  onClick={() => handleRoomSelect(room._id)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="flex-shrink-0 mt-1">
                      {getRoomIcon(room)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium truncate">
                          {room.name}
                        </h4>
                        {unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-2 h-5 min-w-[20px] text-xs"
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Badge>
                        )}
                      </div>

                      {room.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          <span className="font-medium">
                            {room.lastMessage.sender.name}:
                          </span>{" "}
                          {room.lastMessage.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{room.members.length}</span>
                          {onlineMembersCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">
                                {onlineMembersCount} online
                              </span>
                            </>
                          )}
                        </div>

                        {room.lastActivity && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(room.lastActivity), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>

                {/* Room actions dropdown */}
                {canInvite && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
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
