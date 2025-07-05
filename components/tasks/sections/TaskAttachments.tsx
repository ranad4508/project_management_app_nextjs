"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Paperclip,
  Trash2,
  Download,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
} from "lucide-react";
import {
  useGetTaskAttachmentsQuery,
  useAddTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
} from "@/src/store/api/taskApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskAttachmentsProps {
  taskId: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (mimetype?: string) => {
  if (!mimetype) return File;
  if (mimetype.startsWith("image/")) return Image;
  if (mimetype.startsWith("video/")) return Video;
  if (mimetype.startsWith("audio/")) return Music;
  if (mimetype.includes("pdf") || mimetype.includes("document"))
    return FileText;
  if (mimetype.includes("zip") || mimetype.includes("rar")) return Archive;
  return File;
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
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
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

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: attachmentsResponse,
    isLoading,
    refetch,
  } = useGetTaskAttachmentsQuery(taskId);

  const [addAttachment, { isLoading: isUploading }] =
    useAddTaskAttachmentMutation();

  const [deleteAttachment, { isLoading: isDeleting }] =
    useDeleteTaskAttachmentMutation();

  const attachments = attachmentsResponse?.data || [];

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setShowUploadConfirm(true);
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile) return;

    try {
      await addAttachment({
        taskId,
        file: selectedFile,
      }).unwrap();

      refetch();
      toast.success("File uploaded successfully");
      setShowUploadConfirm(false);
      setSelectedFile(null);
    } catch (error) {
      toast.error("Failed to upload file");
      console.error("Failed to upload file:", error);
    }
  };

  const handleDeleteClick = (attachmentId: string) => {
    setAttachmentToDelete(attachmentId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!attachmentToDelete) return;

    try {
      await deleteAttachment({
        taskId,
        attachmentId: attachmentToDelete,
      }).unwrap();

      refetch();
      toast.success("Attachment deleted successfully");
      setShowDeleteConfirm(false);
      setAttachmentToDelete(null);
    } catch (error) {
      toast.error("Failed to delete attachment");
      console.error("Failed to delete attachment:", error);
    }
  };

  const handleDownload = async (attachment: any) => {
    try {
      console.log("🔍 Download attempt for attachment:", {
        name: attachment.name,
        url: attachment.url,
        filename: attachment.filename,
        originalName: attachment.originalName,
      });

      const urlPath = attachment.url;
      if (!urlPath) {
        console.error("File URL is not available");
        toast.error("File information is not available");
        return;
      }

      // Extract filename from URL (everything after the last slash)
      const actualFilename = urlPath.split("/").pop();
      if (!actualFilename) {
        console.error("Could not extract filename from URL");
        toast.error("Invalid file URL");
        return;
      }

      console.log("🔍 Extracted filename from URL:", actualFilename);

      // Get the original display name (what user sees)
      const displayName =
        attachment.originalName || attachment.name || actualFilename;

      // The URL might be in different formats:
      // New format: /api/uploads/uuid-filename.ext
      // Old format: /uploads/timestamp-filename.ext

      let downloadUrl: string;
      if (urlPath.startsWith("/api/uploads/")) {
        // New format - use the URL directly with download endpoint
        const filename = urlPath.replace("/api/uploads/", "");
        downloadUrl = `/api/uploads/${encodeURIComponent(
          filename
        )}/download?name=${encodeURIComponent(displayName)}`;
      } else if (urlPath.startsWith("/uploads/")) {
        // Old format - convert to new format
        const filename = urlPath.replace("/uploads/", "");
        downloadUrl = `/api/uploads/${encodeURIComponent(
          filename
        )}/download?name=${encodeURIComponent(displayName)}`;
      } else {
        // Fallback - assume it's a filename
        downloadUrl = `/api/uploads/${encodeURIComponent(
          actualFilename
        )}/download?name=${encodeURIComponent(displayName)}`;
      }

      console.log("🔍 Attempting download with URL:", downloadUrl);

      // First, check if the file exists by making a HEAD request to the file endpoint (not download)
      const checkUrl = downloadUrl
        .replace("/download?name=", "?name=")
        .split("?")[0];

      try {
        const headResponse = await fetch(checkUrl, { method: "HEAD" });
        console.log(
          `🔍 File existence check for ${actualFilename}:`,
          headResponse.status
        );

        if (!headResponse.ok) {
          console.error(
            `File not found: ${actualFilename} (status: ${headResponse.status})`
          );
          toast.error(`File not available: ${displayName}`);
          return;
        }
      } catch (headError) {
        console.error("File existence check failed:", headError);
        toast.error("Unable to verify file availability");
        return;
      }

      // Create download link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = displayName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`✅ Downloading file: ${displayName} from ${downloadUrl}`);
      toast.success(`Downloading ${displayName}`);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Upload files</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Choose Files"}
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            multiple={false}
          />
        </CardContent>
      </Card>

      {/* Attachments List */}
      <div className="space-y-4">
        {attachments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Paperclip className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">No attachments</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Upload files to share with your team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          attachments.map((attachment) => (
            <div key={attachment._id} className="group">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {React.createElement(getFileIcon(attachment.mimetype), {
                        className: "w-8 h-8 text-blue-500",
                      })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {attachment.originalName ||
                            attachment.filename ||
                            (attachment as any).name ||
                            "Unknown file"}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(attachment.size || 0)}
                        </span>
                        {attachment.mimetype && (
                          <span className="text-xs text-gray-400">
                            •{" "}
                            {attachment.mimetype.split("/")[1]?.toUpperCase() ||
                              "FILE"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        className="h-8"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(attachment._id)}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity h-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Upload Confirmation Dialog */}
      <AlertDialog open={showUploadConfirm} onOpenChange={setShowUploadConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm File Upload</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to upload "{selectedFile?.name}"?
              <br />
              <span className="text-sm text-gray-500">
                Size: {selectedFile ? formatFileSize(selectedFile.size) : ""}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUploadConfirm(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUploadConfirm}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteConfirm(false);
                setAttachmentToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
