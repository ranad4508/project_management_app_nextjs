import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { Workspace } from "@/src/models/workspace";
import { Project } from "@/src/models/project";
import { Task } from "@/src/models/task";
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

  // Get unique workspace IDs first to avoid duplicates
  const workspaceIds = await Workspace.distinct("_id", {
    $or: [{ owner: userObjectId }, { "members.user": userObjectId }],
  });

  // Get total count
  const total = workspaceIds.length;

  // Get paginated workspaces using the unique IDs
  const paginatedWorkspaceIds = workspaceIds
    .sort((a, b) => b.toString().localeCompare(a.toString())) // Sort by ID (newest first approximation)
    .slice(skip, skip + limit);

  const workspaces = await Workspace.find({
    _id: { $in: paginatedWorkspaceIds },
  })
    .populate("owner", "name email profileImage avatar")
    .populate("members.user", "name email profileImage avatar")
    .sort({ updatedAt: -1 })
    .lean();

  // Add stats to each workspace
  const workspacesWithStats = await Promise.all(
    workspaces.map(async (workspace) => {
      const projectIds = await Project.find({
        workspace: workspace._id,
      }).select("_id");
      const [totalProjects, totalTasks, completedTasks, allTasks] =
        await Promise.all([
          Project.countDocuments({ workspace: workspace._id }),
          Task.countDocuments({
            project: { $in: projectIds },
          }),
          Task.countDocuments({
            project: { $in: projectIds },
            status: "done",
          }),
          Task.find({
            project: { $in: projectIds },
          }).select("estimatedHours status"),
        ]);

      // Calculate effort-based completion
      let totalEffort = 0;
      let completedEffort = 0;

      allTasks.forEach((task) => {
        const effort = task.estimatedHours || 0;
        totalEffort += effort;

        if (task.status === "done") {
          completedEffort += effort;
        }
      });

      const completionRate =
        totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0;

      return {
        ...workspace,
        stats: {
          totalProjects,
          totalTasks,
          completedTasks,
          activeMembers: workspace.members?.length || 0,
          completionRate,
          totalEffort,
          completedEffort,
        },
      };
    })
  );

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
    hasPrev,
  };

  return NextResponse.json({
    success: true,
    data: {
      workspaces: workspacesWithStats,
      pagination,
    },
    message: "User workspaces retrieved successfully",
  });
});
