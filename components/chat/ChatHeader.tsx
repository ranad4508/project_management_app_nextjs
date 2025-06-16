"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSidebarOpen } from "@/src/store/slices/chatSlice";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ViewMembersDialog } from "./ViewMembersDialog";
import { RoomSettingsDialog } from "./RoomSettingsDialog";
import { InviteToRoomDialog } from "./InviteToRoomDialog";
import { EncryptionStatus } from "./EncryptionStatus";
import {
  Menu,
  Hash,
  Lock,
  Users,
  Settings,
  UserPlus,
  MoreVertical,
} from "lucide-react";
import { selectOnlineUsersInRoom } from "@/src/store/slices/chatSlice";
import type { ChatRoom } from "@/src/types/chat.types";
import type { RootState } from "@/src/store";
import { MemberRole } from "@/src/enums/user.enum";

interface ChatHeaderProps {
  room: ChatRoom;
}

export function ChatHeader({ room }: ChatHeaderProps) {
  const dispatch = useDispatch();
  const { isSidebarOpen, isConnected } = useSelector(
    (state: RootState) => state.chat
  );
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const onlineUsers = useSelector(selectOnlineUsersInRoom(room._id));

  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const getRoomIcon = () => {
    if (room.type === "general") {
      return <Hash className="h-5 w-5" />;
    }
    return room.isEncrypted ? (
      <Lock className="h-5 w-5" />
    ) : (
      <Users className="h-5 w-5" />
    );
  };

  const isAdmin =
    room.members.find((m) => m.user && m.user._id === currentUser?.id)?.role ===
    MemberRole.ADMIN;
  const isOwner = room.createdBy && room.createdBy._id === currentUser?.id;

  return (
    <>
      <div className="flex items-center justify-between border-b bg-card p-2 sm:p-3 lg:p-4">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(setSidebarOpen(!isSidebarOpen))}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden lg:flex"
          >
            <Menu className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {getRoomIcon()}
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base lg:text-lg font-semibold truncate">
                {room.name}
              </h1>
              {room.description && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
                  {room.description}
                </p>
              )}
            </div>
          </div>

          {/* 🔒 Add Encryption Status Here - Hidden on mobile */}
          <div className="hidden md:block">
            <EncryptionStatus room={room} isConnected={isConnected} />
          </div>

          {room.type === "private" && (
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              Private Room
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Online members - Responsive */}
          <div className="hidden sm:flex items-center space-x-1">
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 3).map((user) => (
                <Avatar
                  key={user.userId}
                  className="h-5 w-5 sm:h-6 sm:w-6 border-2 border-background"
                >
                  <AvatarImage src={user.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-xs">
                    {user.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline">
              {onlineUsers.length} online
            </span>
          </div>

          {/* Mobile online count */}
          <div className="sm:hidden">
            <span className="text-xs text-muted-foreground">
              {onlineUsers.length}
            </span>
          </div>

          {/* Room actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              >
                <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowMembers(true)}>
                <Users className="mr-2 h-4 w-4" />
                View Members ({room.members.length})
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setShowInvite(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Members
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Room Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialogs */}
      <ViewMembersDialog
        open={showMembers}
        onOpenChange={setShowMembers}
        room={room}
        currentUserId={currentUser?.id || ""}
      />

      <RoomSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        room={room}
        currentUserId={currentUser?.id || ""}
      />

      <InviteToRoomDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        room={room}
        workspaceId={
          typeof room.workspace === "string"
            ? room.workspace
            : (room.workspace as any)?._id || room.workspace
        }
      />
    </>
  );
}
