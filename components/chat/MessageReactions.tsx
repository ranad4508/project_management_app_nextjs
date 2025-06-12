"use client";

import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSocket } from "./SocketProvider";
import { cn } from "@/lib/utils";
import type { MessageReaction, ReactionType } from "@/src/types/chat.types";
import type { RootState } from "@/src/store";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  messageId: string;
}

const reactionEmojis: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  angry: "😠",
  sad: "😢",
  thumbs_up: "👍",
  thumbs_down: "👎",
};

export function MessageReactions({
  reactions,
  messageId,
}: MessageReactionsProps) {
  const { addReaction, removeReaction } = useSocket();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Group reactions by type
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.type]) {
      acc[reaction.type] = [];
    }
    acc[reaction.type].push(reaction);
    return acc;
  }, {} as Record<ReactionType, MessageReaction[]>);

  const handleReactionClick = (type: ReactionType) => {
    const userReaction = groupedReactions[type]?.find(
      (r) => r.user._id === currentUser?.id
    );

    if (userReaction) {
      removeReaction(messageId, userReaction._id);
    } else {
      addReaction(messageId, type);
    }
  };

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(groupedReactions).map(([type, reactionList]) => {
        const hasUserReacted = reactionList.some(
          (r) => r.user._id === currentUser?.id
        );
        const userNames = reactionList.map((r) => r.user.name).join(", ");

        return (
          <TooltipProvider key={type}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-xs",
                    hasUserReacted && "bg-primary/10 border-primary"
                  )}
                  onClick={() => handleReactionClick(type as ReactionType)}
                >
                  <span className="mr-1">
                    {reactionEmojis[type as ReactionType]}
                  </span>
                  {reactionList.length}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{userNames}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
