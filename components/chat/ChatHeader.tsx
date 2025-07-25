"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
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
import { RoomSettingsDialog } from "./room-settings";
import { InviteToRoomDialog } from "./InviteToRoomDialog";
import { EncryptionStatus } from "./EncryptionStatus";
import {
  updateRoom,
  removeMemberFromRoom,
  updateMemberRole,
} from "@/src/lib/api/room-settings";
import {
  Menu,
  Hash,
  Lock,
  Users,
  Settings,
  UserPlus,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { selectOnlineUsersInRoom } from "@/src/store/slices/chatSlice";
import type { ChatRoom } from "@/src/types/chat.types";
import type { RootState } from "@/src/store";
import { MemberRole } from "@/src/enums/user.enum";
import { toast } from "sonner";

interface ChatHeaderProps {
  room: ChatRoom;
}

export function ChatHeader({ room }: ChatHeaderProps) {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const { isSidebarOpen, isConnected } = useSelector(
    (state: RootState) => state.chat
  );
  const onlineUsers = useSelector(selectOnlineUsersInRoom(room._id));

  // Use NextAuth session directly instead of Redux auth state
  const currentUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || "",
        email: session.user.email || "",
        image: session.user.image || undefined,
        role: session.user.role || undefined,
      }
    : null;

  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [isRegeneratingKeys, setIsRegeneratingKeys] = useState(false);

  // Keep these for potential future use in room actions dropdown
  const isOwner =
    room.createdBy?._id === currentUser?.id ||
    String(room.createdBy?._id) === String(currentUser?.id);
  const userMember = room.members?.find(
    (m) =>
      m.user &&
      (m.user._id === currentUser?.id ||
        String(m.user._id) === String(currentUser?.id))
  );
  const isAdmin = userMember?.role === "admin" || isOwner;

  const handleRegenerateKeys = async () => {
    if (!isAdmin) return;

    setIsRegeneratingKeys(true);
    try {
      const response = await fetch(
        `/api/chat/rooms/${room._id}/regenerate-keys`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Show success message
        console.log("🔑 Encryption keys regenerated successfully");
        toast.success(
          "Encryption keys regenerated successfully! The page will reload to apply changes.",
          {
            duration: 3000,
            action: {
              label: "Reload Now",
              onClick: () => window.location.reload(),
            },
          }
        );
        // Auto-reload after 3 seconds
        setTimeout(() => window.location.reload(), 3000);
      } else {
        console.error("❌ Failed to regenerate encryption keys");
        toast.error("Failed to regenerate encryption keys. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error regenerating encryption keys:", error);
      toast.error(
        "An error occurred while regenerating keys. Please try again."
      );
    } finally {
      setIsRegeneratingKeys(false);
    }
  };

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
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-semibold truncate">
                  {room.name}
                </h1>
              </div>
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

              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleRegenerateKeys}
                    disabled={isRegeneratingKeys}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        isRegeneratingKeys ? "animate-spin" : ""
                      }`}
                    />
                    {isRegeneratingKeys
                      ? "Regenerating Keys..."
                      : "Regenerate Encryption Keys"}
                  </DropdownMenuItem>
                </>
              )}
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
        room={room}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentUser={currentUser}
        onRoomUpdate={updateRoom}
        onMemberRemove={removeMemberFromRoom}
        onMemberRoleChange={updateMemberRole}
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
