import { Label } from "@/src/models/label";
import { Workspace } from "@/src/models/workspace";
import { Project } from "@/src/models/project";
import {
  NotFoundError,
  AuthorizationError,
  ConflictError,
} from "@/src/errors/AppError";
import type { PaginationParams } from "@/src/types/api.types";

export interface CreateLabelData {
  name: string;
  color: string;
  workspaceId: string;
  projectId?: string;
}

export interface UpdateLabelData {
  name?: string;
  color?: string;
}

export class LabelService {
  /**
   * Create a new label
   */
  async createLabel(userId: string, data: CreateLabelData) {
    const { name, color, workspaceId, projectId } = data;

    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace");
    }

    // If project-specific, verify project access
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project || !project.isMember(userId)) {
        throw new AuthorizationError("Access denied to project");
      }
    }

    // Check for duplicate label name
    const existingLabel = await Label.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      workspace: workspaceId,
      ...(projectId ? { project: projectId } : { project: { $exists: false } }),
    });

    if (existingLabel) {
      throw new ConflictError("Label with this name already exists");
    }

    const label = new Label({
      name,
      color,
      workspace: workspaceId,
      project: projectId,
      createdBy: userId,
    });

    await label.save();
    await label.populate("createdBy", "name email avatar");

    return label;
  }

  /**
   * Get labels for workspace or project
   */
  async getLabels(
    userId: string,
    workspaceId: string,
    projectId?: string,
    pagination: PaginationParams = {}
  ) {
    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace");
    }

    const {
      page = 1,
      limit = 50,
      sortBy = "name",
      sortOrder = "asc",
    } = pagination;
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const query: any = { workspace: workspaceId };

    if (projectId) {
      // Get both project-specific labels AND workspace-wide labels
      query.$or = [{ project: projectId }, { project: { $exists: false } }];
    } else {
      // Get workspace-wide labels (not project-specific)
      query.project = { $exists: false };
    }

    const [labels, total] = await Promise.all([
      Label.find(query)
        .populate("createdBy", "name email avatar")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Label.countDocuments(query),
    ]);

    return {
      labels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a label
   */
  async updateLabel(userId: string, labelId: string, data: UpdateLabelData) {
    const label = await Label.findById(labelId).populate("workspace");
    if (!label) {
      throw new NotFoundError("Label not found");
    }

    const workspace = label.workspace as any;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace");
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== label.name) {
      const existingLabel = await Label.findOne({
        name: { $regex: new RegExp(`^${data.name}$`, "i") },
        workspace: label.workspace,
        project: label.project,
        _id: { $ne: labelId },
      });

      if (existingLabel) {
        throw new ConflictError("Label with this name already exists");
      }
    }

    Object.assign(label, data);
    await label.save();
    await label.populate("createdBy", "name email avatar");

    return label;
  }

  /**
   * Delete a label
   */
  async deleteLabel(userId: string, labelId: string) {
    const label = await Label.findById(labelId).populate("workspace");
    if (!label) {
      throw new NotFoundError("Label not found");
    }

    const workspace = label.workspace as any;
    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace");
    }

    await Label.findByIdAndDelete(labelId);

    // TODO: Remove this label from all tasks that use it
    // This can be done in a background job or immediately
    const { Task } = await import("@/src/models/task");
    await Task.updateMany({ labels: labelId }, { $pull: { labels: labelId } });

    return { message: "Label deleted successfully" };
  }

  /**
   * Get all labels for a workspace (including project-specific ones)
   */
  async getAllWorkspaceLabels(userId: string, workspaceId: string) {
    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace");
    }

    const labels = await Label.find({ workspace: workspaceId })
      .populate("createdBy", "name email avatar")
      .populate("project", "name")
      .sort({ name: 1 });

    return labels;
  }
}
