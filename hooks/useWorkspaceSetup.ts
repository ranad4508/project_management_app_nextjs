"use client";

import { useEffect } from "react";
import { ensureGeneralRoom } from "@/src/middleware/workspace.middleware";

export function useWorkspaceSetup(workspaceId: string, userId: string) {
  useEffect(() => {
    if (workspaceId && userId) {
      ensureGeneralRoom(workspaceId, userId);
    }
  }, [workspaceId, userId]);
}
