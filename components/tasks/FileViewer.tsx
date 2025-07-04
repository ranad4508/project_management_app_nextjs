"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  Archive,
  File,
  FileSpreadsheet,
} from "lucide-react";

interface FileViewerProps {
  file: {
    _id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
  };
}

export function FileViewer({ file }: FileViewerProps) {
  // Safety check - if file is null or undefined, return null
  if (!file) {
    console.error("FileViewer: file prop is null or undefined");
    return null;
  }

  // Safely handle mimetype - fallback to empty string if undefined
  const mimetype = file.mimetype || "";

  const isImage = mimetype.startsWith("image/");
  const isVideo = mimetype.startsWith("video/");
  const isAudio = mimetype.startsWith("audio/");
  const isPDF = mimetype === "application/pdf";
  const isArchive = [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-zip-compressed",
  ].includes(mimetype);

  const isDocument = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ].includes(mimetype);

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="w-4 h-4" />;
    if (isVideo) return <FileVideo className="w-4 h-4" />;
    if (isAudio) return <FileAudio className="w-4 h-4" />;
    if (isPDF) return <FileText className="w-4 h-4" />;
    if (isArchive) return <Archive className="w-4 h-4" />;
    if (isDocument) return <FileSpreadsheet className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileClick = () => {
    handleDownload();
  };

  const handleDownload = async () => {
    if (!file.url) {
      console.error("File URL is not available");
      return;
    }

    try {
      // Get the original filename with proper extension
      let filename = file.originalName || file.filename || "download";

      // Ensure the filename has the correct extension based on MIME type
      if (!filename.includes(".")) {
        const extension = getFileExtension(mimetype);
        if (extension) {
          filename += `.${extension}`;
        }
      }

      // Fetch the file as blob with proper headers to ensure correct content type
      const response = await fetch(file.url, {
        headers: {
          Accept: mimetype || "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the blob with the correct MIME type
      const blob = await response.blob();

      // Create a new blob with the correct MIME type if it's different
      const correctBlob = new Blob([blob], {
        type: mimetype || blob.type || "application/octet-stream",
      });

      const url = window.URL.createObjectURL(correctBlob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: try direct download with proper headers
      try {
        const filename = file.originalName || file.filename || "download";
        const link = document.createElement("a");
        link.href = `${file.url}?download=true&name=${encodeURIComponent(
          filename
        )}`;
        link.download = filename;
        link.target = "_blank";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.error("Fallback download also failed:", fallbackError);
        window.open(file.url, "_blank");
      }
    }
  };

  const getFileExtension = (mimeType: string): string | null => {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "application/pdf": "pdf",
      "text/plain": "txt",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "pptx",
      "application/zip": "zip",
      "application/x-rar-compressed": "rar",
      "application/x-7z-compressed": "7z",
      "video/mp4": "mp4",
      "video/avi": "avi",
      "video/mov": "mov",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
    };

    return mimeToExt[mimeType] || null;
  };

  return (
    <>
      <div className="group flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
        {isImage ? (
          <div
            className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer border"
            onClick={handleFileClick}
          >
            <img
              src={file.url || ""}
              alt={file.originalName || file.filename || "File preview"}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
            {getFileIcon()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-medium text-gray-900 truncate ${
                isImage ? "cursor-pointer hover:text-blue-600" : ""
              }`}
              onClick={isImage ? handleFileClick : undefined}
            >
              {file.originalName || file.filename || "Unknown file"}
            </p>
            <Badge variant="outline" className="text-xs">
              {mimetype
                ? mimetype.split("/")[1]?.toUpperCase() || "FILE"
                : "FILE"}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
      </div>
    </>
  );
}
