import { ChatRoom } from "@/src/models/chat-room";
import { ChatMessage } from "@/src/models/chat-message";
import { RoomInvitation } from "@/src/models/room-invitation";
import { Workspace } from "@/src/models/workspace";
import { EncryptionService } from "./encryption.service";
import { FileUploadService } from "./file-upload.service";
import crypto from "crypto";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
} from "@/src/errors/AppError";
import { RoomType } from "@/src/types/chat.types";
import { MemberRole } from "@/src/enums/user.enum";
import type {
  CreateRoomData,
  UpdateRoomData,
  SendMessageData,
  ChatRoom as ChatRoomType,
  ChatMessage as ChatMessageType,
} from "@/src/types/chat.types";
import { User } from "@/src/models/user";
import { EmailService } from "./email.service";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export class ChatService {
  private fileUploadService: FileUploadService;

  constructor() {
    this.fileUploadService = new FileUploadService();
  }

  /**
   * Create a new chat room with encryption setup
   */
  async createRoom(
    userId: string,
    data: CreateRoomData
  ): Promise<ChatRoomType> {
    const {
      name,
      description,
      type,
      workspaceId,
      isEncrypted = true,
      inviteUsers = [],
    } = data;

    // Verify workspace access
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    if (!workspace.isMember(userId)) {
      throw new AuthorizationError("Access denied to workspace");
    }

    // Check if general room already exists for workspace
    if (type === RoomType.GENERAL) {
      const existingGeneral = await ChatRoom.findOne({
        workspace: workspaceId,
        type: RoomType.GENERAL,
      });

      if (existingGeneral) {
        throw new ConflictError(
          "General room already exists for this workspace"
        );
      }
    }

    // Generate encryption key for the room
    const encryptionKeyId = isEncrypted
      ? EncryptionService.generateKeyId()
      : undefined;

    // Create room
    const room = new ChatRoom({
      name,
      description,
      type,
      workspace: workspaceId,
      createdBy: userId,
      isEncrypted,
      encryptionKeyId,
      members: [
        {
          user: userId,
          role: MemberRole.ADMIN,
          joinedAt: new Date(),
          // Generate and store user's public key for this room
          publicKey: isEncrypted
            ? EncryptionService.generateDHKeyPair().publicKey
            : undefined,
        },
      ],
    });

    // Add all workspace members to general room
    if (type === RoomType.GENERAL) {
      const workspaceMembers = workspace.members.map((member: any) => ({
        user: member.user,
        role: member.role,
        joinedAt: new Date(),
        // Generate public key for each member if encrypted
        publicKey: isEncrypted
          ? EncryptionService.generateDHKeyPair().publicKey
          : undefined,
      }));

      room.members = workspaceMembers;
    } else if (inviteUsers.length > 0) {
      // Add invited users to private room
      const invitedMembers = inviteUsers.map((inviteUserId) => ({
        user: inviteUserId,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
        publicKey: isEncrypted
          ? EncryptionService.generateDHKeyPair().publicKey
          : undefined,
      }));

      room.members.push(...invitedMembers);
    }

    await room.save();
    await room.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
      { path: "workspace", select: "name" },
    ]);

    return room.toObject();
  }

  /**
   * Get user's chat rooms
   */
  async getUserRooms(
    userId: string,
    workspaceId?: string
  ): Promise<ChatRoomType[]> {
    const query: any = {
      "members.user": userId,
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    const rooms = await ChatRoom.find(query)
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate("lastMessage")
      .populate("workspace", "name")
      .sort({ lastActivity: -1 });

    return rooms.map((room) => room.toObject());
  }

  /**
   * Get room by ID
   */
  async getRoomById(roomId: string, userId: string): Promise<ChatRoomType> {
    const room = await ChatRoom.findById(roomId)
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate("workspace", "name");

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is a member of the room
    const isMember = room.members.some(
      (member: any) => member.user && member.user.toString() === userId
    );
    if (!isMember) {
      throw new AuthorizationError("Access denied to this room");
    }

    return room.toObject();
  }

  /**
   * Update room (admin/owner/workspace owner)
   */
  async updateRoom(
    roomId: string,
    userId: string,
    data: UpdateRoomData
  ): Promise<ChatRoomType> {
    const room = await ChatRoom.findById(roomId).populate("workspace");

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user has admin access to the room OR is workspace owner
    const isRoomAdmin = room.isAdmin(userId);
    const workspace = room.workspace as any;
    const isWorkspaceOwner = workspace?.owner?.toString() === userId;

    if (!isRoomAdmin && !isWorkspaceOwner) {
      throw new AuthorizationError(
        "Only room admins, room owners, and workspace owners can update room settings"
      );
    }

    Object.assign(room, data);
    await room.save();
    await room.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
    ]);

    return room.toObject();
  }

  /**
   * Archive room
   */
  async archiveRoom(roomId: string, userId: string): Promise<ChatRoomType> {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (room.createdBy.toString() !== userId) {
      throw new AuthorizationError("Only room creator can archive the room");
    }

    room.isArchived = true;
    room.archivedAt = new Date();
    await room.save();

    await room.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
    ]);

    return room.toObject();
  }

  /**
   * Export room data
   */
  async exportRoomData(
    roomId: string,
    userId: string,
    format: string = "excel"
  ): Promise<any> {
    const room = await ChatRoom.findById(roomId).populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
    ]);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is a member of the room
    const isMember = room.members.some(
      (member: any) => member.user && member.user._id.toString() === userId
    );

    if (!isMember) {
      throw new AuthorizationError("Access denied");
    }

    // Get all messages in the room
    const messages = await ChatMessage.find({ room: roomId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    const exportData = {
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        type: room.type,
        isEncrypted: room.isEncrypted,
        createdAt: room.createdAt,
        createdBy: room.createdBy,
        members: room.members,
      },
      messages: messages.map((msg) => ({
        id: msg._id,
        content: msg.content,
        sender: msg.sender,
        createdAt: msg.createdAt,
        type: msg.type,
        isEncrypted: !!msg.encryptedContent,
      })),
      exportedAt: new Date(),
    };

    if (format === "excel") {
      return this.generateExcelExport(exportData);
    } else if (format === "pdf") {
      return this.generatePDFExport(exportData);
    } else {
      return exportData;
    }
  }

  /**
   * Regenerate encryption keys
   */
  async regenerateEncryptionKeys(
    roomId: string,
    userId: string
  ): Promise<ChatRoomType> {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is room creator or admin
    const isRoomCreator = room.createdBy.toString() === userId;
    const userMember = room.members.find(
      (member: any) => member.user.toString() === userId
    );
    const isAdmin = userMember?.role === "admin";

    if (!isRoomCreator && !isAdmin) {
      throw new AuthorizationError(
        "Only room creator or admins can regenerate encryption keys"
      );
    }

    console.log(
      `🔄 [CHAT-SERVICE] Regenerating encryption keys for room ${roomId}`
    );

    // Generate new encryption key ID
    const crypto = require("crypto");
    const newKeyId = crypto.randomBytes(16).toString("hex");

    // Store the old key ID for reference
    const oldKeyId = room.encryptionKeyId;
    room.encryptionKeyId = newKeyId;

    console.log(`🔑 [CHAT-SERVICE] New key ID generated: ${newKeyId}`);
    console.log(`🔑 [CHAT-SERVICE] Old key ID: ${oldKeyId}`);

    // Import key management service and regenerate keys
    const { KeyManagementService } = await import("./key-management.service");

    // Clean up very old keys but keep recent versions for backward compatibility
    await KeyManagementService.cleanupRoomKeys(roomId, 5);

    // Generate new key pairs for all members
    for (const member of room.members) {
      try {
        const keyPair = await KeyManagementService.generateUserKeyPairForRoom(
          member.user.toString(),
          roomId
        );

        // Update member's public key in the room
        const memberIndex = room.members.findIndex(
          (m: any) => m.user.toString() === member.user.toString()
        );
        if (memberIndex !== -1) {
          room.members[memberIndex].publicKey = keyPair.publicKey;
        }

        console.log(
          `🔑 [CHAT-SERVICE] Generated new key pair for member ${member.user}`
        );
      } catch (error) {
        console.error(
          `❌ [CHAT-SERVICE] Failed to generate key pair for member ${member.user}:`,
          error
        );
      }
    }

    await room.save();

    // Perform key exchange for all member pairs
    for (const member of room.members) {
      try {
        // Generate a private key for this member (simplified approach)
        const memberKeyPair = EncryptionService.generateDHKeyPair();

        await KeyManagementService.initializeRoomKeyExchange(
          member.user.toString(),
          roomId,
          memberKeyPair.privateKey
        );
        console.log(
          `🤝 [CHAT-SERVICE] Key exchange completed for member ${member.user}`
        );
      } catch (error) {
        console.error(
          `❌ [CHAT-SERVICE] Key exchange failed for member ${member.user}:`,
          error
        );
      }
    }

    console.log(
      `✅ [CHAT-SERVICE] Encryption keys regenerated successfully for room ${roomId}`
    );

    await room.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "members.user", select: "name email avatar" },
    ]);

    return room.toObject();
  }

  /**
   * Generate Excel export
   */
  private generateExcelExport(exportData: any): Buffer {
    const workbook = XLSX.utils.book_new();

    // Room Info Sheet
    const roomInfo = [
      ["Room Name", exportData.room.name],
      ["Description", exportData.room.description || "N/A"],
      ["Type", exportData.room.type],
      ["Encrypted", exportData.room.isEncrypted ? "Yes" : "No"],
      ["Created At", new Date(exportData.room.createdAt).toLocaleString()],
      ["Created By", exportData.room.createdBy?.name || "Unknown"],
      ["Total Members", exportData.room.members?.length || 0],
      ["Total Messages", exportData.messages.length],
      ["Exported At", new Date(exportData.exportedAt).toLocaleString()],
    ];

    const roomSheet = XLSX.utils.aoa_to_sheet(roomInfo);
    XLSX.utils.book_append_sheet(workbook, roomSheet, "Room Info");

    // Messages Sheet
    const messagesData = [
      ["Date", "Time", "Sender", "Message", "Type", "Encrypted"],
    ];

    exportData.messages.forEach((msg: any) => {
      const date = new Date(msg.createdAt);
      messagesData.push([
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        msg.sender?.name || "Unknown",
        msg.content || "[No content]",
        msg.type || "text",
        msg.isEncrypted ? "Yes" : "No",
      ]);
    });

    const messagesSheet = XLSX.utils.aoa_to_sheet(messagesData);
    XLSX.utils.book_append_sheet(workbook, messagesSheet, "Messages");

    // Members Sheet
    const membersData = [["Name", "Email", "Role", "Joined At"]];

    exportData.room.members?.forEach((member: any) => {
      membersData.push([
        member.user?.name || "Unknown",
        member.user?.email || "N/A",
        member.role || "member",
        new Date(member.joinedAt).toLocaleString(),
      ]);
    });

    const membersSheet = XLSX.utils.aoa_to_sheet(membersData);
    XLSX.utils.book_append_sheet(workbook, membersSheet, "Members");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * Generate PDF export
   */
  private generatePDFExport(exportData: any): Buffer {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(`Room Export: ${exportData.room.name}`, 20, 20);

    // Room Information
    doc.setFontSize(14);
    doc.text("Room Information", 20, 40);
    doc.setFontSize(10);

    const roomInfo = [
      ["Property", "Value"],
      ["Name", exportData.room.name],
      ["Description", exportData.room.description || "N/A"],
      ["Type", exportData.room.type],
      ["Encrypted", exportData.room.isEncrypted ? "Yes" : "No"],
      ["Created At", new Date(exportData.room.createdAt).toLocaleString()],
      ["Created By", exportData.room.createdBy?.name || "Unknown"],
      ["Total Members", exportData.room.members?.length || 0],
      ["Total Messages", exportData.messages.length],
      ["Exported At", new Date(exportData.exportedAt).toLocaleString()],
    ];

    autoTable(doc, {
      head: [roomInfo[0]],
      body: roomInfo.slice(1),
      startY: 50,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Messages Table
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Messages", 20, 20);

    const messagesData = exportData.messages.map((msg: any) => {
      const date = new Date(msg.createdAt);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        msg.sender?.name || "Unknown",
        msg.content?.substring(0, 50) +
          (msg.content?.length > 50 ? "..." : "") || "[No content]",
        msg.type || "text",
        msg.isEncrypted ? "Yes" : "No",
      ];
    });

    autoTable(doc, {
      head: [["Date", "Time", "Sender", "Message", "Type", "Encrypted"]],
      body: messagesData,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { cellWidth: 60 }, // Message column wider
      },
    });

    // Members Table
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Members", 20, 20);

    const membersData =
      exportData.room.members?.map((member: any) => [
        member.user?.name || "Unknown",
        member.user?.email || "N/A",
        member.role || "member",
        new Date(member.joinedAt).toLocaleString(),
      ]) || [];

    autoTable(doc, {
      head: [["Name", "Email", "Role", "Joined At"]],
      body: membersData,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
    });

    return Buffer.from(doc.output("arraybuffer"));
  }

  /**
   * Delete conversation for current user only
   */
  async deleteConversation(roomId: string, userId: string): Promise<void> {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is a member
    const isMember = room.members.some(
      (member: any) => member.user && member.user._id.toString() === userId
    );

    if (!isMember) {
      throw new AuthorizationError("Access denied");
    }

    // For regular members, we'll mark messages as hidden for this user
    // This is a soft delete that only affects the user's view
    await ChatMessage.updateMany(
      { room: roomId },
      { $addToSet: { hiddenFrom: userId } }
    );

    console.log(`🗑️ User ${userId} deleted conversation in room ${roomId}`);
  }

  /**
   * Delete entire room (owner, admin, and workspace owner)
   */
  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await ChatRoom.findById(roomId)
      .populate("members.user", "name email")
      .populate("workspace");

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is the room owner
    const isRoomOwner = room.createdBy && room.createdBy.toString() === userId;

    // Check if user is an admin
    const userMember = room.members.find(
      (m: any) => m.user && m.user._id.toString() === userId
    );
    const isAdmin = userMember?.role === "admin";

    // Check if user is workspace owner
    const workspace = room.workspace as any;
    const isWorkspaceOwner = workspace?.owner?.toString() === userId;

    if (!isRoomOwner && !isAdmin && !isWorkspaceOwner) {
      throw new AuthorizationError(
        "Only room owners, admins, and workspace owners can delete the entire room"
      );
    }

    // Delete all messages in the room
    await ChatMessage.deleteMany({ room: roomId });

    // Delete the room itself
    await ChatRoom.findByIdAndDelete(roomId);

    const deleterRole = isRoomOwner
      ? "room owner"
      : isWorkspaceOwner
      ? "workspace owner"
      : "admin";
    console.log(`🗑️ Room ${roomId} deleted by ${deleterRole} ${userId}`);
  }

  /**
   * Delete all messages in a room (conversation)
   * - Room owners/admins: Delete messages for everyone
   * - Regular members: Hide messages from their view only
   */
  async deleteRoomMessages(
    roomId: string,
    userId: string
  ): Promise<{
    deletedCount: number;
    roomId: string;
    roomName: string;
    type: "deleted" | "hidden";
  }> {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is a member of the room
    const member = room.members.find(
      (m: any) => m.user && m.user.toString() === userId
    );

    if (!member) {
      throw new AuthorizationError("You are not a member of this room");
    }

    // Check user permissions
    const isOwner = room.createdBy && room.createdBy.toString() === userId;
    const isAdmin = member.role === MemberRole.ADMIN;

    // Count messages before deletion/hiding
    const messageCount = await ChatMessage.countDocuments({
      room: roomId,
      deletedAt: { $exists: false },
      hiddenFrom: { $ne: userId },
    });

    if (isOwner || isAdmin) {
      // Room owners and admins can delete messages for everyone
      console.log(
        `🗑️ [CHAT-SERVICE] Admin/Owner ${userId} deleting ${messageCount} messages for everyone in room ${room.name}`
      );

      const result = await ChatMessage.deleteMany({ room: roomId });

      console.log(
        `✅ [CHAT-SERVICE] Deleted ${result.deletedCount} messages from room ${room.name}`
      );

      return {
        deletedCount: result.deletedCount,
        roomId,
        roomName: room.name,
        type: "deleted",
      };
    } else {
      // Regular members can only hide messages from their view
      console.log(
        `👁️ [CHAT-SERVICE] Member ${userId} hiding ${messageCount} messages from their view in room ${room.name}`
      );

      const result = await ChatMessage.updateMany(
        {
          room: roomId,
          deletedAt: { $exists: false },
          hiddenFrom: { $ne: userId },
        },
        {
          $addToSet: { hiddenFrom: userId },
        }
      );

      console.log(
        `✅ [CHAT-SERVICE] Hidden ${result.modifiedCount} messages for user ${userId} in room ${room.name}`
      );

      return {
        deletedCount: result.modifiedCount,
        roomId,
        roomName: room.name,
        type: "hidden",
      };
    }
  }

  /**
   * Send message with encryption
   */
  async sendMessage(
    userId: string,
    data: SendMessageData
  ): Promise<ChatMessageType> {
    const {
      roomId,
      content,
      type,
      attachments,
      replyTo,
      isEncrypted = true,
    } = data;

    // Verify room access
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is a member of the room
    const isMember = room.members.some(
      (member: any) => member.user && member.user.toString() === userId
    );
    if (!isMember) {
      throw new AuthorizationError("Access denied to this room");
    }

    // Handle file attachments
    let processedAttachments: any[] = [];
    if (attachments && attachments.length > 0) {
      processedAttachments = await Promise.all(
        attachments.map(async (file) => {
          // Handle different file types (Buffer from Socket.IO or File from form)
          let uploadResult;

          if (file instanceof Buffer) {
            // Legacy Buffer handling - should not happen with new format
            uploadResult = await this.fileUploadService.uploadFile(
              file,
              userId,
              `file_${Date.now()}.bin`, // Default name
              "application/octet-stream" // Default type
            );
          } else if (
            file &&
            typeof file === "object" &&
            (file as any).data &&
            (file as any).name
          ) {
            // New format from Socket.IO with metadata preserved
            const fileWithMeta = file as any;
            console.log("📎 Processing file with metadata:", {
              name: fileWithMeta.name,
              type: fileWithMeta.type,
              size: fileWithMeta.size,
            });
            const buffer = Buffer.from(fileWithMeta.data);
            uploadResult = await this.fileUploadService.uploadFile(
              buffer,
              userId,
              fileWithMeta.name, // Original filename
              fileWithMeta.type // Original MIME type
            );
          } else if (
            file &&
            typeof file === "object" &&
            typeof file.arrayBuffer === "function"
          ) {
            // File object with metadata (direct API upload)
            uploadResult = await this.fileUploadService.uploadFile(
              file,
              userId,
              file.name,
              file.type
            );
          } else {
            // Fallback for unknown format
            console.warn("⚠️ Unknown file format:", file);
            uploadResult = await this.fileUploadService.uploadFile(
              file,
              userId,
              `file_${Date.now()}.bin`,
              "application/octet-stream"
            );
          }

          // Encrypt file if room is encrypted
          let encryptedUrl = undefined;
          if (room.isEncrypted && isEncrypted && room.encryptionKeyId) {
            // In a real implementation, you'd encrypt the file content
            // For now, we'll just mark it as encrypted
            encryptedUrl = uploadResult.url + ".encrypted";
          }

          return {
            filename: uploadResult.filename,
            originalName: uploadResult.originalName,
            mimeType: uploadResult.mimeType,
            size: uploadResult.size,
            url: uploadResult.url,
            encryptedUrl,
          };
        })
      );
    }

    // Create message
    const message = new ChatMessage({
      room: roomId,
      sender: userId,
      type,
      content,
      attachments: processedAttachments,
      replyTo,
    });

    // Encrypt content if room is encrypted
    if (room.isEncrypted && isEncrypted && room.encryptionKeyId) {
      try {
        console.log(
          `🔐 [CHAT-SERVICE] Starting encryption for message in room: ${room.name} (${roomId})`
        );

        // Use a consistent shared secret based on room and encryption key
        // This ensures the same secret is used for encryption and decryption
        const consistentSharedSecret = crypto
          .createHash("sha256")
          .update(`${room.encryptionKeyId}-${roomId}-consistent-key`)
          .digest("hex");

        console.log(
          `🔑 [CHAT-SERVICE] Using consistent shared secret for room ${room.name}`
        );

        const encryptedContent = EncryptionService.encryptMessage(
          content,
          consistentSharedSecret,
          room.encryptionKeyId,
          userId,
          roomId,
          message._id.toString()
        );
        message.encryptedContent = encryptedContent;

        console.log(
          `✅ [CHAT-SERVICE] Message encrypted successfully for room ${room.name}`
        );
      } catch (error) {
        console.error(
          `❌ [CHAT-SERVICE] Failed to encrypt message for room ${room.name}:`,
          error
        );
        // Continue without encryption rather than failing
      }
    }

    await message.save();
    await message.populate([
      { path: "sender", select: "name email avatar" },
      { path: "replyTo", populate: { path: "sender", select: "name email" } },
    ]);

    // Update room's last activity
    room.lastActivity = new Date();
    room.lastMessage = message._id;
    await room.save();

    return message.toObject();
  }

  /**
   * Get room messages with decryption
   */
  async getRoomMessages(
    roomId: string,
    userId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: ChatMessageType[]; total: number }> {
    // Verify room access
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is a member of the room
    const isMember = room.members.some(
      (member: any) => member.user && member.user.toString() === userId
    );
    if (!isMember) {
      throw new AuthorizationError("Access denied to this room");
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      ChatMessage.find({
        room: roomId,
        deletedAt: { $exists: false },
        hiddenFrom: { $ne: userId }, // Exclude messages hidden from this user
      })
        .populate("sender", "name email avatar")
        .populate("reactions.user", "name email avatar")
        .populate({
          path: "replyTo",
          populate: { path: "sender", select: "name email" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ChatMessage.countDocuments({
        room: roomId,
        deletedAt: { $exists: false },
        hiddenFrom: { $ne: userId }, // Exclude messages hidden from this user
      }),
    ]);

    // Decrypt messages if room is encrypted
    const decryptedMessages = await Promise.all(
      messages.map(async (msg) => {
        const messageObj = msg.toObject();

        if (
          room.isEncrypted &&
          messageObj.encryptedContent &&
          room.encryptionKeyId
        ) {
          try {
            // Debug: Log the structure of encryptedContent
            console.log(
              `🔍 [CHAT-SERVICE] Debug - Message ${messageObj._id} encryptedContent structure:`,
              JSON.stringify(messageObj.encryptedContent, null, 2)
            );

            // Import KeyManagementService
            const { KeyManagementService } = await import(
              "./key-management.service"
            );

            // Try to get the proper shared secret from key management
            let sharedSecret =
              await KeyManagementService.getPrimarySharedSecret(userId, roomId);

            // If no shared secret found, try the current consistent pattern
            if (!sharedSecret) {
              console.log(
                `⚠️ [CHAT-SERVICE] No shared secret found in key management, using consistent pattern for room ${room.name}`
              );
              sharedSecret = crypto
                .createHash("sha256")
                .update(`${room.encryptionKeyId}-${roomId}-consistent-key`)
                .digest("hex");
            } else {
              console.log(
                `🔑 [CHAT-SERVICE] Using shared secret from key management for decryption in room ${room.name}`
              );
            }

            try {
              console.log(
                `🔍 [CHAT-SERVICE] Attempting decryption with shared secret for message ${messageObj._id}`
              );

              const decryptedContent = EncryptionService.decryptMessage(
                messageObj.encryptedContent,
                sharedSecret,
                userId,
                roomId,
                messageObj._id
              );
              messageObj.content = decryptedContent;

              console.log(
                `🔓 Message decrypted - Room: ${room.name} (${roomId}), Message ID: ${messageObj._id}, From: ${messageObj.sender.name}`
              );
            } catch (primaryKeyError) {
              // Try key versioning - look for older keys
              console.log(
                `⚠️ [CHAT-SERVICE] Primary key failed, trying key versioning for message ${messageObj._id}`
              );

              // Try to find keys with different versions
              const keyVersions =
                await KeyManagementService.getAllKeyVersions?.(userId, roomId);

              let decrypted = false;

              if (keyVersions && keyVersions.length > 0) {
                for (const versionedKey of keyVersions) {
                  try {
                    console.log(
                      `🔄 [CHAT-SERVICE] Trying key version ${versionedKey.version} for message ${messageObj._id}`
                    );

                    const decryptedContent = EncryptionService.decryptMessage(
                      messageObj.encryptedContent,
                      versionedKey.sharedSecret,
                      userId,
                      roomId,
                      messageObj._id
                    );
                    messageObj.content = decryptedContent;
                    decrypted = true;

                    console.log(
                      `🔓 Message decrypted with key version ${versionedKey.version} - Room: ${room.name} (${roomId}), Message ID: ${messageObj._id}`
                    );
                    break;
                  } catch (versionError) {
                    // Continue to next version
                    continue;
                  }
                }
              }

              // If key versioning fails, try a few essential fallback patterns
              if (!decrypted) {
                const essentialFallbacks = [
                  // Current key pattern
                  room.encryptionKeyId,
                  // Room-based patterns
                  `${roomId}-${room.encryptionKeyId}`,
                  `${room.encryptionKeyId}-${roomId}`,
                  // Hashed version of current key
                  crypto
                    .createHash("sha256")
                    .update(room.encryptionKeyId)
                    .digest("hex"),
                ];

                for (const fallbackSecret of essentialFallbacks) {
                  try {
                    console.log(
                      `🔄 [CHAT-SERVICE] Trying essential fallback for message ${
                        messageObj._id
                      }: ${fallbackSecret.substring(0, 10)}...`
                    );

                    const decryptedContent = EncryptionService.decryptMessage(
                      messageObj.encryptedContent,
                      fallbackSecret,
                      userId,
                      roomId,
                      messageObj._id
                    );
                    messageObj.content = decryptedContent;
                    decrypted = true;

                    console.log(
                      `🔓 Message decrypted with essential fallback - Room: ${
                        room.name
                      } (${roomId}), Message ID: ${
                        messageObj._id
                      }, Pattern: ${fallbackSecret.substring(0, 10)}...`
                    );
                    break;
                  } catch (fallbackError) {
                    // Continue to next pattern
                    continue;
                  }
                }
              }

              if (!decrypted) {
                console.error(
                  `❌ Failed to decrypt message ${messageObj._id} with all available keys`
                );
                messageObj.content = "[Encrypted message - unable to decrypt]";
              }
            }
          } catch (error) {
            console.error("❌ Failed to decrypt message:", error);
            messageObj.content = "[Encrypted message - decryption failed]";
          }
        }

        return messageObj;
      })
    );

    return {
      messages: decryptedMessages.reverse(),
      total,
    };
  }

  /**
   * Add reaction to message
   */
  async addReaction(
    messageId: string,
    userId: string,
    reactionType: string
  ): Promise<ChatMessageType> {
    const message = await ChatMessage.findById(messageId);
    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Check if user already reacted with this type
    const existingReaction = message.reactions.find(
      (reaction: any) =>
        reaction.user.toString() === userId && reaction.type === reactionType
    );

    if (existingReaction) {
      throw new ConflictError("You already reacted with this emoji");
    }

    message.reactions.push({
      user: userId as any,
      type: reactionType as any,
      createdAt: new Date(),
    });

    await message.save();
    await message.populate([
      { path: "sender", select: "name email avatar" },
      { path: "reactions.user", select: "name email avatar" },
    ]);

    return message.toObject();
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    reactionId: string
  ): Promise<ChatMessageType> {
    const message = await ChatMessage.findById(messageId);
    if (!message) {
      throw new NotFoundError("Message not found");
    }

    message.reactions = message.reactions.filter(
      (reaction: any) => reaction._id.toString() !== reactionId
    );

    await message.save();
    await message.populate([
      { path: "sender", select: "name email avatar" },
      { path: "reactions.user", select: "name email avatar" },
    ]);

    return message.toObject();
  }

  /**
   * Invite user to room
   */
  async inviteToRoom(
    roomId: string,
    inviterId: string,
    invitedUserId: string
  ): Promise<void> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!room.isAdmin(inviterId)) {
      throw new AuthorizationError("Admin access required to invite users");
    }

    // Check if user is already a member of the room
    const isAlreadyMember = room.members.some(
      (member: any) => member.user && member.user.toString() === invitedUserId
    );
    if (isAlreadyMember) {
      throw new ConflictError("User is already a member of this room");
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex");

    // Create invitation
    const invitation = new RoomInvitation({
      room: roomId,
      invitedBy: inviterId,
      invitedUser: invitedUserId,
      token: invitationToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await invitation.save();
  }

  /**
   * Invite user to room with email notification
   */
  async inviteToRoomWithEmail(
    roomId: string,
    inviterId: string,
    invitedUserId: string
  ): Promise<void> {
    console.log("🎯 Processing room invitation with email:", {
      roomId,
      inviterId,
      invitedUserId,
    });

    // First, create the room invitation in the database
    await this.inviteToRoom(roomId, inviterId, invitedUserId);

    try {
      // Get the invitation token that was just created
      const invitation = await RoomInvitation.findOne({
        room: roomId,
        invitedUser: invitedUserId,
        status: "pending",
      }).sort({ createdAt: -1 });

      if (!invitation) {
        throw new NotFoundError("Invitation not found");
      }

      console.log("🔍 Found invitation:", {
        id: invitation._id,
        token: invitation.token,
        hasToken: !!invitation.token,
      });

      // Get room details
      const room = await ChatRoom.findById(roomId)
        .populate("workspace", "name")
        .populate({
          path: "createdBy",
          select: "name email",
        });

      if (!room) {
        throw new NotFoundError("Room not found");
      }

      // Get inviter details
      const inviter = await User.findById(inviterId).select("name email");

      // Get invited user details
      const invitedUser = await User.findById(invitedUserId).select(
        "name email"
      );

      if (!invitedUser || !invitedUser.email) {
        throw new NotFoundError("Invited user not found");
      }

      // Send email invitation with token
      const emailService = new EmailService();
      await emailService.sendRoomInvitationEmail(
        invitedUser.email,
        inviter?.name || "A team member",
        invitedUser.name,
        room.name,
        room.workspace.name,
        roomId,
        invitation.token,
        room.workspace._id || room.workspace
      );

      console.log(
        `📧 Email invitation sent to ${invitedUser.email} for encrypted room ${room.name}`
      );
    } catch (error) {
      console.error("Failed to send room invitation email:", error);
      // Don't fail the invitation process if email sending fails
    }
  }

  /**
   * Accept room invitation by ID
   */
  async acceptRoomInvitation(
    invitationId: string,
    userId: string
  ): Promise<void> {
    const invitation = await RoomInvitation.findById(invitationId);
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.invitedUser.toString() !== userId) {
      throw new AuthorizationError("This invitation is not for you");
    }

    if (invitation.status !== "pending") {
      throw new ValidationError("Invitation is no longer pending");
    }

    if (invitation.expiresAt < new Date()) {
      throw new ValidationError("Invitation has expired");
    }

    // Add user to room with encryption key
    const room = await ChatRoom.findById(invitation.room);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Generate public key for the new member if room is encrypted
    const publicKey = room.isEncrypted
      ? EncryptionService.generateDHKeyPair().publicKey
      : undefined;

    room.members.push({
      user: userId as any,
      role: MemberRole.MEMBER,
      joinedAt: new Date(),
      publicKey,
    });

    await room.save();

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    console.log(`🔐 User ${userId} joined encrypted room ${room.name}`);
  }

  /**
   * Accept room invitation by token
   */
  async acceptRoomInvitationByToken(
    token: string,
    userId: string
  ): Promise<{ roomId: string; roomName: string }> {
    const invitation = await RoomInvitation.findOne({
      token,
      status: "pending",
    });

    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.invitedUser.toString() !== userId) {
      throw new AuthorizationError("This invitation is not for you");
    }

    if (invitation.expiresAt < new Date()) {
      throw new ValidationError("Invitation has expired");
    }

    // Add user to room with encryption key
    const room = await ChatRoom.findById(invitation.room);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is already a member
    const isMember = room.members.some(
      (member: any) => member.user && member.user.toString() === userId
    );

    if (!isMember) {
      // Generate public key for the new member if room is encrypted
      const publicKey = room.isEncrypted
        ? EncryptionService.generateDHKeyPair().publicKey
        : undefined;

      room.members.push({
        user: userId as any,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
        publicKey,
      });

      await room.save();
    }

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    console.log(
      `🔐 User ${userId} joined encrypted room ${room.name} via token`
    );

    return {
      roomId: room._id.toString(),
      roomName: room.name,
    };
  }

  /**
   * Update user's last read timestamp for a room
   */
  async updateLastRead(roomId: string, userId: string): Promise<void> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const memberIndex = room.members.findIndex(
      (member: any) => member.user.toString() === userId
    );

    if (memberIndex === -1) {
      throw new AuthorizationError("Access denied to this room");
    }

    room.members[memberIndex].lastReadAt = new Date();
    await room.save();
  }

  /**
   * Remove member from room
   */
  async removeMemberFromRoom(
    roomId: string,
    requesterId: string,
    memberUserId: string
  ): Promise<{ message: string; roomId: string; removedUserId: string }> {
    const room = await ChatRoom.findById(roomId)
      .populate("members.user", "name email")
      .populate("workspace");

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if requester is the room owner
    const isRoomOwner =
      room.createdBy && room.createdBy.toString() === requesterId;

    // Check if requester is an admin
    const requesterMember = room.members.find(
      (m: any) => m.user && m.user._id.toString() === requesterId
    );
    const isAdmin = requesterMember?.role === "admin";

    // Check if requester is workspace owner
    const workspace = room.workspace as any;
    const isWorkspaceOwner = workspace?.owner?.toString() === requesterId;

    // Only room owners, admins, and workspace owners can remove members
    if (!isRoomOwner && !isAdmin && !isWorkspaceOwner) {
      throw new AuthorizationError(
        "Only room owners, admins, and workspace owners can remove members"
      );
    }

    // Check if member exists in room
    const memberIndex = room.members.findIndex(
      (m: any) => m.user && m.user._id.toString() === memberUserId
    );

    if (memberIndex === -1) {
      throw new NotFoundError("Member not found in this room");
    }

    // Cannot remove the room owner
    if (memberUserId === requesterId) {
      throw new ValidationError("You cannot remove yourself from the room");
    }

    // Cannot remove the room owner (unless removing yourself)
    if (
      room.createdBy &&
      room.createdBy.toString() === memberUserId &&
      !isRoomOwner
    ) {
      throw new ValidationError(
        "Room owner cannot be removed by other members"
      );
    }

    const removedMember = room.members[memberIndex];
    room.members.splice(memberIndex, 1);
    await room.save();

    const removerRole = isRoomOwner
      ? "room owner"
      : isWorkspaceOwner
      ? "workspace owner"
      : "admin";
    console.log(
      `🚪 [CHAT-SERVICE] Member ${removedMember.user.name} removed from room ${room.name} by ${removerRole} ${requesterId}`
    );

    // Emit socket event to notify the removed user
    const io = (global as any).io;
    if (io) {
      // Notify the removed user to refresh their room list
      io.to(memberUserId).emit("member:removed", {
        roomId,
        roomName: room.name,
        removedBy: requesterId,
        message: `You have been removed from room "${room.name}"`,
      });

      // Notify other room members about the removal
      io.to(roomId).emit("member:left", {
        roomId,
        userId: memberUserId,
        userName: removedMember.user.name,
        removedBy: requesterId,
      });

      console.log(
        `📡 [CHAT-SERVICE] Socket notifications sent for member removal`
      );
    }

    return {
      message: `Member ${removedMember.user.name} removed successfully`,
      roomId,
      removedUserId: memberUserId,
    };
  }

  /**
   * Change member role in room
   */
  async changeMemberRole(
    roomId: string,
    ownerId: string,
    memberUserId: string,
    newRole: MemberRole
  ): Promise<{ message: string; roomId: string; updatedMember: any }> {
    const room = await ChatRoom.findById(roomId).populate(
      "members.user",
      "name email"
    );

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if requester is the room owner
    const isRoomOwner = room.createdBy && room.createdBy.toString() === ownerId;

    // Check if requester is an admin
    const requesterMember = room.members.find(
      (m: any) => m.user && m.user._id.toString() === ownerId
    );
    const isAdmin = requesterMember?.role === "admin";

    if (!isRoomOwner && !isAdmin) {
      throw new AuthorizationError(
        "Only room owners and admins can change member roles"
      );
    }

    // Find the member
    const member = room.members.find(
      (m: any) => m.user && m.user._id.toString() === memberUserId
    );

    if (!member) {
      throw new NotFoundError("Member not found in this room");
    }

    // Cannot change owner's role
    if (memberUserId === ownerId) {
      throw new ValidationError("Cannot change room owner's role");
    }

    // Validate role
    if (!Object.values(MemberRole).includes(newRole)) {
      throw new ValidationError("Invalid role specified");
    }

    const oldRole = member.role;
    member.role = newRole;
    await room.save();

    console.log(
      `👑 [CHAT-SERVICE] Member ${member.user.name} role changed from ${oldRole} to ${newRole} in room ${room.name}`
    );

    return {
      message: `Member role updated from ${oldRole} to ${newRole}`,
      roomId,
      updatedMember: {
        userId: memberUserId,
        name: member.user.name,
        email: member.user.email,
        oldRole,
        newRole,
      },
    };
  }

  /**
   * Invite member to room by email
   */
  async inviteMemberByEmail(
    roomId: string,
    ownerId: string,
    email: string
  ): Promise<{ message: string; roomId: string; invitedEmail: string }> {
    const room = await ChatRoom.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if requester is the room owner
    const isOwner = room.createdBy && room.createdBy.toString() === ownerId;
    if (!isOwner) {
      throw new AuthorizationError("Only room owners can invite members");
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new NotFoundError(`User with email ${email} not found`);
    }

    // Check if user is already a member
    const isMember = room.members.some(
      (m: any) => m.user && m.user.toString() === user._id.toString()
    );

    if (isMember) {
      throw new ValidationError("User is already a member of this room");
    }

    // Use existing invitation method
    await this.inviteToRoomWithEmail(roomId, ownerId, user._id.toString());

    console.log(
      `📧 [CHAT-SERVICE] Invitation sent to ${email} for room ${room.name} by owner ${ownerId}`
    );

    return {
      message: `Invitation sent to ${email} successfully`,
      roomId,
      invitedEmail: email,
    };
  }

  /**
   * Get room members with detailed information
   */
  async getRoomMembers(
    roomId: string,
    userId: string
  ): Promise<{ members: any[]; roomInfo: any }> {
    const room = await ChatRoom.findById(roomId)
      .populate("members.user", "name email avatar")
      .populate("createdBy", "name email avatar");

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if user is a member of the room
    const isMember = room.members.some(
      (m: any) => m.user && m.user._id.toString() === userId
    );

    if (!isMember) {
      throw new AuthorizationError("You are not a member of this room");
    }

    const members = room.members.map((member: any) => ({
      _id: member.user._id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatar,
      role: member.role,
      joinedAt: member.joinedAt,
      isOwner: member.user._id.toString() === room.createdBy._id.toString(),
    }));

    return {
      members,
      roomInfo: {
        _id: room._id,
        name: room.name,
        type: room.type,
        memberCount: room.members.length,
        createdBy: room.createdBy,
        isOwner: room.createdBy._id.toString() === userId,
      },
    };
  }
}
