import { NotificationController } from "@/src/controllers/notification.controller";
import Database from "@/src/config/database";
import { asyncHandler } from "@/src/errors/errorHandler";

const notificationController = new NotificationController();

export const GET = asyncHandler(async (req: Request) => {
  await Database.connect();
  return notificationController.getDashboardActivities(req as any);
});
