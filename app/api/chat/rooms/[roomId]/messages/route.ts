import { ChatController } from "@/src/controllers/chat.controller";

const chatController = new ChatController();

export const GET = chatController.getRoomMessages;
export const POST = chatController.sendMessage;
export const DELETE = chatController.deleteRoomMessages;
