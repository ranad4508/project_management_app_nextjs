import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { User } from "@/src/models/user";
import Database from "@/src/config/database";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Database.connect();

    const user = await User.findById(session.user.id).select(
      "-password -mfaSecret"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For users created before timestamps were added, extract creation time from ObjectId
    const createdAtFallback =
      user.createdAt ||
      new Date(parseInt(user._id.toString().substring(0, 8), 16) * 1000);

    // Update the user document with createdAt if it doesn't exist
    if (!user.createdAt) {
      await User.findByIdAndUpdate(user._id, {
        createdAt: createdAtFallback,
        updatedAt: createdAtFallback,
      });
    }

    const responseData = {
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.avatar,
      avatar: user.avatar, // Add both image and avatar fields
      bio: user.bio,
      phone: user.phone,
      location: user.location,
      timezone: user.timezone,
      language: user.language,
      theme: user.preferences?.theme || "system",
      emailNotifications: user.preferences?.emailNotifications ?? true,
      pushNotifications: user.preferences?.pushNotifications ?? true,
      mfaEnabled: user.mfaEnabled,
      createdAt: createdAtFallback,
      updatedAt: user.updatedAt || createdAtFallback,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, phone, location, timezone, language } = body;

    await Database.connect();

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
        ...(timezone && { timezone }),
        ...(language && { language }),
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password -mfaSecret");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
