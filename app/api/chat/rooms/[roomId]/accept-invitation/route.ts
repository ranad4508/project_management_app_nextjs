import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/src/lib/mongodb";
import { ChatRoom } from "@/src/models/ChatRoom";
import { User } from "@/src/models/User";
import { MemberRole } from "@/src/enums/user.enum";

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();

    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const room = await ChatRoom.findById(params.roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already a member
    const isMember = room.members.some(
      (member: any) => member.user && member.user.toString() === userId
    );

    if (isMember) {
      return NextResponse.json({
        message: "User is already a member of this room",
        room: room._id,
      });
    }

    // Add user to room
    room.members.push({
      user: userId,
      role: MemberRole.MEMBER,
      joinedAt: new Date(),
    });

    await room.save();

    console.log(`✅ User ${user.name} accepted invitation and joined room ${room.name}`);

    return NextResponse.json({
      message: "Successfully joined the room",
      room: {
        _id: room._id,
        name: room.name,
        type: room.type,
      },
    });
  } catch (error: any) {
    console.error("Error accepting room invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
