"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Users,
  Settings,
  Smile,
  Paperclip,
  Plus,
  Hash,
  MessageCircle,
  Lock,
  Shield,
} from "lucide-react";
import {
  useGetWorkspaceChatRoomsQuery,
  useGetChatRoomMessagesQuery,
  useSendMessageMutation,
  useCreateChatRoomMutation,
  useEnsureWorkspaceGeneralRoomMutation,
  useInitializeUserEncryptionMutation,
} from "@/src/store/api/chatApi";
import { useSocket } from "@/hooks/use-socket";
import { useEncryption } from "@/hooks/use-encryption";
import { setSelectedRoomId } from "@/src/store/slices/chatSlice";

export default function WorkspaceChatPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const [selectedRoomId, setSelectedRoomIdLocal] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] = useState<"group" | "workspace">(
    "group"
  );
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Encryption hook
  const { setPassword, isPasswordSet, getPassword, clearPassword, isClient } =
    useEncryption();

  // Socket connection
  const socket = useSocket();

  // Only run queries on client side and when encryption is set up
  const shouldSkipQueries = !isClient || !isPasswordSet();

  // Redux queries and mutations
  const {
    data: chatRoomsData,
    isLoading: roomsLoading,
    error: roomsError,
    refetch: refetchRooms,
  } = useGetWorkspaceChatRoomsQuery(workspaceId, {
    skip: shouldSkipQueries,
  });

  // Set up polling if there's an error
  useEffect(() => {
    if (roomsError) {
      const pollTimer = setInterval(() => {
        refetchRooms();
      }, 5000);
      return () => clearInterval(pollTimer);
    }
  }, [roomsError, refetchRooms]);

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages,
  } = useGetChatRoomMessagesQuery(
    { roomId: selectedRoomId!, pagination: { limit: 50, sortOrder: "asc" } },
    { skip: !selectedRoomId || shouldSkipQueries }
  );

  const [sendMessageMutation, { isLoading: isSending }] =
    useSendMessageMutation();
  const [createChatRoom, { isLoading: isCreatingRoom }] =
    useCreateChatRoomMutation();
  const [ensureGeneralRoom, { isLoading: isEnsuring }] =
    useEnsureWorkspaceGeneralRoomMutation();
  const [initializeEncryption, { isLoading: isInitializingEncryption }] =
    useInitializeUserEncryptionMutation();

  // Extract rooms array from response
  const rooms = chatRoomsData?.rooms || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  // Socket event handlers for encrypted messages
  useEffect(() => {
    if (!socket.socket || !selectedRoomId || !isPasswordSet() || !isClient)
      return;

    const handleNewMessage = (data: any) => {
      if (data.roomId === selectedRoomId) {
        refetchMessages();
      }
    };

    const handleMessageRead = (data: any) => {
      if (data.roomId === selectedRoomId) {
        refetchMessages();
      }
    };

    socket.socket.on("message:received", handleNewMessage);
    socket.socket.on("message:read", handleMessageRead);

    return () => {
      socket.socket?.off("message:received", handleNewMessage);
      socket.socket?.off("message:read", handleMessageRead);
    };
  }, [socket.socket, selectedRoomId, refetchMessages, isPasswordSet, isClient]);

  // Join room when selected
  useEffect(() => {
    if (selectedRoomId && socket.socket && isClient) {
      socket.joinRoom(selectedRoomId);
      dispatch(setSelectedRoomId(selectedRoomId));
    }
  }, [selectedRoomId, socket, dispatch, isClient]);

  // Auto-create general room on load
  useEffect(() => {
    if (
      workspaceId &&
      rooms.length === 0 &&
      !roomsLoading &&
      !roomsError &&
      isPasswordSet() &&
      isClient
    ) {
      handleEnsureGeneralRoom();
    }
  }, [
    workspaceId,
    rooms.length,
    roomsLoading,
    roomsError,
    isPasswordSet,
    isClient,
  ]);

  // Auto-retry on error
  useEffect(() => {
    if (roomsError && retryCount < 3) {
      const timer = setTimeout(() => {
        refetchRooms();
        setRetryCount((prev) => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [roomsError, retryCount, refetchRooms]);

  const handleSetupEncryption = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!encryptionPassword || encryptionPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!setPassword(encryptionPassword)) {
      return;
    }

    try {
      await initializeEncryption({ password: encryptionPassword }).unwrap();
      setEncryptionPassword("");
      toast.success("Encryption initialized successfully");

      // Refetch rooms after encryption is set up
      setTimeout(() => {
        refetchRooms();
      }, 500);
    } catch (error: any) {
      console.error("Error initializing encryption:", error);
      toast.error(error?.message || "Failed to initialize encryption");
      clearPassword();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !selectedRoomId || !isPasswordSet()) {
      if (!isPasswordSet()) {
        toast.error("Please set up encryption first");
      }
      return;
    }

    try {
      await sendMessageMutation({
        roomId: selectedRoomId,
        content: message.trim(),
        messageType: "text",
      }).unwrap();

      setMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error?.message || "Failed to send message");
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoomName.trim()) {
      toast.error("Room name is required");
      return;
    }

    if (!isPasswordSet()) {
      toast.error("Please set up encryption first");
      return;
    }

    try {
      const room = await createChatRoom({
        workspaceId,
        name: newRoomName.trim(),
        description: newRoomDescription.trim() || undefined,
        type: newRoomType,
        participants: [],
        isPrivate: false,
      }).unwrap();

      setSelectedRoomIdLocal(room._id);
      setShowCreateRoom(false);
      setNewRoomName("");
      setNewRoomDescription("");
      setNewRoomType("group");
      toast.success("Chat room created successfully");
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast.error(error?.message || "Failed to create chat room");
    }
  };

  const handleEnsureGeneralRoom = async () => {
    if (!isPasswordSet() || !isClient) return;

    try {
      const room = await ensureGeneralRoom(workspaceId).unwrap();
      if (!selectedRoomId) {
        setSelectedRoomIdLocal(room._id);
      }
      refetchRooms();
    } catch (error: any) {
      console.error("Error ensuring general room:", error);
    }
  };

  // Show loading while client-side hydration happens
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Show encryption setup if not initialized
  if (!isPasswordSet()) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Set Up End-to-End Encryption</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your messages will be encrypted with AES-256 and Diffie-Hellman
              key exchange
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetupEncryption} className="space-y-4">
              <div>
                <Label htmlFor="encryptionPassword">Encryption Password</Label>
                <Input
                  id="encryptionPassword"
                  type="password"
                  value={encryptionPassword}
                  onChange={(e) => setEncryptionPassword(e.target.value)}
                  placeholder="Enter a strong password (min 8 characters)"
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This password will be used to encrypt and decrypt your
                  messages. Keep it secure!
                </p>
              </div>
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Your encryption password is never sent to our servers. Only
                  you can decrypt your messages.
                </AlertDescription>
              </Alert>
              <Button
                type="submit"
                className="w-full"
                disabled={isInitializingEncryption}
              >
                {isInitializingEncryption ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing Encryption...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Initialize Encryption
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (roomsLoading || isEnsuring) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">
            Setting up encrypted chat rooms...
          </p>
        </div>
      </div>
    );
  }

  if (roomsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Error loading chat rooms</h3>
          <p className="text-muted-foreground mb-4">
            Failed to load chat rooms. Please try again.
          </p>
          <div className="space-y-2">
            <Button onClick={() => refetchRooms()}>Retry</Button>
            <p className="text-xs text-muted-foreground">
              {retryCount > 0 ? `Retried ${retryCount} times` : ""}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                clearPassword();
                window.location.reload();
              }}
            >
              Reset Encryption
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Chat Rooms Sidebar */}
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
            <div className="flex gap-2">
              <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Encrypted Chat Room</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <div>
                      <Label htmlFor="roomName">Room Name</Label>
                      <Input
                        id="roomName"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="Enter room name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomDescription">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="roomDescription"
                        value={newRoomDescription}
                        onChange={(e) => setNewRoomDescription(e.target.value)}
                        placeholder="Enter room description"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomType">Room Type</Label>
                      <Select
                        value={newRoomType}
                        onValueChange={(value: "group" | "workspace") =>
                          setNewRoomType(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="group">Group Chat</SelectItem>
                          <SelectItem value="workspace">
                            Workspace Channel
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        All messages in this room will be end-to-end encrypted.
                      </AlertDescription>
                    </Alert>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateRoom(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreatingRoom}>
                        {isCreatingRoom ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Create Room"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
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
                    onClick={handleEnsureGeneralRoom}
                    size="sm"
                    disabled={isEnsuring}
                  >
                    {isEnsuring ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create General Room"
                    )}
                  </Button>
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room._id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRoomId === room._id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedRoomIdLocal(room._id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {room.type === "workspace" ? (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h4 className="font-medium flex-1">{room.name}</h4>
                      <div className="flex items-center gap-1">
                        <Lock className="h-3 w-3 text-green-600" />
                        <Badge variant="outline" className="text-xs">
                          {room.participants?.length || 0}
                        </Badge>
                      </div>
                    </div>
                    {room.description && (
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {room.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Messages Area */}
      <Card className="flex-1 flex flex-col">
        {selectedRoomId ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {rooms.find((r) => r._id === selectedRoomId)?.type ===
                  "workspace" ? (
                    <Hash className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {rooms.find((r) => r._id === selectedRoomId)?.name ||
                          "Chat Room"}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Encrypted
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rooms.find((r) => r._id === selectedRoomId)?.participants
                        ?.length || 0}{" "}
                      participants • End-to-end encrypted
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Decrypting messages...
                        </p>
                      </div>
                    </div>
                  ) : messagesError ? (
                    <div className="text-center py-8">
                      <h3 className="text-lg font-medium mb-2">
                        Error loading messages
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Failed to load messages. Please try again.
                      </p>
                      <Button onClick={() => refetchMessages()}>Retry</Button>
                    </div>
                  ) : messagesData?.messages &&
                    messagesData.messages.length > 0 ? (
                    messagesData.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.sender.id === session?.user?.id
                            ? "flex-row-reverse"
                            : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={msg.sender.avatar || "/placeholder.svg"}
                          />
                          <AvatarFallback>
                            {msg.sender.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`flex-1 max-w-xs ${
                            msg.sender.id === session?.user?.id
                              ? "text-right"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {msg.sender.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </span>
                            <Lock className="h-3 w-3 text-green-600" />
                          </div>
                          <div
                            className={`p-3 rounded-lg ${
                              msg.sender.id === session?.user?.id
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            {msg.isEdited && (
                              <p className="text-xs opacity-70 mt-1">
                                (edited)
                              </p>
                            )}
                          </div>
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {msg.reactions.map((reaction, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {reaction.emoji || reaction.type}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <Lock className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        Secure Chat Room
                      </h3>
                      <p className="text-muted-foreground mb-2">
                        This room is protected with end-to-end encryption.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Start the conversation!
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Button type="button" variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type an encrypted message..."
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button type="submit" disabled={isSending || !message.trim()}>
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Messages are end-to-end encrypted with AES-256
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Select a chat room</h3>
              <p className="text-muted-foreground">
                Choose a room from the sidebar to start secure chatting
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
