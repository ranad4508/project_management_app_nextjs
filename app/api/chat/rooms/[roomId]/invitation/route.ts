import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/src/lib/mongodb";
import { ChatRoom } from "@/src/models/ChatRoom";
import { User } from "@/src/models/User";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const room = await ChatRoom.findById(params.roomId)
      .populate("members.user", "name email avatar")
      .populate("workspace", "name")
      .populate("createdBy", "name email avatar");

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if user is already a member
    const isMember = room.members.some(
      (member: any) => member.user && member.user._id.toString() === session.user.id
    );

    if (isMember) {
      return NextResponse.json({
        invitation: {
          _id: room._id,
          room: {
            _id: room._id,
            name: room.name,
            description: room.description,
            type: room.type,
            isEncrypted: room.isEncrypted,
            members: room.members,
            workspace: room.workspace,
          },
          invitedBy: room.createdBy,
          status: "accepted",
          createdAt: room.createdAt,
        },
      });
    }

    // For non-members, create a mock invitation object
    // In a real app, you'd store actual invitations in the database
    return NextResponse.json({
      invitation: {
        _id: room._id,
        room: {
          _id: room._id,
          name: room.name,
          description: room.description,
          type: room.type,
          isEncrypted: room.isEncrypted,
          members: room.members,
          workspace: room.workspace,
        },
        invitedBy: room.createdBy,
        status: "pending",
        createdAt: room.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error fetching room invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
