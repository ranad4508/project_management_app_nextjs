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
import { Loader2, CheckCircle, XCircle, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useAcceptInvitationMutation } from "@/src/store/api/workspaceApi";

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = searchParams.get("token");

  const [invitationData, setInvitationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [acceptInvitation, { isLoading: isAccepting }] =
    useAcceptInvitationMutation();

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
      const response = await fetch(`/api/invitations/check?token=${token}`);
      const data = await response.json();

      if (data.success) {
        setInvitationData(data.data);
      } else {
        setError(data.message || "Invalid or expired invitation");
      }
    } catch (error) {
      setError("Failed to verify invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token) return;

    try {
      const result = await acceptInvitation({ token }).unwrap();

      toast.success("Invitation accepted successfully!");

      // Redirect to workspace
      if (result.workspace) {
        router.push(`/dashboard/workspaces/${result.workspace}`);
      } else {
        router.push("/dashboard/workspaces");
      }
    } catch (error: any) {
      console.error("Accept invitation error:", error);
      toast.error(
        error?.data?.message ||
          error?.data?.error ||
          "Failed to accept invitation"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Verifying invitation...</p>
            </div>
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
            <Loader2 className="h-8 w-8 animate-spin" />
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
            <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle>Join {invitationData?.workspaceName}</CardTitle>
            <CardDescription>
              You've been invited to join {invitationData?.workspaceName} as a{" "}
              {invitationData?.role}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Please sign in to accept this invitation and join the workspace.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(
                    window.location.href
                  )}`}
                >
                  Sign In to Accept
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link
                  href={`/register?callbackUrl=${encodeURIComponent(
                    window.location.href
                  )}`}
                >
                  Create Account
                </Link>
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
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            Join {invitationData?.workspaceName} and start collaborating with
            your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Workspace:</span>
              <span className="font-medium">
                {invitationData?.workspaceName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Role:</span>
              <span className="font-medium capitalize">
                {invitationData?.role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Your Email:</span>
              <span className="font-medium">{session.user?.email}</span>
            </div>
          </div>

          {session.user?.email !== invitationData?.email && (
            <Alert>
              <AlertDescription>
                This invitation was sent to {invitationData?.email}, but you're
                signed in as {session.user?.email}. Please sign in with the
                correct account or contact the workspace admin.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleAcceptInvitation}
              className="w-full"
              disabled={
                isAccepting || session.user?.email !== invitationData?.email
              }
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  Accept Invitation
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
