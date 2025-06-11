"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import EncryptionSetup from "@/components/chat/EncryptionSetup";
import RoomList from "@/components/chat/RoomList";
import ChatInterface from "@/components/chat/ChatInterface";
import { useEncryptionContext } from "@/components/chat/EncryptionContext";
import {
  useInitializeUserEncryptionMutation,
  useGetWorkspaceChatRoomsQuery,
  useCreateChatRoomMutation,
  useEnsureWorkspaceGeneralRoomMutation,
} from "@/src/store/api/chatApi";
import { Loader2 } from "lucide-react";

interface MainChatProps {
  workspaceId: string;
}

export default function MainChat({ workspaceId }: MainChatProps) {
  const { data: session, status } = useSession();
  const { isPasswordSet, isClient, getSessionKey } = useEncryptionContext();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | undefined>();
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false);

  const [initializeEncryption, { isLoading: isInitializing }] =
    useInitializeUserEncryptionMutation();
  const [createRoom, { isLoading: isCreatingRoom }] =
    useCreateChatRoomMutation();
  const [ensureGeneralRoom, { isLoading: isEnsuring, data: generalRoomData }] =
    useEnsureWorkspaceGeneralRoomMutation();

  useEffect(() => {
    if (isClient && isPasswordSet && status === "authenticated") {
      getSessionKey()
        .then((key) => setSessionKey(key))
        .catch(() => toast.error("Failed to fetch session key"));
    } else if (isClient && !isPasswordSet && status === "authenticated") {
      setShowEncryptionSetup(true);
    }
  }, [isClient, isPasswordSet, getSessionKey, status]);
  console.log("Session Key:", sessionKey);
  const shouldSkipQueries =
    !isClient || !isPasswordSet || !sessionKey || status !== "authenticated";

  const {
    data: roomsData,
    isLoading: isLoadingRooms,
    refetch: refetchRooms,
  } = useGetWorkspaceChatRoomsQuery(
    { workspaceId, sessionKey },
    {
      skip: shouldSkipQueries,
      refetchOnMountOrArgChange: true,
    }
  );

  // Auto-select general room
  useEffect(() => {
    if (
      generalRoomData &&
      !selectedRoomId &&
      !isLoadingRooms &&
      isPasswordSet &&
      sessionKey
    ) {
      setSelectedRoomId(generalRoomData._id);
      refetchRooms();
    }
  }, [
    generalRoomData,
    selectedRoomId,
    isLoadingRooms,
    isPasswordSet,
    sessionKey,
    refetchRooms,
  ]);

  // Ensure general room
  useEffect(() => {
    if (
      workspaceId &&
      roomsData?.rooms?.length === 0 &&
      !isLoadingRooms &&
      isPasswordSet &&
      sessionKey &&
      !isEnsuring
    ) {
      ensureGeneralRoom({ workspaceId, sessionKey })
        .unwrap()
        .then((room) => {
          setSelectedRoomId(room._id);
          refetchRooms();
        })
        .catch((error) =>
          toast.error(error?.message || "Failed to ensure general room")
        );
    }
  }, [
    workspaceId,
    roomsData,
    isLoadingRooms,
    isPasswordSet,
    sessionKey,
    isEnsuring,
    ensureGeneralRoom,
    refetchRooms,
  ]);

  const handleEncryptionSetup = async (password: string) => {
    try {
      await initializeEncryption({ password, sessionKey }).unwrap();
      const newSessionKey = await getSessionKey();
      setSessionKey(newSessionKey);
      setShowEncryptionSetup(false);
      toast.success("Encryption setup completed successfully!");
      refetchRooms();
    } catch (error: any) {
      console.error("Encryption setup failed:", error);
      toast.error(error?.message || "Failed to setup encryption");
    }
  };

  const handleCreateRoom = async (data: {
    name: string;
    description: string;
    type: "group" | "workspace";
  }) => {
    if (!sessionKey) {
      toast.error("Session not available. Please refresh the page.");
      return;
    }

    try {
      const result = await createRoom({
        data: {
          name: data.name.trim(),
          description: data.description.trim() || undefined,
          type: data.type,
          participants: [],
          isPrivate: false,
        },
        workspaceId,
        sessionKey,
      }).unwrap();

      toast.success(`Room "${data.name}" created successfully!`);
      setShowCreateRoom(false);
      refetchRooms();
      setSelectedRoomId(result._id);
    } catch (error: any) {
      console.error("Failed to create room:", error);
      toast.error(error?.data?.error || "Failed to create room");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg mb-4">Please log in to access chat</p>
          <button
            onClick={() => (window.location.href = "/api/auth/signin")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (showEncryptionSetup) {
    return (
      <EncryptionSetup
        isLoading={isInitializing}
        onSubmit={handleEncryptionSetup}
      />
    );
  }

  if (isLoadingRooms && !roomsData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading chat rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <RoomList
        rooms={roomsData?.rooms || []}
        selectedRoomId={selectedRoomId || ""}
        onSelectRoom={setSelectedRoomId}
        onOpenCreateRoom={() => setShowCreateRoom(true)}
        isCreatingRoom={isCreatingRoom}
        onCreateRoomSubmit={handleCreateRoom}
        showCreateRoom={showCreateRoom}
        setShowCreateRoom={setShowCreateRoom}
      />
      <div className="flex-1">
        {selectedRoomId ? (
          <ChatInterface
            roomId={selectedRoomId}
            sessionKey={sessionKey}
            workspaceId={workspaceId}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to Chat
              </h3>
              <p className="text-gray-600 mb-4">
                {(roomsData?.rooms?.length ?? 0) > 0
                  ? "Select a room to start chatting"
                  : "Create your first room to get started"}
              </p>
              {(!roomsData || roomsData.rooms.length === 0) && (
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={isCreatingRoom}
                >
                  {isCreatingRoom ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                      Creating...
                    </>
                  ) : (
                    "Create Room"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
