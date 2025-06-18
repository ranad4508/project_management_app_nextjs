import { NextRequest, NextResponse } from "next/server";
import Database from "@/src/config/database";
import { RoomInvitation } from "@/src/models/room-invitation";
import { ChatRoom } from "@/src/models/chat-room";
import { User } from "@/src/models/user";

export async function GET(req: NextRequest) {
  try {
    await Database.connect();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Token is required",
        },
        { status: 400 }
      );
    }

    const invitation = await RoomInvitation.findOne({
      token,
      status: "pending",
    })
      .populate({
        path: "room",
        populate: {
          path: "workspace",
          select: "name",
        },
      })
      .populate("invitedBy", "name email")
      .populate("invitedUser", "name email");

    if (!invitation || invitation.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired invitation",
        },
        { status: 404 }
      );
    }

    const room = invitation.room as any;
    const workspace = room.workspace as any;
    const inviter = invitation.invitedBy as any;
    const invitedUser = invitation.invitedUser as any;

    return NextResponse.json({
      success: true,
      data: {
        roomId: room._id,
        roomName: room.name,
        workspaceId: workspace._id,
        workspaceName: workspace.name,
        inviterName: inviter.name,
        invitedUserEmail: invitedUser.email,
        token,
      },
    });
  } catch (error: any) {
    console.error("Error checking room invitation:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
