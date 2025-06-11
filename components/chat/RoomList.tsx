"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Hash, MessageCircle, Users } from "lucide-react";
import CreateRoomDialog from "./CreateRoomDialog";
import { ChatRoomResponse } from "@/src/types/chat.types";

interface RoomListProps {
  rooms: ChatRoomResponse[];
  selectedRoomId?: string | null;
  onSelectRoom: (roomId: string) => void;
  onOpenCreateRoom: () => void;
  isCreatingRoom: boolean;
  onCreateRoomSubmit: (data: {
    name: string;
    description: string;
    type: "group" | "workspace";
  }) => Promise<void>;
  showCreateRoom: boolean;
  setShowCreateRoom: (show: boolean) => void;
}

export default function RoomList({
  rooms = [],
  selectedRoomId,
  onSelectRoom,
  onOpenCreateRoom,
  isCreatingRoom,
  onCreateRoomSubmit,
  showCreateRoom,
  setShowCreateRoom,
}: RoomListProps) {
  const handleCreateRoomClick = () => {
    setShowCreateRoom(true);
    onOpenCreateRoom();
  };

  const handleCreateRoomSubmit = async (data: {
    name: string;
    description: string;
    type: "group" | "workspace";
  }) => {
    try {
      await onCreateRoomSubmit(data);
      setShowCreateRoom(false); // Close dialog on success
    } catch (error) {
      // Keep dialog open on error - let parent handle error display
      throw error;
    }
  };

  return (
    <>
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Chat Rooms</CardTitle>
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                E2E
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateRoomClick}
              disabled={isCreatingRoom}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No chat rooms yet
                  </p>
                  <Button
                    onClick={handleCreateRoomClick}
                    size="sm"
                    disabled={isCreatingRoom}
                  >
                    Create Room
                  </Button>
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room._id}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                      selectedRoomId === room._id
                        ? "bg-blue-50 border-blue-200 shadow-sm"
                        : "hover:bg-gray-50 border-transparent hover:border-gray-200"
                    }`}
                    onClick={() => onSelectRoom(room._id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {room.type === "workspace" ? (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h4
                        className="font-medium flex-1 truncate"
                        title={room.name}
                      >
                        {room.name}
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Lock className="h-3 w-3 text-green-600" />
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {room.participants?.length || 0}
                        </Badge>
                      </div>
                    </div>

                    {room.description && (
                      <p
                        className="text-xs text-muted-foreground truncate"
                        title={room.description}
                      >
                        {room.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant={
                          room.type === "workspace" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {room.type === "workspace" ? "Workspace" : "Group"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <CreateRoomDialog
        open={showCreateRoom}
        onOpenChange={setShowCreateRoom}
        onSubmit={handleCreateRoomSubmit}
        isCreating={isCreatingRoom}
        showTrigger={false}
      />
    </>
  );
}
