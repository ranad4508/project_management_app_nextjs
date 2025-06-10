"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Users,
  Loader2,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  messageType: "text" | "file" | "image";
  createdAt: string;
  isEdited: boolean;
  reactions: Array<{
    emoji: string;
    users: string[];
  }>;
}

interface ChatRoom {
  _id: string;
  name: string;
  type: "direct" | "group" | "workspace";
  participants: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    role: string;
    joinedAt: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
}

export default function WorkspaceChatPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { data: session } = useSession();
  const socket = useSocket();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workspaceId) {
      fetchChatRooms();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom._id);
      // Join the room for real-time updates
      socket.socket?.emit("join-room", activeRoom._id);
    }
  }, [activeRoom, socket]);

  useEffect(() => {
    if (socket.socket) {
      socket.socket.on("new-message", (message: Message) => {
        if (activeRoom && message) {
          setMessages((prev) => [...prev, message]);
        }
      });

      socket.socket.on("message-updated", (updatedMessage: Message) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          )
        );
      });

      return () => {
        socket.socket?.off("new-message");
        socket.socket?.off("message-updated");
      };
    }
  }, [socket.socket, activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChatRooms = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/chat/rooms`);
      if (response.ok) {
        const data = await response.json();
        const rooms = data.data || [];
        setChatRooms(rooms);
        if (rooms.length > 0) {
          setActiveRoom(rooms[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      toast.error("Failed to load chat rooms");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !activeRoom || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: activeRoom._id,
          content: newMessage.trim(),
          messageType: "text",
        }),
      });

      if (response.ok) {
        setNewMessage("");
        // Message will be added via socket event
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Chat Rooms Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chat Rooms
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="space-y-1">
            {chatRooms.map((room) => (
              <button
                key={room._id}
                onClick={() => setActiveRoom(room)}
                className={`w-full p-3 text-left hover:bg-muted transition-colors ${
                  activeRoom?._id === room._id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium truncate">{room.name}</h4>
                  {room.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {room.unreadCount}
                    </Badge>
                  )}
                </div>
                {room.lastMessage && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {room.lastMessage.sender.name}: {room.lastMessage.content}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <div className="flex -space-x-1">
                    {room.participants.slice(0, 3).map((participant) => (
                      <Avatar
                        key={participant.user._id}
                        className="h-5 w-5 border border-background"
                      >
                        <AvatarImage
                          src={participant.user.avatar || "/placeholder.svg"}
                        />
                        <AvatarFallback className="text-xs">
                          {participant.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {room.participants.length > 3 && (
                      <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center">
                        <span className="text-xs">
                          +{room.participants.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {room.participants.length} member
                    {room.participants.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{activeRoom.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {activeRoom.participants.length} member
                    {activeRoom.participants.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex gap-3 ${
                    message.sender._id === session?.user?.id
                      ? "flex-row-reverse"
                      : ""
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={message.sender.avatar || "/placeholder.svg"}
                    />
                    <AvatarFallback className="text-xs">
                      {message.sender.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex-1 max-w-xs ${
                      message.sender._id === session?.user?.id
                        ? "text-right"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.sender.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.createdAt)}
                      </span>
                      {message.isEdited && (
                        <span className="text-xs text-muted-foreground">
                          (edited)
                        </span>
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.sender._id === session?.user?.id
                          ? "bg-blue-600 text-white"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    {message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {message.reactions.map((reaction, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {reaction.emoji} {reaction.users.length}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={sendMessage} className="flex gap-2">
                <Button type="button" variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="button" variant="ghost" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                No chat room selected
              </h3>
              <p className="text-muted-foreground">
                Select a chat room from the sidebar to start messaging.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
