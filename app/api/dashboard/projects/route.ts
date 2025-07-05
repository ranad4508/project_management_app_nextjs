import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { Project } from "@/src/models/project";
import { Workspace } from "@/src/models/workspace";
import { Task } from "@/src/models/task";
import { TaskStatus } from "@/src/enums/task.enum";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";
import mongoose from "mongoose";

export const GET = asyncHandler(async (req: NextRequest) => {
  await Database.connect();

  const user = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "6");

  // Convert user ID to ObjectId
  const userObjectId = new mongoose.Types.ObjectId(user.id);

  // Get unique workspace IDs to avoid duplicates
  const workspaceIds = await Workspace.distinct("_id", {
    $or: [{ owner: userObjectId }, { "members.user": userObjectId }],
  });

  // Get recent projects for dashboard
  const projects = await Project.find({
    workspace: { $in: workspaceIds },
  })
    .populate({
      path: "workspace",
      select: "name members",
      populate: {
        path: "members.user",
        select: "name email profileImage avatar",
      },
    })
    .populate("members", "name email profileImage")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  // Calculate completion rates for each project based on effort
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const [
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        allTasks,
      ] = await Promise.all([
        Task.countDocuments({ project: project._id }),
        Task.countDocuments({
          project: project._id,
          status: TaskStatus.DONE,
        }),
        Task.countDocuments({
          project: project._id,
          status: TaskStatus.IN_PROGRESS,
        }),
        Task.countDocuments({
          project: project._id,
          dueDate: { $lt: new Date() },
          status: { $nin: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        }),
        Task.find({ project: project._id }).select("estimatedHours status"),
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

      const completionRate =
        totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0;

      return {
        ...project,
        stats: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          completionPercentage: completionRate,
          totalEffort,
          completedEffort,
        },
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: projectsWithStats,
    message: "Dashboard projects retrieved successfully",
  });
});
