"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  ImageIcon,
  Video,
  Music,
  File,
  Play,
  Pause,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBytes } from "@/src/utils/format.utils";
import type { MessageAttachment } from "@/src/types/chat.types";

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

const isImage = (mimeType: string, fileName?: string) => {
  const imageTypes = mimeType.startsWith("image/");
  const imageExtensions = fileName?.match(
    /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif|ico|avif|heic|heif|svg|jfif|pjpeg|pjp|apng|cur|dds|exr|hdr|iff|j2k|jp2|jxr|ktx|pbm|pgm|ppm|psd|rgbe|tga|wbmp|xbm|xpm)$/i
  );
  return imageTypes || !!imageExtensions;
};

const isVideo = (mimeType: string, fileName?: string) => {
  const videoTypes = mimeType.startsWith("video/");
  const videoExtensions = fileName?.match(
    /\.(mp4|avi|mov|webm|mkv|flv|wmv|m4v|3gp|ogv|mpg|mpeg|m2v|m4p|m4b|divx|xvid|asf|rm|rmvb|vob|ts|mts|m2ts|f4v|f4p|f4a|f4b)$/i
  );
  return videoTypes || !!videoExtensions;
};

const isAudio = (mimeType: string, fileName?: string) => {
  const audioTypes = mimeType.startsWith("audio/");
  const audioExtensions = fileName?.match(
    /\.(mp3|wav|aac|ogg|flac|m4a|wma|opus|aiff|au|ra|amr|awb|dss|dvf|m4p|mmf|mpc|msv|nmf|oga|raw|rf64|sln|tta|voc|vox|wv|webm|8svx|cda)$/i
  );
  return audioTypes || !!audioExtensions;
};

const isPDF = (mimeType: string, fileName?: string) => {
  const pdfType = mimeType === "application/pdf";
  const pdfExtension = fileName?.endsWith(".pdf");
  return pdfType || !!pdfExtension;
};

const isDocument = (mimeType: string, fileName?: string) => {
  const docTypes =
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    mimeType.includes("sheet") ||
    mimeType.includes("presentation");
  const docExtensions = fileName?.match(
    /\.(doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|ods|odp)$/i
  );
  return docTypes || !!docExtensions;
};

const isArchive = (mimeType: string, fileName?: string) => {
  const archiveTypes =
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    mimeType.includes("archive") ||
    mimeType === "application/x-rar-compressed" ||
    mimeType === "application/x-7z-compressed" ||
    mimeType === "application/gzip" ||
    mimeType === "application/x-tar";
  const archiveExtensions = fileName?.match(
    /\.(zip|rar|7z|tar|gz|bz2|xz|cab|iso|dmg|pkg|deb|rpm|msi|apk|jar|war|ear)$/i
  );
  return archiveTypes || !!archiveExtensions;
};

const isCode = (mimeType: string, fileName?: string) => {
  const codeTypes =
    mimeType.includes("javascript") || mimeType.includes("typescript");
  const codeExtensions = fileName?.match(
    /\.(js|ts|jsx|tsx|html|css|json|xml|py|java|cpp|c|php|rb|go|rs)$/i
  );
  return codeTypes || !!codeExtensions;
};

const getFileIcon = (mimeType: string, fileName?: string) => {
  if (isImage(mimeType, fileName))
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (isVideo(mimeType, fileName))
    return <Video className="h-5 w-5 text-purple-500" />;
  if (isAudio(mimeType, fileName))
    return <Music className="h-5 w-5 text-green-500" />;
  if (isPDF(mimeType, fileName))
    return <FileText className="h-5 w-5 text-red-500" />;
  if (isDocument(mimeType, fileName))
    return <FileText className="h-5 w-5 text-blue-600" />;
  if (isArchive(mimeType, fileName))
    return <File className="h-5 w-5 text-orange-500" />;
  if (isCode(mimeType, fileName))
    return <File className="h-5 w-5 text-green-600" />;
  if (isExecutable(mimeType, fileName))
    return <File className="h-5 w-5 text-purple-600" />;
  if (isFont(mimeType, fileName))
    return <File className="h-5 w-5 text-indigo-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
};

