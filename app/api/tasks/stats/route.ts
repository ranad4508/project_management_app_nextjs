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

  // Get user's workspaces
  const userWorkspaces = await Workspace.find({
    $or: [{ owner: userObjectId }, { members: userObjectId }],
  }).select("_id");

  const workspaceIds = userWorkspaces.map((w) => w._id);

  // Get user's projects
  const userProjects = await Project.find({
    workspace: { $in: workspaceIds },
  }).select("_id");

  const projectIds = userProjects.map((p) => p._id);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Get task statistics and effort data
  const [
    total,
    completed,
    inProgress,
    todo,
    overdue,
    dueToday,
    dueTomorrow,
    dueThisWeek,
    allTasks,
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
      status: TaskStatus.TODO,
    }),
    Task.countDocuments({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
      dueDate: { $lt: today },
      status: { $ne: TaskStatus.DONE },
    }),
    Task.countDocuments({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
      dueDate: { $gte: today, $lt: tomorrow },
      status: { $ne: TaskStatus.DONE },
    }),
    Task.countDocuments({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
      dueDate: {
        $gte: tomorrow,
        $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
      },
      status: { $ne: TaskStatus.DONE },
    }),
    Task.countDocuments({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
      dueDate: { $gte: today, $lt: nextWeek },
      status: { $ne: TaskStatus.DONE },
    }),
    Task.find({
      $or: [{ assignedTo: userObjectId }, { project: { $in: projectIds } }],
    }).select("estimatedHours status"),
  ]);

  // Calculate effort-based completion
  let totalEffort = 0;
  let completedEffort = 0;

  allTasks.forEach((task) => {
    const effort = task.estimatedHours || 0;
    totalEffort += effort;

    if (task.status === TaskStatus.DONE) {
      completedEffort += effort;
    }
  });

  // Use only effort-based completion rate
  const completionRate =
    totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0;

  const stats = {
    total,
    completed,
    inProgress,
    todo,
    overdue,
    dueToday,
    dueTomorrow,
    dueThisWeek,
    totalEffort,
    completedEffort,
    completionRate,
  };

  return NextResponse.json({
    success: true,
    data: stats,
    message: "Task stats retrieved successfully",
  });
});
