"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "./SocketProvider";
import { useToast } from "@/hooks/use-toast";
import { Search, Forward, Send, Users, Hash, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatRoom } from "@/src/types/chat.types";
import type { RootState } from "@/src/store";

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
}: ForwardMessageDialogProps) {
  const { toast } = useToast();
  const { sendMessage } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const rooms = useSelector((state: RootState) => state.chat.rooms);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Filter rooms based on search query
  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleForward = async () => {
    if (selectedRooms.length === 0) {
      toast({
        title: "No rooms selected",
        description:
          "Please select at least one room to forward the message to.",
        variant: "destructive",
      });
      return;
    }

    setIsForwarding(true);

    try {
      // Forward message to each selected room
      const forwardPromises = selectedRooms.map((roomId) => {
        const forwardedContent = `📤 Forwarded message:\n\n${message.content}`;

        return sendMessage({
          roomId,
          content: forwardedContent,
          type: "text",
          attachments: message.attachments || [],
          metadata: {
            isForwarded: true,
            originalMessageId: message._id,
            originalSender: message.sender?.name || "Unknown User",
          },
        });
      });

      await Promise.all(forwardPromises);

      toast({
        title: "Message forwarded!",
        description: `Successfully forwarded message to ${selectedRooms.length} room(s).`,
      });

      // Reset state and close dialog
      setSelectedRooms([]);
      setSearchQuery("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to forward message:", error);
      toast({
        title: "Error",
        description: "Failed to forward message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsForwarding(false);
    }
  };

  const getRoomIcon = (room: ChatRoom) => {
    if (room.type === "private") {
      return <Lock className="h-4 w-4 text-gray-500" />;
    }
    return <Hash className="h-4 w-4 text-gray-500" />;
  };

  const getRoomMemberCount = (room: ChatRoom) => {
    return room.members?.length || 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Forward className="h-5 w-5" />
            <span>Forward Message</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Message Preview */}
          <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center space-x-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={message.sender?.avatar || "/placeholder.svg"}
                />
                <AvatarFallback className="text-xs">
                  {message.sender?.name
                    ? message.sender.name.charAt(0).toUpperCase()
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {message.sender?.name || "Unknown User"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {message.content}
            </p>
            {message.attachments && message.attachments.length > 0 && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {message.attachments.length} attachment(s)
              </Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Rooms List */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {filteredRooms.map((room) => (
                <div
                  key={room._id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedRooms.includes(room._id)
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleRoomToggle(room._id)}
                >
                  <Checkbox
                    checked={selectedRooms.includes(room._id)}
                    onChange={() => handleRoomToggle(room._id)}
                  />

                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getRoomIcon(room)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {room.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{getRoomMemberCount(room)} members</span>
                        {room.type === "private" && (
                          <Badge variant="outline" className="text-xs">
                            Private
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredRooms.length === 0 && (
                <div className="text-center py-8">
                  <Hash className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchQuery ? "No rooms found" : "No rooms available"}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Selected Count */}
          {selectedRooms.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedRooms.length} room(s) selected
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isForwarding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={selectedRooms.length === 0 || isForwarding}
            >
              {isForwarding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Forwarding...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Forward ({selectedRooms.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
