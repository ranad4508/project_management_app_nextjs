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
import type { MessageReaction } from "@/src/types/chat.types";
import type { RootState } from "@/src/store";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  messageId: string;
}

const reactionEmojis: Record<string, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  angry: "😠",
  sad: "😢",
  wow: "😮",
  thumbs_up: "👍",
  thumbs_down: "👎",
  heart: "❤️",
  fire: "🔥",
  clap: "👏",
  party: "🎉",
};

export function MessageReactions({
  reactions,
  messageId,
}: MessageReactionsProps) {
  const { addReaction, removeReaction } = useSocket();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Filter out null/undefined reactions and reactions with null users
  const validReactions =
    reactions?.filter((reaction) => {
      return reaction && reaction.type && reaction.user && reaction.user._id;
    }) || [];

  // Group reactions by type
  const groupedReactions = validReactions.reduce((acc, reaction) => {
    // Double-check that reaction and reaction.type exist
    if (!reaction || !reaction.type) {
      console.warn("Invalid reaction found:", reaction);
      return acc;
    }

    if (!acc[reaction.type]) {
      acc[reaction.type] = [];
    }
    acc[reaction.type].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  const handleReactionClick = (type: string) => {
    if (!currentUser?.id) {
      console.warn("No current user found");
      return;
    }

    const userReaction = groupedReactions[type]?.find(
      (r) => r.user && r.user._id === currentUser.id
    );

    if (userReaction && userReaction._id) {
      removeReaction(messageId, userReaction._id);
    } else {
      addReaction(messageId, type);
    }
  };

  // Don't render anything if no valid reactions
  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2 mb-1 max-w-full">
      {Object.entries(groupedReactions).map(([type, reactionList]) => {
        // Filter out any reactions with null users in this specific group
        const validReactionList = reactionList.filter(
          (r) => r && r.user && r.user._id
        );

        if (validReactionList.length === 0) {
          return null;
        }

        const hasUserReacted = validReactionList.some(
          (r) => r.user && r.user._id === currentUser?.id
        );

        // Get user names, filtering out null users
        const userNames = validReactionList
          .filter((r) => r.user && r.user.name) // Filter out reactions with null user or no name
          .map((r) => r.user.name || "Unknown User")
          .slice(0, 5) // Show max 5 names
          .join(", ");

        const remainingCount = Math.max(0, validReactionList.length - 5);
        const tooltipText =
          validReactionList.length === 1
            ? `${userNames} reacted with ${reactionEmojis[type] || type}`
            : remainingCount > 0
            ? `${userNames} and ${remainingCount} others reacted with ${
                reactionEmojis[type] || type
              }`
            : `${userNames} reacted with ${reactionEmojis[type] || type}`;

        return (
          <TooltipProvider key={type}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-xs rounded-full border transition-all duration-200 hover:scale-105 shadow-sm",
                    "min-w-[2rem] max-w-[6rem] flex-shrink-0", // Responsive sizing
                    hasUserReacted
                      ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                  )}
                  onClick={() => handleReactionClick(type)}
                >
                  <span className="text-sm mr-1 flex-shrink-0">
                    {reactionEmojis[type] || "👍"}
                  </span>
                  <span
                    className={cn(
                      "font-medium text-xs truncate",
                      hasUserReacted
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {validReactionList.length}
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
