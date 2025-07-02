import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { Task } from "@/src/models/task";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";
import mongoose from "mongoose";

export const GET = asyncHandler(async (req: NextRequest) => {
  await Database.connect();
  
  try {
    const user = await requireAuth(req);
    console.log("User authenticated:", user.id);

    // Convert user ID to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(user.id);
    console.log("User ObjectId:", userObjectId);

    // Simple query to get tasks assigned to user
    const tasks = await Task.find({
      assignedTo: userObjectId,
    })
      .populate('project', 'name workspace')
      .populate('assignedTo', 'name email profileImage')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    console.log("Found tasks:", tasks.length);

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
        userId: user.id,
        userObjectId: userObjectId.toString(),
      },
      message: "Test my tasks retrieved successfully"
    });
  } catch (error) {
    console.error("Test my-tasks error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
});
