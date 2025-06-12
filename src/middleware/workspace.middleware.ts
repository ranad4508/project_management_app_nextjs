import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/src/services/chat.service";
import { RoomType } from "@/src/types/chat.types";

export async function ensureGeneralRoom(workspaceId: string, userId: string) {
  try {
    const chatService = new ChatService();

    // Check if general room exists
    const rooms = await chatService.getUserRooms(userId, workspaceId);
    const generalRoom = rooms.find((room) => room.type === RoomType.GENERAL);

    if (!generalRoom) {
      // Create general room for workspace
      await chatService.createRoom(userId, {
        name: "General",
        description: "General discussion for all workspace members",
        type: RoomType.GENERAL,
        workspaceId,
        isEncrypted: true, // Enable E2E encryption by default
      });
    }
  } catch (error) {
    console.error("Failed to ensure general room:", error);
  }
}
