"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Shield, ShieldCheck, ShieldX } from "lucide-react";
import type { ChatRoom } from "@/src/types/chat.types";

interface EncryptionStatusProps {
  room: ChatRoom;
  isConnected?: boolean;
}

export function EncryptionStatus({
  room,
  isConnected = false,
}: EncryptionStatusProps) {
  const getEncryptionStatus = () => {
    if (!room.isEncrypted) {
      return {
        icon: ShieldX,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        text: "Not Encrypted",
        description: "Messages are not encrypted in this room",
      };
    }

    if (isConnected && room.encryptionKeyId) {
      return {
        icon: ShieldCheck,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        text: "E2E Encrypted",
        description:
          "Messages are end-to-end encrypted with active key exchange",
      };
    }

    return {
      icon: Shield,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      text: "Encrypted",
      description: "Room is encrypted but key exchange may be pending",
    };
  };

  const status = getEncryptionStatus();
  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-xs ${status.color} ${status.bgColor} ${status.borderColor} border`}
          >
            <Icon className="mr-1 h-3 w-3" />
            {status.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">{status.text}</p>
            <p className="text-sm text-muted-foreground">
              {status.description}
            </p>
            {room.encryptionKeyId && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Key: {room.encryptionKeyId.slice(0, 8)}...
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
