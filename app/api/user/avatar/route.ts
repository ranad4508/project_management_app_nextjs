import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { User } from "@/src/models/user";
import Database from "@/src/config/database";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.formData();
    const file: File | null = data.get("avatar") as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const filename = `${session.user.id}-${Date.now()}.${file.name
      .split(".")
      .pop()}`;
    const path = join(process.cwd(), "public/uploads/avatars", filename);

    // Ensure directory exists
    const { mkdir } = await import("fs/promises");
    await mkdir(join(process.cwd(), "public/uploads/avatars"), {
      recursive: true,
    });

    // Write file
    await writeFile(path, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    await Database.connect();

    // Update user avatar in database
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        avatar: avatarUrl,
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password -mfaSecret");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Avatar uploaded successfully",
      data: {
        avatar: avatarUrl,
      },
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
