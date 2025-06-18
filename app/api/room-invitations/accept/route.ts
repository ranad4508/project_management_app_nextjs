import { NextRequest, NextResponse } from "next/server";
import Database from "@/src/config/database";
import { RoomInvitation } from "@/src/models/room-invitation";
import { ChatRoom } from "@/src/models/chat-room";
import { User } from "@/src/models/user";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { MemberRole } from "@/src/enums/user.enum";
import { EncryptionService } from "@/src/services/encryption.service";

export async function POST(req: NextRequest) {
  try {
    await Database.connect();

    const user = await requireAuth(req);
    const { token } = await req.json();

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
    }).populate("room");

    if (!invitation || invitation.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired invitation",
        },
        { status: 404 }
      );
    }

    // Check if the invitation is for the current user
    if (invitation.invitedUser.toString() !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "This invitation is not for you",
        },
        { status: 403 }
      );
    }

    const room = await ChatRoom.findById(invitation.room);
    if (!room) {
      return NextResponse.json(
        {
          success: false,
          message: "Room not found",
        },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const isMember = room.members.some(
      (member: any) => member.user && member.user.toString() === user.id
    );

    if (isMember) {
      // Update invitation status even if already a member
      invitation.status = "accepted";
      await invitation.save();

      return NextResponse.json({
        success: true,
        message: "You are already a member of this room",
        room: {
          _id: room._id,
          name: room.name,
          type: room.type,
        },
      });
    }

    // Generate public key for the new member if room is encrypted
    const publicKey = room.isEncrypted
      ? EncryptionService.generateDHKeyPair().publicKey
      : undefined;

    // Add user to room
    room.members.push({
      user: user.id,
      role: MemberRole.MEMBER,
      joinedAt: new Date(),
      publicKey,
    });

    await room.save();

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    console.log(
      `✅ User ${user.name} accepted room invitation and joined room ${room.name}`
    );

    return NextResponse.json({
      success: true,
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
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
