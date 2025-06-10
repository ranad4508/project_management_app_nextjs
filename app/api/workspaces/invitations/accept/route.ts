import { type NextRequest, NextResponse } from "next/server";
import { WorkspaceController } from "@/src/controllers/workspace.controller";
import Database from "@/src/config/database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const workspaceController = new WorkspaceController();

export async function POST(req: NextRequest) {
  try {
    await Database.connect();

    // Get the session to extract the user ID
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Add user ID to the request for the controller
    const body = await req.json();
    const enhancedReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify({
        ...body,
        userId: session.user.id,
      }),
    });

    return workspaceController.acceptInvitation(enhancedReq);
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
