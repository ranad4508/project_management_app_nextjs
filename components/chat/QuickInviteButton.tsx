"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InviteToRoomDialog } from "./InviteToRoomDialog";
import { UserPlus } from "lucide-react";
import { selectActiveRoom } from "@/src/store/slices/chatSlice";
import type { RootState } from "@/src/store";
import { MemberRole } from "@/src/enums/user.enum";

interface QuickInviteButtonProps {
  workspaceId: string;
}

export function QuickInviteButton({ workspaceId }: QuickInviteButtonProps) {
  const [showInvite, setShowInvite] = useState(false);
  const activeRoom = useSelector(selectActiveRoom);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  if (!activeRoom || activeRoom.type !== "private") {
    return null;
  }

  const isAdmin =
    activeRoom.members.find((m) => m.user._id === currentUser?.id)?.role ===
    MemberRole.ADMIN;
  const isOwner = activeRoom.createdBy._id === currentUser?.id;
  const canInvite = isAdmin || isOwner;

  if (!canInvite) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setShowInvite(true)}
              size="sm"
              className="fixed bottom-20 right-6 h-12 w-12 rounded-full shadow-lg z-50"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Invite members to {activeRoom.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <InviteToRoomDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        room={activeRoom}
        workspaceId={workspaceId}
      />
    </>
  );
}
