"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useGetUserRoomsQuery } from "@/src/store/api/chatApi";
import { setRooms, setActiveRoom } from "@/src/store/slices/chatSlice";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateRoomDialog } from "@/components/chat/CreateRoomDialog";
import { QuickInviteButton } from "@/components/chat/QuickInviteButton";
import { SocketProvider } from "@/components/chat/SocketProvider";
import { EncryptionDebugger } from "@/components/chat/EncryptionDebugger"; // Add this import
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RootState } from "@/src/store";

export default function ChatPage() {
  const params = useParams();
  const dispatch = useDispatch();
  const workspaceId = params.id as string;

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false); // Add this state

  const { rooms, activeRoomId, isSidebarOpen, isConnected } = useSelector(
    (state: RootState) => state.chat
  );
  console.log("Check connection:", isConnected);

  const {
    data: userRooms,
    isLoading,
    error,
    refetch,
  } = useGetUserRoomsQuery({ workspaceId });

  // Check if general room exists
  const hasGeneralRoom =
    userRooms?.some((room) => room.type === "general") || false;
  const activeRoom = rooms.find((room) => room._id === activeRoomId);

  useEffect(() => {
    if (userRooms) {
      console.log("📋 Loaded rooms:", userRooms);
      dispatch(setRooms(userRooms));

      // Auto-select general room if no room is active
      if (!activeRoomId && userRooms.length > 0) {
        const generalRoom = userRooms.find((room) => room.type === "general");
        if (generalRoom) {
          console.log("🏠 Auto-selecting general room:", generalRoom._id);
          dispatch(setActiveRoom(generalRoom._id));
        } else {
          // If no general room, select first room
          console.log("📝 Auto-selecting first room:", userRooms[0]._id);
          dispatch(setActiveRoom(userRooms[0]._id));
        }
      }
    }
  }, [userRooms, dispatch, activeRoomId]);

  // Auto-retry if no rooms found (general room might be creating)
  useEffect(() => {
    if (!isLoading && userRooms && userRooms.length === 0) {
      console.log("🔄 No rooms found, retrying in 2 seconds...");
      const timer = setTimeout(() => {
        refetch();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userRooms, isLoading, refetch]);

  // Toggle debugger with keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setShowDebugger((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Setting up encrypted chat...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load chat</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SocketProvider workspaceId={workspaceId}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <div
          className={cn(
            "flex flex-col border-r bg-card transition-all duration-300",
            isSidebarOpen ? "w-80" : "w-0 overflow-hidden"
          )}
        >
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold">Chat Rooms</h2>
              <Shield className="h-4 w-4 text-green-600" />
              <span>End-to-End Encrypted</span>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateRoomOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ChatSidebar rooms={rooms} workspaceId={workspaceId} />
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col relative">
          {activeRoomId ? (
            <ChatWindow roomId={activeRoomId} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  Welcome to Encrypted Chat
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  All messages are end-to-end encrypted for maximum security
                </p>
                {rooms.length === 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Setting up your workspace chat...
                    </p>
                    <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Invite Button for Private Rooms */}
          <QuickInviteButton workspaceId={workspaceId} />
        </div>

        {/* Status Indicators */}
        <div className="fixed bottom-4 right-4 flex flex-col space-y-2">
          {/* Connection Status */}
          {!isConnected && (
            <div className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-destructive-foreground" />
                <span>Disconnected from chat server</span>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span>Connected to chat server</span>
              </div>
            </div>
          )}
        </div>

        {/* Create Room Dialog */}
        <CreateRoomDialog
          open={isCreateRoomOpen}
          onOpenChange={setIsCreateRoomOpen}
          workspaceId={workspaceId}
          hasGeneralRoom={hasGeneralRoom}
        />
      </div>
    </SocketProvider>
  );
}
