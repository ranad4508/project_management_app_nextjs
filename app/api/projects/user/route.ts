import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { Project } from "@/src/models/project";
import { Workspace } from "@/src/models/workspace";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";
import mongoose from "mongoose";

export const GET = asyncHandler(async (req: NextRequest) => {
  await Database.connect();
  
  const user = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  // Convert user ID to ObjectId
  const userObjectId = new mongoose.Types.ObjectId(user.id);

  // First, get user's workspaces
  const userWorkspaces = await Workspace.find({
    $or: [
      { owner: userObjectId },
      { members: userObjectId }
    ]
  }).select('_id');

  const workspaceIds = userWorkspaces.map(w => w._id);

  // Get user's projects (from workspaces they belong to)
  const [projects, total] = await Promise.all([
    Project.find({
      workspace: { $in: workspaceIds }
    })
      .populate('workspace', 'name')
      .populate('members', 'name email profileImage')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    
    Project.countDocuments({
      workspace: { $in: workspaceIds }
    })
  ]);

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const pagination = {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev
  };

  return NextResponse.json({
    success: true,
    data: {
      projects,
      pagination
    },
    message: "User projects retrieved successfully"
  });
});
