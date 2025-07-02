import { NotificationController } from "@/src/controllers/notification.controller";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";

const notificationController = new NotificationController();

export const GET = asyncHandler(async (req: Request) => {
  await Database.connect();
  return notificationController.getUserNotifications(req as any);
});

export const POST = asyncHandler(async (req: Request) => {
  await Database.connect();
  return notificationController.createNotification(req as any);
});
