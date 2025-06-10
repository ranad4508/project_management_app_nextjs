import type { NextRequest } from "next/server";
import { ChatController } from "@/src/controllers/chat.controller";
import { asyncHandler } from "@/src/errors/errorHandler";

const chatController = new ChatController();

export const POST = asyncHandler(async (req: NextRequest) => {
  return chatController.initializeUserEncryption(req);
});
