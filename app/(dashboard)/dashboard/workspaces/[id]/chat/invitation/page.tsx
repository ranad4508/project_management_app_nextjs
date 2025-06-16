"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Users, 
  Lock, 
  Hash, 
  Loader2,
  MessageSquare,
  Shield
} from "lucide-react";

interface RoomInvitation {
  _id: string;
  room: {
    _id: string;
    name: string;
    description?: string;
    type: "public" | "private";
    isEncrypted: boolean;
    members: Array<{
      user: {
        _id: string;
        name: string;
        email: string;
        avatar?: string;
      };
      role: string;
    }>;
    workspace: {
      _id: string;
      name: string;
    };
  };
  invitedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export default function ChatInvitationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const workspaceId = params.id as string;
  const roomId = searchParams.get("room");

  const [invitation, setInvitation] = useState<RoomInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !session?.user?.id) return;

    fetchInvitation();
  }, [roomId, session?.user?.id]);

  const fetchInvitation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chat/rooms/${roomId}/invitation`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invitation details");
      }

      const data = await response.json();
      setInvitation(data.invitation);
    } catch (error: any) {
      console.error("Error fetching invitation:", error);
      setError(error.message || "Failed to load invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation || !session?.user?.id) return;

    try {
      setIsProcessing(true);
      const response = await fetch(`/api/chat/rooms/${roomId}/accept-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept invitation");
      }

      toast({
        title: "Invitation accepted!",
        description: `You've successfully joined ${invitation.room.name}`,
      });

      // Redirect to the chat room
      router.push(`/dashboard/workspaces/${workspaceId}/chat?room=${roomId}`);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!invitation || !session?.user?.id) return;

    try {
      setIsProcessing(true);
      const response = await fetch(`/api/chat/rooms/${roomId}/decline-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to decline invitation");
      }

      toast({
        title: "Invitation declined",
        description: "You've declined the room invitation",
      });

      // Redirect to workspace
      router.push(`/dashboard/workspaces/${workspaceId}`);
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to decline invitation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-2">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || "This invitation may have expired or been revoked."}
            </p>
            <Button onClick={() => router.push(`/dashboard/workspaces/${workspaceId}`)}>
              Go to Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Already Joined</h2>
            <p className="text-muted-foreground mb-4">
              You're already a member of this room.
            </p>
            <Button onClick={() => router.push(`/dashboard/workspaces/${workspaceId}/chat?room=${roomId}`)}>
              Go to Chat Room
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <MessageSquare className="h-6 w-6" />
            <span>Room Invitation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inviter Info */}
          <div className="text-center">
            <Avatar className="h-16 w-16 mx-auto mb-3">
              <AvatarImage src={invitation.invitedBy.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-lg">
                {invitation.invitedBy.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-lg">
              <span className="font-semibold">{invitation.invitedBy.name}</span> invited you to join
            </p>
          </div>

          {/* Room Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {invitation.room.type === "private" ? (
                    <Lock className="h-8 w-8 text-blue-600" />
                  ) : (
                    <Hash className="h-8 w-8 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold mb-2">{invitation.room.name}</h3>
                  {invitation.room.description && (
                    <p className="text-muted-foreground mb-3">{invitation.room.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant={invitation.room.type === "private" ? "default" : "outline"}>
                      {invitation.room.type === "private" ? "Private Room" : "Public Room"}
                    </Badge>
                    {invitation.room.isEncrypted && (
                      <Badge variant="secondary" className="text-green-700">
                        <Shield className="h-3 w-3 mr-1" />
                        Encrypted
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{invitation.room.members.length} members</span>
                    </div>
                    <div>
                      Workspace: {invitation.room.workspace.name}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Preview */}
          <div>
            <h4 className="font-medium mb-3">Current Members</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {invitation.room.members.slice(0, 5).map((member) => (
                <div key={member.user._id} className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="text-xs">
                      {member.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {member.role}
                  </Badge>
                </div>
              ))}
              {invitation.room.members.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{invitation.room.members.length - 5} more members
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={handleDeclineInvitation}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Decline
            </Button>
            <Button
              onClick={handleAcceptInvitation}
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Accept & Join
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Invited on {new Date(invitation.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
