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
      (r) => r.user && r.user._id === currentUser?.id
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
    <div className="flex flex-wrap gap-1 mt-2 mb-1">
      {Object.entries(groupedReactions).map(([type, reactionList]) => {
        const hasUserReacted = reactionList.some(
          (r) => r.user && r.user._id === currentUser?.id
        );
        const userNames = reactionList
          .filter((r) => r.user) // Filter out reactions with null user
          .map((r) => r.user.name || "Unknown User")
          .join(", ");

        const tooltipText =
          reactionList.length === 1
            ? `${userNames} reacted with ${
                reactionEmojis[type as ReactionType]
              }`
            : `${userNames} and ${
                reactionList.length - 1
              } others reacted with ${reactionEmojis[type as ReactionType]}`;

        return (
          <TooltipProvider key={type}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-xs rounded-full border transition-all duration-200 hover:scale-105 shadow-sm",
                    hasUserReacted
                      ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                  )}
                  onClick={() => handleReactionClick(type as ReactionType)}
                >
                  <span className="text-sm mr-1">
                    {reactionEmojis[type as ReactionType]}
                  </span>
                  <span
                    className={cn(
                      "font-medium text-xs",
                      hasUserReacted
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {reactionList.length}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
