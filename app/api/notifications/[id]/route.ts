import { NotificationController } from "@/src/controllers/notification.controller";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";

const notificationController = new NotificationController();

export const PUT = asyncHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  await Database.connect();
  return notificationController.markAsRead(req as any, { params });
});

export const DELETE = asyncHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  await Database.connect();
  return notificationController.deleteNotification(req as any, { params });
});