const isExecutable = (mimeType: string, fileName?: string) => {
  const executableTypes =
    mimeType.includes("executable") ||
    mimeType.includes("msdownload") ||
    mimeType === "application/x-msdownload" ||
    mimeType === "application/x-msdos-program" ||
    mimeType === "application/x-executable" ||
    mimeType === "application/x-sharedlib" ||
    mimeType === "application/octet-stream";
  const executableExtensions = fileName?.match(
    /\.(exe|msi|app|deb|rpm|pkg|dmg|apk|ipa|bin|run|com|bat|cmd|scr|pif|gadget|msp|msu|appx|msix|snap|flatpak|appimage)$/i
  );
  return executableTypes || !!executableExtensions;
};

const isFont = (mimeType: string, fileName?: string) => {
  const fontTypes = mimeType.includes("font");
  const fontExtensions = fileName?.match(/\.(ttf|otf|woff|woff2|eot)$/i);
  return fontTypes || !!fontExtensions;
};

const getFileTypeLabel = (mimeType: string, fileName?: string): string => {
  if (isImage(mimeType, fileName)) return "Image";
  if (isVideo(mimeType, fileName)) return "Video";
  if (isAudio(mimeType, fileName)) return "Audio";
  if (isPDF(mimeType, fileName)) return "PDF";
  if (isDocument(mimeType, fileName)) return "Document";
  if (isArchive(mimeType, fileName)) return "Archive";
  if (isCode(mimeType, fileName)) return "Code";
  if (isExecutable(mimeType, fileName)) return "Executable";
  if (isFont(mimeType, fileName)) return "Font";
  return "File";
};

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [previewFile, setPreviewFile] = useState<MessageAttachment | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});

  const handlePreview = (attachment: MessageAttachment) => {
    if (
      isImage(attachment.mimeType, attachment.originalName) ||
      isPDF(attachment.mimeType, attachment.originalName)
    ) {
      setPreviewFile(attachment);
    }
  };

  const toggleAudio = (attachmentId: string) => {
    setIsPlaying((prev) => ({
      ...prev,
      [attachmentId]: !prev[attachmentId],
    }));
  };

  return (
    <>
      <div className="mt-3 space-y-2">
        {attachments.map((attachment) => (
          <div key={attachment._id} className="max-w-sm">
            {isImage(attachment.mimeType, attachment.originalName) ? (
              // WhatsApp-style image preview
              <div className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={attachment.url || "/placeholder.svg"}
                  alt={attachment.originalName}
                  className="w-full max-h-64 object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => handlePreview(attachment)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(attachment);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                      asChild
                    >
                      <a
                        href={`${
                          attachment.url
                        }/download?name=${encodeURIComponent(
                          attachment.originalName
                        )}`}
                        download={attachment.originalName}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-black/50 text-white border-0"
                  >
                    {formatBytes(attachment.size)}
                  </Badge>
                </div>
              </div>
            ) : isVideo(attachment.mimeType, attachment.originalName) ? (
              // Enhanced video player with better controls
              <div className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <video
                  src={attachment.url}
                  className="w-full max-h-64 object-cover"
                  controls
                  preload="metadata"
                  controlsList="nodownload"
                  style={{ maxWidth: "100%" }}
                  onError={(e) => {
                    console.error("Video playback error:", e);
                    // Fallback to download link if video can't play
                  }}
                >
                  <source src={attachment.url} type={attachment.mimeType} />
                  Your browser does not support the video tag.
                  <a href={attachment.url} download={attachment.originalName}>
                    Download {attachment.originalName}
                  </a>
                </video>
                <div className="absolute bottom-2 left-2">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-black/50 text-white border-0"
                  >
                    <Video className="h-3 w-3 mr-1" />
                    {formatBytes(attachment.size)}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                      onClick={() => {
                        const video = document.querySelector(
                          `video[src="${attachment.url}"]`
                        ) as HTMLVideoElement;
                        if (video) {
                          if (video.requestFullscreen) {
                            video.requestFullscreen();
                          }
                        }
                      }}
                      title="Fullscreen"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                      asChild
                    >
                      <a
                        href={`${
                          attachment.url
                        }/download?name=${encodeURIComponent(
                          attachment.originalName
                        )}`}
                        download={attachment.originalName}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : isAudio(attachment.mimeType, attachment.originalName) ? (
              // Enhanced audio player with actual playback
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 p-3 max-w-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-full bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => {
                      const audioElement = document.getElementById(
                        `audio-${attachment._id}`
                      ) as HTMLAudioElement;
                      if (audioElement) {
                        if (isPlaying[attachment._id]) {
                          audioElement.pause();
                        } else {
                          audioElement.play();
                        }
                        toggleAudio(attachment._id);
                      }
                    }}
                  >
                    {isPlaying[attachment._id] ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Music className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium truncate">
                        {attachment.originalName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(attachment.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <a
                      href={`${
                        attachment.url
                      }/download?name=${encodeURIComponent(
                        attachment.originalName
                      )}`}
                      download={attachment.originalName}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <audio
                  id={`audio-${attachment._id}`}
                  src={attachment.url}
                  className="w-full"
                  controls
                  preload="metadata"
                  onPlay={() =>
                    setIsPlaying((prev) => ({
                      ...prev,
                      [attachment._id]: true,
                    }))
                  }
                  onPause={() =>
                    setIsPlaying((prev) => ({
                      ...prev,
                      [attachment._id]: false,
                    }))
                  }
                  onEnded={() =>
                    setIsPlaying((prev) => ({
                      ...prev,
                      [attachment._id]: false,
                    }))
                  }
                  style={{ height: "32px" }}
                >
                  <source src={attachment.url} type={attachment.mimeType} />
                  Your browser does not support the audio element.
                  <a href={attachment.url} download={attachment.originalName}>
                    Download {attachment.originalName}
                  </a>
                </audio>
              </div>
            ) : (
              // WhatsApp-style document/file preview
              <div className="flex items-center space-x-3 rounded-lg border bg-gray-50 dark:bg-gray-800 p-3 max-w-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-gray-700">
                  {getFileIcon(attachment.mimeType, attachment.originalName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {attachment.originalName}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {getFileTypeLabel(
                        attachment.mimeType,
                        attachment.originalName
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(attachment.size)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {isPDF(attachment.mimeType, attachment.originalName) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                      onClick={() => handlePreview(attachment)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                    asChild
                  >
                    <a
                      href={`${
                        attachment.url
                      }/download?name=${encodeURIComponent(
                        attachment.originalName
                      )}`}
                      download={attachment.originalName}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2 pr-12">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold truncate pr-4">
                {previewFile?.originalName}
              </DialogTitle>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Badge variant="outline">
                  {previewFile && formatBytes(previewFile.size)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  asChild
                >
                  <a
                    href={`${
                      previewFile?.url
                    }/download?name=${encodeURIComponent(
                      previewFile?.originalName || ""
                    )}`}
                    download={previewFile?.originalName}
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 pt-0">
            {previewFile &&
              isImage(previewFile.mimeType, previewFile.originalName) && (
                <img
                  src={previewFile.url}
                  alt={previewFile.originalName}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              )}
            {previewFile &&
              isPDF(previewFile.mimeType, previewFile.originalName) && (
                <div className="w-full h-[70vh] rounded-lg border overflow-hidden">
                  <iframe
                    src={`${previewFile.url}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
                    className="w-full h-full"
                    title={previewFile.originalName}
                    onError={(e) => {
                      console.error("PDF preview error:", e);
                      // Fallback to direct link
                      const iframe = e.target as HTMLIFrameElement;
                      iframe.style.display = "none";
                      const fallback = document.createElement("div");
                      fallback.className =
                        "flex flex-col items-center justify-center h-full space-y-4";
                      fallback.innerHTML = `
                        <div class="text-center">
                          <p class="text-lg font-medium">PDF Preview Not Available</p>
                          <p class="text-sm text-muted-foreground">Click the download button to view this PDF</p>
                        </div>
                        <a href="${previewFile.url}" target="_blank" rel="noopener noreferrer"
                           class="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                          Open PDF in New Tab
                        </a>
                      `;
                      iframe.parentNode?.appendChild(fallback);
                    }}
                    style={{ border: "none" }}
                  />
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
