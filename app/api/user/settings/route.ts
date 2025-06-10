import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { User } from "@/src/models/user";
import Database from "@/src/config/database";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { theme, emailNotifications, pushNotifications } = body;

    Database.connect();

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          "preferences.theme": theme,
          "preferences.emailNotifications": emailNotifications,
          "preferences.pushNotifications": pushNotifications,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).select("-password -mfaSecret");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
