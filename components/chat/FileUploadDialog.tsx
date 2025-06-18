"use client";

import React from "react";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  File,
  ImageIcon,
  FileText,
  Video,
  Music,
} from "lucide-react";
import { formatBytes } from "@/src/utils/format.utils";
import { cn } from "@/lib/utils";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelect: (files: File[]) => void;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  multiple?: boolean;
}

interface FileWithPreview extends File {
  preview?: string;
}

export function FileUploadDialog({
  open,
  onOpenChange,
  onFilesSelect,
  maxFileSize = 100 * 1024 * 1024, // 100MB default (like WhatsApp)
  allowedTypes = [], // Accept all file types by default
  multiple = true,
}: FileUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      console.log("📁 Files dropped:", { acceptedFiles, rejectedFiles });

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        console.warn("❌ Some files were rejected:", rejectedFiles);
        rejectedFiles.forEach((rejection: any) => {
          console.warn(
            "❌ Rejected file:",
            rejection.file.name,
            "Errors:",
            rejection.errors
          );
        });
      }

      // Process accepted files
      const filesWithPreview = acceptedFiles.map((file) => {
        console.log("✅ Processing file:", {
          name: file.name,
          type: file.type,
          size: file.size,
        });
        const fileWithPreview = file as FileWithPreview;

        // Create preview for images
        if (file.type.startsWith("image/")) {
          try {
            fileWithPreview.preview = URL.createObjectURL(file);
            console.log("🖼️ Created image preview for:", file.name);
          } catch (error) {
            console.warn("⚠️ Failed to create preview for:", file.name, error);
          }
        }
        return fileWithPreview;
      });

      if (multiple) {
        setSelectedFiles((prev) => [...prev, ...filesWithPreview]);
      } else {
        setSelectedFiles(filesWithPreview.slice(0, 1));
      }

      console.log("📋 Total selected files:", filesWithPreview.length);
    },
    [multiple]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Completely remove accept restrictions to allow ALL file types like WhatsApp
    accept: undefined,
    maxSize: maxFileSize,
    multiple,
    noClick: false,
    noKeyboard: false,
    disabled: false,
    // Remove all file type validation
    validator: undefined,
    // Prevent any default rejections
    preventDropOnDocument: true,
    // Force accept all files
    noDrag: false,
  });

  // Get input props and force accept all files
  const inputProps = getInputProps();
  const modifiedInputProps = {
    ...inputProps,
    accept: "*/*", // Force accept all file types
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles);
      setSelectedFiles([]);
      onOpenChange(false);
    }
  };

  const getFileIcon = (file: File) => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // Images - All formats
    if (
      fileType.startsWith("image/") ||
      fileName.match(
        /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|tif|ico|avif|heic|heif)$/
      )
    ) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }

    // Videos - All formats
    if (
      fileType.startsWith("video/") ||
      fileName.match(/\.(mp4|avi|mov|webm|mkv|flv|wmv|m4v|3gp|ogv)$/)
    ) {
      return <Video className="h-8 w-8 text-purple-500" />;
    }

    // Audio - All formats
    if (
      fileType.startsWith("audio/") ||
      fileName.match(/\.(mp3|wav|aac|ogg|flac|m4a|wma|opus)$/)
    ) {
      return <Music className="h-8 w-8 text-green-500" />;
    }

    // Documents - All formats
    if (
      fileType.includes("pdf") ||
      fileType.includes("document") ||
      fileType.includes("text") ||
      fileType.includes("sheet") ||
      fileType.includes("presentation") ||
      fileName.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|ods|odp)$/)
    ) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }

    // Archives
    if (
      fileName.match(/\.(zip|rar|7z|tar|gz|bz2|xz|cab|iso|dmg)$/i) ||
      fileType.includes("zip") ||
      fileType.includes("compressed") ||
      fileType.includes("archive")
    ) {
      return <File className="h-8 w-8 text-orange-500" />;
    }

    // Executables and Applications
    if (
      fileName.match(/\.(exe|msi|app|deb|rpm|pkg|dmg|apk|ipa)$/i) ||
      fileType.includes("application/x-executable") ||
      fileType.includes("application/x-msdownload")
    ) {
      return <File className="h-8 w-8 text-purple-600" />;
    }

    // Code files
    if (
      fileName.match(
        /\.(js|ts|jsx|tsx|html|css|json|xml|py|java|cpp|c|php|rb|go|rs|swift|kt|dart|scala|sh|bat|ps1)$/i
      ) ||
      fileType.includes("javascript") ||
      fileType.includes("typescript") ||
      fileType.includes("text/x-")
    ) {
      return <File className="h-8 w-8 text-green-600" />;
    }

    // Fonts
    if (
      fileName.match(/\.(ttf|otf|woff|woff2|eot)$/i) ||
      fileType.includes("font")
    ) {
      return <File className="h-8 w-8 text-indigo-500" />;
    }

    // 3D Models and CAD
    if (fileName.match(/\.(obj|fbx|dae|3ds|blend|max|dwg|step|iges)$/i)) {
      return <File className="h-8 w-8 text-cyan-500" />;
    }

    // Default for all other file types
    return <File className="h-8 w-8 text-gray-500" />;
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [selectedFiles]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Upload Files</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Dropzone - Responsive */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 sm:p-6 lg:p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...modifiedInputProps} />
            <Upload className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-muted-foreground mb-2 sm:mb-4" />
            {isDragActive ? (
              <p className="text-primary text-sm sm:text-base">
                Drop the files here...
              </p>
            ) : (
              <div>
                <p className="text-base sm:text-lg font-medium">
                  Drag & drop files here
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  or click to select files
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  All file types supported • Max size:{" "}
                  {formatBytes(maxFileSize)}
                </p>
              </div>
            )}
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">
                Selected Files ({selectedFiles.length})
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    {/* File Preview/Icon */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview || "/placeholder.svg"}
                          alt={file.name}
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        getFileIcon(file)
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>

                      {/* Upload Progress */}
                      {uploadProgress[file.name] !== undefined && (
                        <div className="mt-2">
                          <Progress
                            value={uploadProgress[file.name]}
                            className="h-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {uploadProgress[file.name]}% uploaded
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
            >
              Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
