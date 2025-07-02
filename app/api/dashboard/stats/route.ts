import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { Task } from "@/src/models/task";
import { Project } from "@/src/models/project";
import { Workspace } from "@/src/models/workspace";
import { TaskStatus } from "@/src/enums/task.enum";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";
import mongoose from "mongoose";

export const GET = asyncHandler(async (req: NextRequest) => {
  await Database.connect();

  const user = await requireAuth(req);

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

  // Get task statistics
  const [
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    totalProjects,
    activeProjects,
    totalWorkspaces,
  ] = await Promise.all([
    Task.countDocuments({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
    }),
    Task.countDocuments({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
      status: TaskStatus.DONE,
    }),
    Task.countDocuments({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
      status: TaskStatus.IN_PROGRESS,
    }),
    Task.countDocuments({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
      dueDate: { $lt: new Date() },
      status: { $ne: TaskStatus.DONE },
    }),
    Project.countDocuments({
      workspace: { $in: workspaceIds },
    }),
    Project.countDocuments({
      workspace: { $in: workspaceIds },
      status: "active",
    }),
    workspaceIds.length,
  ]);

  const stats = {
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    totalProjects,
    activeProjects,
    totalWorkspaces,
  };

  return NextResponse.json({
    success: true,
    data: stats,
    message: "Dashboard stats retrieved successfully",
  });
});
