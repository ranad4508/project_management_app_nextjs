"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function RoomInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = searchParams.get("token");

  const [invitationData, setInvitationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setIsLoading(false);
      return;
    }

    // Check invitation validity
    checkInvitation();
  }, [token]);

  const checkInvitation = async () => {
    try {
      const response = await fetch(`/api/room-invitations/check?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to check invitation");
      }

      setInvitationData(data.data);
    } catch (error: any) {
      console.error("Error checking invitation:", error);
      setError(error.message || "Failed to check invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!session?.user?.id || !token) return;

    setIsAccepting(true);
    try {
      const response = await fetch(`/api/room-invitations/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to accept invitation");
      }

      toast.success("Successfully joined the room!");
      
      // Redirect to the room
      router.push(`/dashboard/workspaces/${invitationData.workspaceId}/chat?room=${invitationData.roomId}`);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Checking invitation...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle>Join "{invitationData?.roomName}"</CardTitle>
            <CardDescription>
              You've been invited to join the private room "{invitationData?.roomName}" in {invitationData?.workspaceName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Please sign in to accept this invitation and join the room.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(
                    window.location.href
                  )}`}
                >
                  Sign In to Join Room
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Join "{invitationData?.roomName}"</CardTitle>
          <CardDescription>
            {invitationData?.inviterName} has invited you to join this private room
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Room Details:</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Room:</strong> {invitationData?.roomName}</p>
              <p><strong>Workspace:</strong> {invitationData?.workspaceName}</p>
              <p><strong>Invited by:</strong> {invitationData?.inviterName}</p>
              <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs mt-2">
                🛡️ End-to-End Encrypted
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              This room is end-to-end encrypted for maximum security. Your messages can only be read by room members.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button
              onClick={handleAcceptInvitation}
              className="w-full"
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining Room...
                </>
              ) : (
                <>
                  Accept Invitation & Join Room
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Maybe Later</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
