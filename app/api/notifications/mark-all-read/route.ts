import { NotificationController } from "@/src/controllers/notification.controller";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";

const notificationController = new NotificationController();

export const PUT = asyncHandler(async (req: Request) => {
  await Database.connect();
  return notificationController.markAllAsRead(req as any);
});
