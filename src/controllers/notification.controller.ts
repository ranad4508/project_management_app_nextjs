import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/src/services/notification.service";
import { requireAuth } from "@/src/middleware/auth.middleware";
import { asyncHandler } from "@/src/errors/errorHandler";
import type { ApiResponse } from "@/src/types/api.types";

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Get user notifications
  getUserNotifications = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { searchParams } = new URL(req.url);

      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const status = searchParams.get("status") || undefined;
      const type = searchParams.get("type") || undefined;

      const result = await this.notificationService.getUserNotifications(
        user.id,
        { page, limit },
        status as any,
        type as any
      );

      return NextResponse.json({
        success: true,
        data: result,
        message: "Notifications retrieved successfully",
      });
    }
  );

  // Get unread notification count
  getUnreadCount = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);

      const count = await this.notificationService.getUnreadCount(user.id);

      return NextResponse.json({
        success: true,
        data: { count },
        message: "Unread count retrieved successfully",
      });
    }
  );

  // Mark notification as read
  markAsRead = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;

      const notification = await this.notificationService.markAsRead(
        id,
        user.id
      );

      if (!notification) {
        return NextResponse.json(
          {
            success: false,
            message: "Notification not found",
          },
          { status: 404 }
        );
      }

      // Emit real-time update
      const io = (global as any).io;
      if (io) {
        io.to(`user:${user.id}`).emit("notification:read", {
          notificationId: id,
          userId: user.id,
        });
      }

      return NextResponse.json({
        success: true,
        data: notification,
        message: "Notification marked as read",
      });
    }
  );

  // Mark all notifications as read
  markAllAsRead = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);

      await this.notificationService.markAllAsRead(user.id);

      // Emit real-time update
      const io = (global as any).io;
      if (io) {
        io.to(`user:${user.id}`).emit("notification:all_read", {
          userId: user.id,
        });
      }

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    }
  );

  // Delete notification
  deleteNotification = asyncHandler(
    async (
      req: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { id } = await params;

      await this.notificationService.deleteNotification(id, user.id);

      // Emit real-time update
      const io = (global as any).io;
      if (io) {
        io.to(`user:${user.id}`).emit("notification:deleted", {
          notificationId: id,
          userId: user.id,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Notification deleted successfully",
      });
    }
  );

  // Get dashboard activities (recent notifications)
  getDashboardActivities = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      const user = await requireAuth(req);
      const { searchParams } = new URL(req.url);

      const limit = parseInt(searchParams.get("limit") || "10");

      const activities = await this.notificationService.getDashboardActivities(
        user.id,
        limit
      );

      return NextResponse.json({
        success: true,
        data: activities,
        message: "Dashboard activities retrieved successfully",
      });
    }
  );

  // Create notification (for testing/admin purposes)
  createNotification = asyncHandler(
    async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
      await requireAuth(req); // Ensure user is authenticated
      const body = await req.json();

      const { userId, type, title, message, relatedTo } = body;

      const notification = await this.notificationService.createNotification(
        userId,
        type,
        title,
        message,
        relatedTo
      );

      // Emit real-time notification
      const io = (global as any).io;
      if (io) {
        io.to(`user:${userId}`).emit("notification:new", notification);
      }

      return NextResponse.json(
        {
          success: true,
          data: notification,
          message: "Notification created successfully",
        },
        { status: 201 }
      );
    }
  );
}
