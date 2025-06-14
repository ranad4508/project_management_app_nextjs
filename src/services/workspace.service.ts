import { Workspace } from "@/src/models/workspace";
import { User } from "@/src/models/user";
import { Invitation } from "@/src/models/invitation";
import { Project } from "@/src/models/project";
import { Task } from "@/src/models/task";
import { ChatService } from "./chat.service";
import { StringUtils } from "@/src/utils/string.utils";
import { EncryptionUtils } from "@/src/utils/crypto.utils";
import { DateUtils } from "@/src/utils/date.utils";
import { EmailService } from "./email.service";
import { NotificationService } from "./notification.service";
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  ValidationError,
} from "@/src/errors/AppError";
import { WorkspaceStatus } from "@/src/enums/workspace.enum";
import { MemberRole } from "@/src/enums/user.enum";
import { InvitationStatus } from "@/src/enums/invitation.enum";
import { RoomType } from "@/src/types/chat.types";
import type {
  CreateWorkspaceData,
  UpdateWorkspaceData,
  InviteMemberData,
} from "@/src/types/workspace.types";
import type { PaginationParams } from "@/src/types/api.types";

export class WorkspaceService {
  private emailService: EmailService;
  private notificationService: NotificationService;
  private chatService: ChatService;

  constructor() {
    this.emailService = new EmailService();
    this.notificationService = new NotificationService();
    this.chatService = new ChatService();
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(userId: string, data: CreateWorkspaceData) {
    const { name, description } = data;

    // Generate unique slug
    const baseSlug = StringUtils.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (await Workspace.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const workspace = new Workspace({
      name,
      description,
      slug,
      owner: userId,
      members: [
        {
          user: userId,
          role: MemberRole.ADMIN,
          joinedAt: new Date(),
          permissions: [],
        },
      ],
      status: WorkspaceStatus.ACTIVE,
    });

    await workspace.save();

    // Automatically create general chat room with E2E encryption
    try {
      console.log(`Creating general room for workspace: ${workspace._id}`);
      await this.chatService.createRoom(userId, {
        name: "General",
        description: "General discussion for all workspace members",
        type: RoomType.GENERAL,
        workspaceId: workspace._id.toString(),
        isEncrypted: true, // Enable E2E encryption by default
      });
      console.log(
        `General room created successfully for workspace: ${workspace._id}`
      );
    } catch (error) {
      console.error("Failed to create general chat room:", error);
      // Don't fail workspace creation if chat room creation fails
    }

    await workspace.populate([
      { path: "owner", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
    ]);

    // Get workspace stats
    const stats = await this.getWorkspaceStats(workspace._id.toString());

    return {
      ...workspace.toObject(),
      stats,
    };
  }

  /**
   * Add member to workspace and general chat room
   */
  async addMemberToWorkspace(
    workspaceId: string,
    userId: string,
    role: MemberRole = MemberRole.MEMBER
  ) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Check if user is already a member
    if (workspace.isMember(userId)) {
      console.log(
        `User ${userId} is already a member of workspace ${workspaceId}`
      );
      return workspace;
    }

    // Add member to workspace
    workspace.members.push({
      user: userId as any,
      role,
      joinedAt: new Date(),
    });

    await workspace.save();

    // Add member to general room
    try {
      await this.addMemberToGeneralRoom(workspaceId, userId);
    } catch (error) {
      console.error("Failed to add user to general chat room:", error);
    }

    return workspace;
  }

  /**
   * Add member to general chat room
   */
  private async addMemberToGeneralRoom(workspaceId: string, userId: string) {
    try {
      // Find the general room for this workspace
      const { ChatRoom } = await import("@/src/models/chat-room");
      const generalRoom = await ChatRoom.findOne({
        workspace: workspaceId,
        type: RoomType.GENERAL,
      });

      if (generalRoom) {
        // Check if user is already a member
        const isAlreadyMember = generalRoom.members.some(
          (member: any) => member.user.toString() === userId
        );

        if (!isAlreadyMember) {
          // Add user to general room members
          generalRoom.members.push({
            user: userId,
            role: MemberRole.MEMBER,
            joinedAt: new Date(),
          });
          await generalRoom.save();
          console.log(
            `Added user ${userId} to general room ${generalRoom._id}`
          );
        }
      } else {
        console.warn(`General room not found for workspace ${workspaceId}`);
      }
    } catch (error) {
      console.error("Error adding member to general room:", error);
      throw error;
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userId?: string) {
    const invitation = await Invitation.findOne({
      token,
      status: InvitationStatus.PENDING,
    }).populate("workspace");

    if (!invitation || invitation.isExpired()) {
      throw new ValidationError("Invalid or expired invitation");
    }

    const workspace = invitation.workspace as any;

    // If user is logged in, check email match and add to workspace
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (user.email !== invitation.email) {
        throw new ValidationError(
          "Invitation email does not match your account"
        );
      }

      // Add user to workspace and general room
      await this.addMemberToWorkspace(
        workspace._id.toString(),
        userId,
        invitation.role
      );

      // Update invitation status
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedAt = new Date();
      await invitation.save();

      // Send notification to workspace admins
      try {
        await this.notificationService.notifyWorkspaceAdmins(
          workspace._id,
          `${user.name} joined the workspace`,
          `${user.name} has accepted the invitation and joined ${workspace.name}`
        );
      } catch (error) {
        console.error("Failed to send notification:", error);
        // Don't fail the invitation acceptance if notification fails
      }

      return {
        message: "Invitation accepted successfully",
        workspace: workspace._id.toString(),
      };
    }

    // Return invitation details for registration
    return {
      invitation: {
        email: invitation.email,
        workspaceName: workspace.name,
        role: invitation.role,
        token,
      },
    };
  }

  /**
   * Get user workspaces with stats
   */
  async getUserWorkspaces(userId: string, pagination: PaginationParams = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "updatedAt",
      sortOrder = "desc",
    } = pagination;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const workspaces = await Workspace.find({
      "members.user": userId,
      status: { $ne: WorkspaceStatus.DELETED },
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort(sort as any)
      .skip(skip)
      .limit(limit);

    const total = await Workspace.countDocuments({
      "members.user": userId,
      status: { $ne: WorkspaceStatus.DELETED },
    });

    // Get stats for each workspace
    const workspacesWithStats = await Promise.all(
      workspaces.map(async (workspace) => {
        const stats = await this.getWorkspaceStats(workspace._id.toString());
        return {
          ...workspace.toObject(),
          stats,
        };
      })
    );

    return {
      workspaces: workspacesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get workspace by ID with stats
   */
  async getWorkspaceById(workspaceId: string, userId: string) {
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      "members.user": userId,
      status: { $ne: WorkspaceStatus.DELETED },
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    if (!workspace) {
      throw new NotFoundError("Workspace not found or access denied");
    }

    // Get workspace statistics
    const stats = await this.getWorkspaceStats(workspaceId);

    // Get recent projects
    const projects = await Project.find({ workspace: workspaceId })
      .populate("members", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort({ updatedAt: -1 })
      .limit(10);

    // Get projects with task counts
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const totalTasks = await Task.countDocuments({ project: project._id });
        const completedTasks = await Task.countDocuments({
          project: project._id,
          status: "completed",
        });

        return {
          _id: project._id.toString(),
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          tasksCount: totalTasks,
          completedTasks,
          assignedTo: project.members || [],
          dueDate: project.dueDate,
          stats: {
            completionPercentage:
              totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0,
            totalTasks,
            completedTasks,
          },
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      })
    );

    return {
      ...workspace.toObject(),
      stats,
      projects: projectsWithStats,
    };
  }

  /**
   * Get workspace statistics
   */
  private async getWorkspaceStats(workspaceId: string) {
    const [totalProjects, totalTasks, completedTasks, overdueTasks] =
      await Promise.all([
        Project.countDocuments({ workspace: workspaceId }),
        Task.countDocuments({ workspace: workspaceId }),
        Task.countDocuments({ workspace: workspaceId, status: "completed" }),
        Task.countDocuments({
          workspace: workspaceId,
          dueDate: { $lt: new Date() },
          status: { $ne: "completed" },
        }),
      ]);

    const workspace = await Workspace.findById(workspaceId);
    const activeMembers = workspace?.members.length || 0;

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      activeMembers,
      completionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: UpdateWorkspaceData
  ) {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (!workspace.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required");
    }

    // Update slug if name changed
    if (data.name && data.name !== workspace.name) {
      const baseSlug = StringUtils.slugify(data.name);
      let slug = baseSlug;
      let counter = 1;

      while (await Workspace.findOne({ slug, _id: { $ne: workspaceId } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      workspace.slug = slug;
    }

    Object.assign(workspace, data);
    await workspace.save();
    await workspace.populate([
      { path: "owner", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
    ]);

    const stats = await this.getWorkspaceStats(workspaceId);

    return {
      ...workspace.toObject(),
      stats,
    };
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string, userId: string) {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (workspace.owner.toString() !== userId) {
      throw new AuthorizationError(
        "Only workspace owner can delete the workspace"
      );
    }

    // Soft delete
    workspace.status = WorkspaceStatus.DELETED;
    await workspace.save();

    // Archive all projects in the workspace
    await Project.updateMany(
      { workspace: workspaceId },
      { status: "archived" }
    );

    return { message: "Workspace deleted successfully" };
  }

  /**
   * Invite member to workspace
   */
  async inviteMember(
    workspaceId: string,
    inviterId: string,
    data: InviteMemberData
  ) {
    const { email, role, message } = data;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (!workspace.isAdmin(inviterId)) {
      throw new AuthorizationError("Admin access required to invite members");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    // Check if user is already a member
    if (existingUser && workspace.isMember(existingUser._id.toString())) {
      throw new ConflictError("User is already a member of this workspace");
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      email,
      workspace: workspaceId,
      status: InvitationStatus.PENDING,
    });

    if (existingInvitation && !existingInvitation.isExpired()) {
      throw new ConflictError(
        "An invitation has already been sent to this email"
      );
    }

    // Create invitation
    const token = EncryptionUtils.generateToken();
    const expiresAt = DateUtils.addTime(new Date(), 7, "days");

    const invitation = new Invitation({
      email,
      workspace: workspaceId,
      role,
      token,
      expiresAt,
      invitedBy: inviterId,
      message,
      status: InvitationStatus.PENDING,
    });

    await invitation.save();

    // Get inviter details
    const inviter = await User.findById(inviterId);

    // Send invitation email with chat access information
    await this.emailService.sendWorkspaceInvitationWithChatEmail(
      email,
      inviter!.name,
      workspace.name,
      token,
      message
    );

    return { message: "Invitation sent successfully" };
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspaceId: string, userId: string) {
    const workspace = await Workspace.findById(workspaceId)
      .populate("members.user", "name email avatar lastLoginAt")
      .populate("owner", "name email avatar");

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied");
    }

    // Get pending invitations
    const pendingInvitations = await Invitation.find({
      workspace: workspaceId,
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() },
    }).populate("invitedBy", "name email");

    return {
      members: workspace.members,
      owner: workspace.owner,
      pendingInvitations,
    };
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    workspaceId: string,
    adminId: string,
    memberId: string,
    role: MemberRole
  ) {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (!workspace.isAdmin(adminId)) {
      throw new AuthorizationError("Admin access required");
    }

    if (workspace.owner.toString() === memberId) {
      throw new ValidationError("Cannot change owner role");
    }

    const memberIndex = workspace.members.findIndex(
      (member: any) => member.user.toString() === memberId
    );

    if (memberIndex === -1) {
      throw new NotFoundError("Member not found in workspace");
    }

    workspace.members[memberIndex].role = role;
    await workspace.save();

    return { message: "Member role updated successfully" };
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: string, adminId: string, memberId: string) {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (workspace.owner.toString() === memberId) {
      throw new ValidationError("Cannot remove workspace owner");
    }

    // Check if admin or self-removal
    const isSelfRemoval = adminId === memberId;
    if (!isSelfRemoval && !workspace.isAdmin(adminId)) {
      throw new AuthorizationError("Admin access required to remove members");
    }

    workspace.members = workspace.members.filter(
      (member: any) => member.user.toString() !== memberId
    );

    await workspace.save();

    // Remove from all chat rooms in the workspace
    try {
      const rooms = await this.chatService.getUserRooms(memberId, workspaceId);
      for (const room of rooms) {
        const { ChatRoom } = await import("@/src/models/chat-room");
        await ChatRoom.findByIdAndUpdate(room._id, {
          $pull: { members: { user: memberId } },
        });
      }
    } catch (error) {
      console.error("Failed to remove user from chat rooms:", error);
    }

    return { message: "Member removed successfully" };
  }

  /**
   * Get workspace settings
   */
  async getWorkspaceSettings(workspaceId: string, userId: string) {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (!workspace.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required");
    }

    return {
      settings: workspace.settings,
      permissions: {
        canEdit: workspace.isAdmin(userId),
        canDelete: workspace.owner.toString() === userId,
        canInvite: workspace.isAdmin(userId),
      },
    };
  }

  /**
   * Update workspace settings
   */
  async updateWorkspaceSettings(
    workspaceId: string,
    userId: string,
    settings: any
  ) {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (!workspace.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required");
    }

    workspace.settings = { ...workspace.settings, ...settings };
    await workspace.save();

    return {
      message: "Settings updated successfully",
      settings: workspace.settings,
    };
  }
}
