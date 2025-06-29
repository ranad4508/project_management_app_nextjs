"use client";

import { useSession } from "next-auth/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useAddReactionMutation,
  useRemoveReactionMutation,
} from "@/src/store/api/chatApi";
import { cn } from "@/lib/utils";
import type { MessageReaction } from "@/src/types/chat.types";
import { toast } from "sonner";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  messageId: string;
  roomId: string;
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
  roomId,
}: MessageReactionsProps) {
  const { data: session } = useSession();
  const currentUser = session?.user;
  const [addReactionMutation] = useAddReactionMutation();
  const [removeReactionMutation] = useRemoveReactionMutation();

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

  const handleReactionClick = async (type: string) => {
    if (!currentUser?.id) {
      console.warn("No current user found");
      return;
    }

    const userReaction = groupedReactions[type]?.find(
      (r) => r.user && r.user._id === currentUser.id
    );

    try {
      if (userReaction && userReaction._id) {
        // Remove existing reaction
        await removeReactionMutation({
          messageId,
          reactionId: userReaction._id,
          roomId,
        }).unwrap();
        toast.success("Reaction removed!");
      } else {
        // Add new reaction
        await addReactionMutation({
          messageId,
          type: type as any, // Cast to ReactionType
          roomId,
        }).unwrap();
        toast.success("Reaction added!");
      }
    } catch (error) {
      console.error("Failed to update reaction:", error);
      toast.error("Failed to update reaction. Please try again.");
    }
  };

  // Don't render anything if no valid reactions
  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 items-center">
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
                <button
                  className={cn(
                    "min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center gap-0.5 transition-all duration-200 hover:scale-110 shadow-sm",
                    hasUserReacted
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                  )}
                  onClick={() => handleReactionClick(type)}
                >
                  <span className="text-xs leading-none">
                    {reactionEmojis[type] || "👍"}
                  </span>
                  {validReactionList.length > 1 && (
                    <span
                      className={cn(
                        "text-xs font-medium leading-none",
                        hasUserReacted
                          ? "text-white"
                          : "text-gray-600 dark:text-gray-300"
                      )}
                    >
                      {validReactionList.length}
                    </span>
                  )}
                </button>
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
