import { MemberRole } from "@/src/types/chat.types";

const API_BASE = "/api/chat/rooms";

export interface UpdateRoomData {
  name?: string;
  description?: string;
  type?: "public" | "private";
  isEncrypted?: boolean;
}

/**
 * Update room settings
 */
export async function updateRoom(roomId: string, data: UpdateRoomData) {
  const response = await fetch(`${API_BASE}/${roomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update room");
  }

  return response.json();
}

/**
 * Remove member from room
 */
export async function removeMemberFromRoom(roomId: string, memberId: string) {
  const response = await fetch(`${API_BASE}/${roomId}/members/${memberId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to remove member");
  }

  return response.json();
}

/**
 * Update member role in room
 */
export async function updateMemberRole(
  roomId: string,
  memberId: string,
  role: MemberRole
) {
  const response = await fetch(`${API_BASE}/${roomId}/members/${memberId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update member role");
  }

  return response.json();
}

/**
 * Delete room (owner only)
 */
export async function deleteRoom(roomId: string) {
  const response = await fetch(`${API_BASE}/${roomId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete room");
  }

  return response.json();
}

/**
 * Archive room (owner only)
 */
export async function archiveRoom(roomId: string) {
  const response = await fetch(`${API_BASE}/${roomId}/archive`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to archive room");
  }

  return response.json();
}

/**
 * Export room data in Excel format
 */
export async function exportRoomDataExcel(roomId: string) {
  const response = await fetch(`${API_BASE}/${roomId}/export?format=excel`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to export room data");
  }

  // Handle file download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `room-export-${roomId}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return { success: true };
}

/**
 * Export room data in PDF format
 */
export async function exportRoomDataPDF(roomId: string) {
  const response = await fetch(`${API_BASE}/${roomId}/export?format=pdf`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to export room data");
  }

  // Handle file download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `room-export-${roomId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return { success: true };
}

/**
 * Export room data (legacy JSON format)
 */
export async function exportRoomData(roomId: string) {
  return exportRoomDataExcel(roomId); // Default to Excel
}

/**
 * Delete conversation for current user only (members)
 */
export async function deleteConversation(roomId: string) {
  const response = await fetch(`${API_BASE}/${roomId}/conversation`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete conversation");
  }

  return response.json();
}

/**
 * Regenerate encryption keys
 */
export async function regenerateEncryptionKeys(roomId: string) {
  const response = await fetch(`${API_BASE}/${roomId}/encryption/regenerate`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to regenerate encryption keys");
  }

  return response.json();
}
