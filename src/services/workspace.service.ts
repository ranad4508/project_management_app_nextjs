import { Workspace } from "@/src/models/workspace"
import { User } from "@/src/models/user"
import { Invitation } from "@/src/models/invitation"
import { Project } from "@/src/models/project"
import { StringUtils } from "@/src/utils/string.utils"
import { CryptoUtils } from "@/src/utils/crypto.utils"
import { DateUtils } from "@/src/utils/date.utils"
import { EmailService } from "./email.service"
import { NotificationService } from "./notification.service"
import { NotFoundError, ConflictError, AuthorizationError, ValidationError } from "@/src/errors/AppError"
import { WorkspaceStatus } from "@/src/enums/workspace.enum"
import { MemberRole } from "@/src/enums/user.enum"
import { InvitationStatus } from "@/src/enums/invitation.enum"
import type { CreateWorkspaceData, UpdateWorkspaceData, InviteMemberData } from "@/src/types/workspace.types"
import type { PaginationParams } from "@/src/types/api.types"

export class WorkspaceService {
  private emailService: EmailService
  private notificationService: NotificationService

  constructor() {
    this.emailService = new EmailService()
    this.notificationService = new NotificationService()
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(userId: string, data: CreateWorkspaceData) {
    const { name, description } = data

    // Generate unique slug
    const baseSlug = StringUtils.slugify(name)
    let slug = baseSlug
    let counter = 1

    while (await Workspace.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`
      counter++
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
    })

    await workspace.save()
    await workspace.populate("members.user", "name email avatar")

    return workspace
  }

  /**
   * Get user workspaces
   */
  async getUserWorkspaces(userId: string, pagination: PaginationParams = {}) {
    const { page = 1, limit = 10, sortBy = "updatedAt", sortOrder = "desc" } = pagination

    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const workspaces = await Workspace.find({
      "members.user": userId,
      status: { $ne: WorkspaceStatus.DELETED },
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const total = await Workspace.countDocuments({
      "members.user": userId,
      status: { $ne: WorkspaceStatus.DELETED },
    })

    return {
      workspaces,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Get workspace by ID
   */
  async getWorkspaceById(workspaceId: string, userId: string) {
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      "members.user": userId,
      status: { $ne: WorkspaceStatus.DELETED },
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")

    if (!workspace) {
      throw new NotFoundError("Workspace not found or access denied")
    }

    // Get workspace statistics
    const projectCount = await Project.countDocuments({ workspace: workspaceId })
    const memberCount = workspace.members.length

    return {
      ...workspace.toObject(),
      stats: {
        projectCount,
        memberCount,
      },
    }
  }

  /**
   * Update workspace
   */
  async updateWorkspace(workspaceId: string, userId: string, data: UpdateWorkspaceData) {
    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
      throw new NotFoundError("Workspace not found")
    }

    if (!workspace.isAdmin(userId)) {
      throw new AuthorizationError("Admin access required")
    }

    // Update slug if name changed
    if (data.name && data.name !== workspace.name) {
      const baseSlug = StringUtils.slugify(data.name)
      let slug = baseSlug
      let counter = 1

      while (await Workspace.findOne({ slug, _id: { $ne: workspaceId } })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      workspace.slug = slug
    }

    Object.assign(workspace, data)
    await workspace.save()
    await workspace.populate("members.user", "name email avatar")

    return workspace
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string, userId: string) {
    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
      throw new NotFoundError("Workspace not found")
    }

    if (workspace.owner.toString() !== userId) {
      throw new AuthorizationError("Only workspace owner can delete the workspace")
    }

    // Soft delete
    workspace.status = WorkspaceStatus.DELETED
    await workspace.save()

    // Archive all projects in the workspace
    await Project.updateMany({ workspace: workspaceId }, { status: "archived" })

    return { message: "Workspace deleted successfully" }
  }

  /**
   * Invite member to workspace
   */
  async inviteMember(workspaceId: string, inviterId: string, data: InviteMemberData) {
    const { email, role, message } = data

    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
      throw new NotFoundError("Workspace not found")
    }

    if (!workspace.isAdmin(inviterId)) {
      throw new AuthorizationError("Admin access required to invite members")
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })

    // Check if user is already a member
    if (existingUser && workspace.isMember(existingUser._id.toString())) {
      throw new ConflictError("User is already a member of this workspace")
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      email,
      workspace: workspaceId,
      status: InvitationStatus.PENDING,
    })

    if (existingInvitation && !existingInvitation.isExpired()) {
      throw new ConflictError("An invitation has already been sent to this email")
    }

    // Create invitation
    const token = CryptoUtils.generateToken()
    const expiresAt = DateUtils.addTime(new Date(), 7, "days")

    const invitation = new Invitation({
      email,
      workspace: workspaceId,
      role,
      token,
      expiresAt,
      invitedBy: inviterId,
      message,
      status: InvitationStatus.PENDING,
    })

    await invitation.save()

    // Get inviter details
    const inviter = await User.findById(inviterId)

    // Send invitation email
    await this.emailService.sendTeamInvitationEmail(email, inviter!.name, workspace.name, token)

    return { message: "Invitation sent successfully" }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userId?: string) {
    const invitation = await Invitation.findOne({
      token,
      status: InvitationStatus.PENDING,
    }).populate("workspace")

    if (!invitation || invitation.isExpired()) {
      throw new ValidationError("Invalid or expired invitation")
    }

    const workspace = invitation.workspace as any

    // If user is logged in, check email match
    if (userId) {
      const user = await User.findById(userId)
      if (user!.email !== invitation.email) {
        throw new ValidationError("Invitation email does not match your account")
      }

      // Add user to workspace
      workspace.members.push({
        user: userId,
        role: invitation.role,
        joinedAt: new Date(),
        permissions: [],
      })

      await workspace.save()

      // Update invitation status
      invitation.status = InvitationStatus.ACCEPTED
      invitation.acceptedAt = new Date()
      await invitation.save()

      // Send notification to workspace admins
      await this.notificationService.notifyWorkspaceAdmins(
        workspace._id,
        `${user!.name} joined the workspace`,
        `${user!.name} has accepted the invitation and joined ${workspace.name}`,
      )

      return {
        message: "Invitation accepted successfully",
        workspace: workspace._id,
      }
    }

    // Return invitation details for registration
    return {
      invitation: {
        email: invitation.email,
        workspaceName: workspace.name,
        role: invitation.role,
        token,
      },
    }
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspaceId: string, userId: string) {
    const workspace = await Workspace.findById(workspaceId)
      .populate("members.user", "name email avatar lastLoginAt")
      .populate("owner", "name email avatar")

    if (!workspace) {
      throw new NotFoundError("Workspace not found")
    }

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied")
    }

    // Get pending invitations
    const pendingInvitations = await Invitation.find({
      workspace: workspaceId,
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() },
    }).populate("invitedBy", "name email")

    return {
      members: workspace.members,
      owner: workspace.owner,
      pendingInvitations,
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(workspaceId: string, adminId: string, memberId: string, role: MemberRole) {
    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
      throw new NotFoundError("Workspace not found")
    }

    if (!workspace.isAdmin(adminId)) {
      throw new AuthorizationError("Admin access required")
    }

    if (workspace.owner.toString() === memberId) {
      throw new ValidationError("Cannot change owner role")
    }

    const memberIndex = workspace.members.findIndex((member) => member.user.toString() === memberId)

    if (memberIndex === -1) {
      throw new NotFoundError("Member not found in workspace")
    }

    workspace.members[memberIndex].role = role
    await workspace.save()

    return { message: "Member role updated successfully" }
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: string, adminId: string, memberId: string) {
    const workspace = await Workspace.findById(workspaceId)

    if (!workspace) {
      throw new NotFoundError("Workspace not found")
    }

    if (workspace.owner.toString() === memberId) {
      throw new ValidationError("Cannot remove workspace owner")
    }

    // Check if admin or self-removal
    const isSelfRemoval = adminId === memberId
    if (!isSelfRemoval && !workspace.isAdmin(adminId)) {
      throw new AuthorizationError("Admin access required to remove members")
    }

    workspace.members = workspace.members.filter((member) => member.user.toString() !== memberId)

    await workspace.save()

    return { message: "Member removed successfully" }
  }
}
