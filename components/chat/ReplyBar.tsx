"use client";

import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { clearReplyToMessage } from "@/src/store/slices/chatSlice";
import { X, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RootState } from "@/src/store";

export function ReplyBar() {
  const dispatch = useDispatch();
  const replyToMessage = useSelector((state: RootState) => state.chat.replyToMessage);

  if (!replyToMessage) {
    return null;
  }

  const handleClearReply = () => {
    dispatch(clearReplyToMessage());
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mx-4 mb-2 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <Reply className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={replyToMessage.sender?.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-xs">
                  {replyToMessage.sender?.name
                    ? replyToMessage.sender.name.charAt(0).toUpperCase()
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {replyToMessage.sender?.name || "Unknown User"}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 break-words">
              {replyToMessage.content}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={handleClearReply}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
