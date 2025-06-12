"use client";

import { useSelector } from "react-redux";
import { selectTypingUsersInRoom } from "@/src/store/slices/chatSlice";
import type { RootState } from "@/src/store";

interface TypingIndicatorProps {
  roomId: string;
}

export function TypingIndicator({ roomId }: TypingIndicatorProps) {
  const typingUsers = useSelector(selectTypingUsersInRoom(roomId));
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Filter out current user from typing indicators
  const otherTypingUsers = typingUsers.filter(
    (user) => user.userId !== currentUser?.id
  );

  if (otherTypingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].userName} is typing...`;
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].userName} and ${otherTypingUsers[1].userName} are typing...`;
    } else {
      return `${otherTypingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
        <span>{getTypingText()}</span>
      </div>
    </div>
  );
}
