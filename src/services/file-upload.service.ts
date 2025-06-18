import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

export class FileUploadService {
  private uploadDir = process.env.UPLOAD_DIR || "./public/uploads";

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: File | Buffer | any,
    userId: string,
    originalName?: string,
    mimeType?: string
  ): Promise<{
    filename: string;
    url: string;
    size: number;
    originalName: string;
    mimeType: string;
  }> {
    let buffer: Buffer;
    let fileName: string;
    let fileType: string;
    let fileSize: number;

    console.log("🔍 File upload debug:", {
      fileType: typeof file,
      isBuffer: Buffer.isBuffer(file),
      instanceOfBuffer: file instanceof Buffer,
      hasArrayBuffer:
        file &&
        typeof file === "object" &&
        typeof file.arrayBuffer === "function",
      constructor: file?.constructor?.name,
      originalName,
      mimeType,
      fileLength: file?.length,
    });

    // Handle different file input types
    if (Buffer.isBuffer(file) || file instanceof Buffer) {
      // File is already a buffer (from Socket.IO)
      console.log("📦 Processing as Buffer");
      buffer = file;
      fileName = originalName || `file_${Date.now()}`;
      fileType = mimeType || "application/octet-stream";
      fileSize = buffer.length;
    } else if (
      file &&
      typeof file === "object" &&
      typeof file.arrayBuffer === "function"
    ) {
      // File is a File object (from form upload)
      console.log("📁 Processing as File object");
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name || `file_${Date.now()}`;
      fileType = file.type || "application/octet-stream";
      fileSize = file.size || buffer.length;
    } else if (file && typeof file === "object" && (file as any).data) {
      // Handle case where file might be wrapped in an object with data property (NEW FORMAT)
      console.log("📋 Processing as wrapped Buffer with metadata");
      const fileWithMeta = file as any;

      // Handle both Buffer and Array formats
      if (Buffer.isBuffer(fileWithMeta.data)) {
        buffer = fileWithMeta.data;
      } else if (Array.isArray(fileWithMeta.data)) {
        // Convert array back to Buffer
        buffer = Buffer.from(fileWithMeta.data);
        console.log("🔄 Converted array to Buffer:", buffer.length, "bytes");
      } else {
        buffer = Buffer.from(fileWithMeta.data);
      }

      fileName = originalName || fileWithMeta.name || `file_${Date.now()}`;
      fileType = mimeType || fileWithMeta.type || "application/octet-stream";
      fileSize = fileWithMeta.size || buffer.length;
      console.log("📋 File metadata:", { fileName, fileType, fileSize });
    } else if (file && (file.length !== undefined || Array.isArray(file))) {
      // Handle case where file might be an array-like object or Uint8Array
      console.log("🔢 Processing as array-like object");
      buffer = Buffer.from(file);
      fileName = originalName || `file_${Date.now()}`;
      fileType = mimeType || "application/octet-stream";
      fileSize = buffer.length;
    } else {
      console.error("❌ Invalid file format:", {
        file: typeof file === "object" ? Object.keys(file || {}) : file,
        type: typeof file,
        constructor: file?.constructor?.name,
        isArray: Array.isArray(file),
        hasLength: file?.length !== undefined,
      });
      throw new Error("Invalid file format");
    }

    // Generate proper file extension based on MIME type
    const getExtensionFromMimeType = (mimeType: string): string => {
      const mimeToExt: Record<string, string> = {
        // Images - All common formats
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "image/svg+xml": ".svg",
        "image/bmp": ".bmp",
        "image/tiff": ".tiff",
        "image/tif": ".tif",
        "image/x-icon": ".ico",
        "image/vnd.microsoft.icon": ".ico",
        "image/avif": ".avif",
        "image/heic": ".heic",
        "image/heif": ".heif",

        // Documents
        "application/pdf": ".pdf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          ".xlsx",
        "application/vnd.ms-powerpoint": ".ppt",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation":
          ".pptx",
        "text/plain": ".txt",
        "text/html": ".html",
        "text/css": ".css",
        "application/json": ".json",
        "application/xml": ".xml",
        "text/xml": ".xml",

        // Videos
        "video/mp4": ".mp4",
        "video/avi": ".avi",
        "video/quicktime": ".mov",
        "video/x-msvideo": ".avi",
        "video/webm": ".webm",
        "video/ogg": ".ogv",

        // Audio
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/ogg": ".ogg",
        "audio/aac": ".aac",
        "audio/flac": ".flac",

        // Archives
        "application/zip": ".zip",
        "application/x-rar-compressed": ".rar",
        "application/x-7z-compressed": ".7z",
        "application/gzip": ".gz",
        "application/x-tar": ".tar",
        "application/x-bzip2": ".bz2",
        "application/x-xz": ".xz",
        "application/vnd.ms-cab-compressed": ".cab",
        "application/x-iso9660-image": ".iso",

        // Executables
        "application/x-msdownload": ".exe",
        "application/x-msi": ".msi",
        "application/x-executable": ".exe",
        "application/vnd.debian.binary-package": ".deb",
        "application/x-rpm": ".rpm",
        "application/x-apple-diskimage": ".dmg",
        "application/vnd.android.package-archive": ".apk",

        // Fonts
        "font/ttf": ".ttf",
        "font/otf": ".otf",
        "font/woff": ".woff",
        "font/woff2": ".woff2",
        "application/vnd.ms-fontobject": ".eot",

        // 3D and CAD
        "model/obj": ".obj",
        "application/x-blender": ".blend",
        "application/x-autocad": ".dwg",
        "application/step": ".step",

        // Other
        "application/javascript": ".js",
        "application/typescript": ".ts",
        "text/x-shellscript": ".sh",
        "application/x-bat": ".bat",
        "application/x-powershell": ".ps1",
      };

      return mimeToExt[mimeType] || ".bin";
    };

    // Get file extension from original filename or MIME type
    let fileExtension = path.extname(fileName);
    if (!fileExtension) {
      fileExtension = getExtensionFromMimeType(fileType);
      console.log(
        `📎 Generated extension from MIME type ${fileType}: ${fileExtension}`
      );
    }

    const filename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, filename);

    // Save file
    await fs.writeFile(filePath, buffer);

    return {
      filename,
      url: `/api/uploads/${filename}`,
      size: fileSize,
      originalName: fileName,
      mimeType: fileType,
    };
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  }
}
