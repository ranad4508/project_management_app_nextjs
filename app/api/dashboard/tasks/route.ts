import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { Task } from "@/src/models/task";
import { Project } from "@/src/models/project";
import { Workspace } from "@/src/models/workspace";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";
import mongoose from "mongoose";

export const GET = asyncHandler(async (req: NextRequest) => {
  await Database.connect();

  const user = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  // Convert user ID to ObjectId
  const userObjectId = new mongoose.Types.ObjectId(user.id);

  // Get unique workspace IDs to avoid duplicates
  const workspaceIds = await Workspace.distinct("_id", {
    $or: [{ owner: userObjectId }, { "members.user": userObjectId }],
  });

  // Get user's projects
  const userProjects = await Project.find({
    workspace: { $in: workspaceIds },
  }).select("_id");

  const projectIds = userProjects.map((p) => p._id);

  // Get recent tasks for dashboard
  const tasks = await Task.find({
    $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
  })
    .populate("project", "name workspace")
    .populate("assignedTo", "name email profileImage")
    .populate("createdBy", "name email")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    success: true,
    data: tasks,
    message: "Dashboard tasks retrieved successfully",
  });
});
