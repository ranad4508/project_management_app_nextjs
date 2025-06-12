"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, File, ImageIcon, FileText } from "lucide-react";
import { formatBytes } from "@/src/utils/format.utils";
import type { MessageAttachment } from "@/src/types/chat.types";

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (mimeType.includes("pdf") || mimeType.includes("document")) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment._id} className="max-w-sm">
          {isImage(attachment.mimeType) ? (
            <div className="relative">
              <img
                src={attachment.url || "/placeholder.svg"}
                alt={attachment.originalName}
                className="rounded-lg max-h-64 object-cover"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                asChild
              >
                <a href={attachment.url} download={attachment.originalName}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-3 rounded-lg border p-3">
              <div className="flex-shrink-0">
                {getFileIcon(attachment.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.originalName}
                </p>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {attachment.mimeType.split("/")[1]?.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(attachment.size)}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                <a href={attachment.url} download={attachment.originalName}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
