"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useGetUserRoomsQuery } from "@/src/store/api/chatApi";
import {
  setRooms,
  setActiveRoom,
  setSidebarOpen,
} from "@/src/store/slices/chatSlice";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateRoomDialog } from "@/components/chat/CreateRoomDialog";
import { QuickInviteButton } from "@/components/chat/QuickInviteButton";
import { SocketProvider } from "@/components/chat/SocketProvider";

import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RootState } from "@/src/store";
import { toast } from "sonner";

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const workspaceId = params.id as string;
  const roomParam = searchParams.get("room");

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false); // Add this state

  const { rooms, activeRoomId, isSidebarOpen, isConnected, onlineUsers } =
    useSelector((state: RootState) => state.chat);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
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

      // Check if there's a room parameter (for invitation acceptance)
      if (roomParam && userRooms.find((room) => room._id === roomParam)) {
        console.log("🎯 Selecting room from URL parameter:", roomParam);
        dispatch(setActiveRoom(roomParam));
      } else if (!activeRoomId && userRooms.length > 0) {
        // Auto-select general room if no room is active
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
  }, [userRooms, dispatch, activeRoomId, roomParam]);

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
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => dispatch(setSidebarOpen(false))}
          />
        )}

        {/* Sidebar - Responsive */}
        <div
          className={cn(
            "flex flex-col border-r bg-card transition-all duration-300 z-50",
            // Mobile: Fixed sidebar with overlay
            "fixed inset-y-0 left-0 lg:relative lg:z-auto",
            // Width and visibility
            isSidebarOpen
              ? "w-80 translate-x-0"
              : "w-80 -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden"
          )}
        >
          <div className="flex items-center justify-between border-b p-3 lg:p-4">
            <h2 className="text-base lg:text-lg font-semibold truncate">
              Chat Rooms
            </h2>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                onClick={() => setIsCreateRoomOpen(true)}
                className="h-7 w-7 lg:h-8 lg:w-8 p-0"
              >
                <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
              </Button>
              {/* Mobile close button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dispatch(setSidebarOpen(false))}
                className="h-7 w-7 p-0 lg:hidden"
              >
                ✕
              </Button>
            </div>
          </div>

          <ChatSidebar
            rooms={rooms}
            activeRoomId={activeRoomId}
            currentUser={currentUser}
            onlineUsers={onlineUsers || []}
            isConnected={isConnected}
            workspaceId={workspaceId}
          />
        </div>

        {/* Main Chat Area - Responsive */}
        <div className="flex flex-1 flex-col relative min-w-0 overflow-hidden">
          {/* Mobile Header with Menu Button */}
          <div className="lg:hidden flex items-center justify-between p-3 border-b bg-card">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => dispatch(setSidebarOpen(true))}
              className="h-8 w-8 p-0"
            >
              ☰
            </Button>
            <h1 className="text-sm font-semibold truncate">
              {activeRoomId ? "Chat" : "WorkSphere Chat"}
            </h1>
            <div className="w-8" /> {/* Spacer for centering */}
          </div>

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
