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
      console.log("📁 Processing as File object");
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name || `file_${Date.now()}`;
      fileType = file.type || "application/octet-stream";
      fileSize = file.size || buffer.length;
    } else if (file && typeof file === "object" && (file as any).data) {
      console.log("📋 Processing as wrapped Buffer with metadata");
      const fileWithMeta = file as any;

      if (Buffer.isBuffer(fileWithMeta.data)) {
        buffer = fileWithMeta.data;
      } else if (Array.isArray(fileWithMeta.data)) {
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

    // Comprehensive file extension mapping for ALL file types
    const getExtensionFromMimeType = (mimeType: string): string => {
      const mimeToExt: Record<string, string> = {
        // Images - All formats including modern ones
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
        "image/jxl": ".jxl",
        "image/x-portable-pixmap": ".ppm",
        "image/x-portable-graymap": ".pgm",
        "image/x-portable-bitmap": ".pbm",
        "image/x-targa": ".tga",
        "image/x-pcx": ".pcx",

        // Videos - All common formats
        "video/mp4": ".mp4",
        "video/avi": ".avi",
        "video/quicktime": ".mov",
        "video/x-msvideo": ".avi",
        "video/webm": ".webm",
        "video/ogg": ".ogv",
        "video/x-matroska": ".mkv",
        "video/x-flv": ".flv",
        "video/x-ms-wmv": ".wmv",
        "video/3gpp": ".3gp",
        "video/3gpp2": ".3g2",
        "video/x-m4v": ".m4v",
        "video/mp2t": ".ts",
        "video/x-ms-asf": ".asf",

        // Audio - All common formats
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/ogg": ".ogg",
        "audio/aac": ".aac",
        "audio/flac": ".flac",
        "audio/x-m4a": ".m4a",
        "audio/x-ms-wma": ".wma",
        "audio/opus": ".opus",
        "audio/webm": ".weba",
        "audio/midi": ".mid",
        "audio/x-midi": ".midi",
        "audio/amr": ".amr",
        "audio/3gpp": ".3ga",

        // Documents - All office formats
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
        "application/vnd.oasis.opendocument.text": ".odt",
        "application/vnd.oasis.opendocument.spreadsheet": ".ods",
        "application/vnd.oasis.opendocument.presentation": ".odp",
        "application/rtf": ".rtf",
        "text/plain": ".txt",
        "text/html": ".html",
        "text/css": ".css",
        "application/json": ".json",
        "application/xml": ".xml",
        "text/xml": ".xml",
        "text/csv": ".csv",
        "text/markdown": ".md",
        "text/x-markdown": ".md",

        // Archives - All compression formats
        "application/zip": ".zip",
        "application/x-rar-compressed": ".rar",
        "application/x-7z-compressed": ".7z",
        "application/gzip": ".gz",
        "application/x-tar": ".tar",
        "application/x-bzip2": ".bz2",
        "application/x-xz": ".xz",
        "application/vnd.ms-cab-compressed": ".cab",
        "application/x-iso9660-image": ".iso",
        "application/x-compress": ".Z",
        "application/x-lzh-compressed": ".lzh",
        "application/x-ace-compressed": ".ace",

        // Executables and Applications
        "application/x-msdownload": ".exe",
        "application/x-msi": ".msi",
        "application/x-executable": ".exe",
        "application/vnd.debian.binary-package": ".deb",
        "application/x-rpm": ".rpm",
        "application/x-apple-diskimage": ".dmg",
        "application/vnd.android.package-archive": ".apk",
        "application/x-ios-app": ".ipa",
        "application/x-shockwave-flash": ".swf",
        "application/java-archive": ".jar",

        // Programming and Code
        "application/javascript": ".js",
        "application/typescript": ".ts",
        "text/javascript": ".js",
        "text/x-python": ".py",
        "text/x-java-source": ".java",
        "text/x-c": ".c",
        "text/x-c++src": ".cpp",
        "text/x-csharp": ".cs",
        "text/x-php": ".php",
        "text/x-ruby": ".rb",
        "text/x-go": ".go",
        "text/x-rust": ".rs",
        "text/x-swift": ".swift",
        "text/x-kotlin": ".kt",
        "text/x-dart": ".dart",
        "text/x-scala": ".scala",
        "text/x-shellscript": ".sh",
        "application/x-bat": ".bat",
        "application/x-powershell": ".ps1",
        "text/x-sql": ".sql",

        // Fonts - All font formats
        "font/ttf": ".ttf",
        "font/otf": ".otf",
        "font/woff": ".woff",
        "font/woff2": ".woff2",
        "application/vnd.ms-fontobject": ".eot",
        "application/font-sfnt": ".ttf",
        "application/x-font-ttf": ".ttf",
        "application/x-font-otf": ".otf",

        // 3D Models and CAD
        "model/obj": ".obj",
        "model/gltf+json": ".gltf",
        "model/gltf-binary": ".glb",
        "application/x-blender": ".blend",
        "application/x-autocad": ".dwg",
        "application/step": ".step",
        "application/x-3ds": ".3ds",
        "model/x3d+xml": ".x3d",
        "model/collada+xml": ".dae",

        // eBooks
        "application/epub+zip": ".epub",
        "application/x-mobipocket-ebook": ".mobi",
        "application/vnd.amazon.ebook": ".azw",
        "application/x-fictionbook+xml": ".fb2",

        // CAD and Engineering
        "application/acad": ".dwg",
        "application/x-dwg": ".dwg",
        "image/vnd.dwg": ".dwg",
        "application/x-step": ".step",
        "application/iges": ".iges",

        // Specialized formats
        "application/vnd.google-earth.kml+xml": ".kml",
        "application/vnd.google-earth.kmz": ".kmz",
        "application/x-sqlite3": ".sqlite",
        "application/x-database": ".db",
        "application/x-dbf": ".dbf",

        // Backup and disk images
        "application/x-gtar": ".gtar",
        "application/x-cpio": ".cpio",
        "application/x-shar": ".shar",
        "application/x-cd-image": ".iso",
        "application/x-raw-disk-image": ".img",

        // Cryptocurrency and blockchain
        "application/x-bitcoin-wallet": ".wallet",
        "application/x-ethereum-wallet": ".json",

        // Scientific data
        "application/x-hdf": ".hdf",
        "application/x-netcdf": ".nc",
        "application/fits": ".fits",

        // Game files
        "application/x-nintendo-rom": ".rom",
        "application/x-genesis-rom": ".bin",
        "application/x-gameboy-rom": ".gb",
        "application/x-n64-rom": ".n64",

        // Virtual machine
        "application/x-virtualbox-vdi": ".vdi",
        "application/x-vmware-vmdk": ".vmdk",
        "application/x-qemu-disk": ".qcow2",

        // Configuration files
        "application/x-yaml": ".yml",
        "text/yaml": ".yaml",
        "application/toml": ".toml",
        "text/x-ini": ".ini",
        "application/x-plist": ".plist",

        // Log files
        "text/x-log": ".log",
        "application/x-log": ".log",
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

    console.log(`✅ File uploaded successfully:`, {
      filename,
      originalName: fileName,
      mimeType: fileType,
      size: fileSize,
      extension: fileExtension,
    });

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
      console.log(`🗑️ File deleted: ${filename}`);
    } catch (error) {
      console.error("❌ Error deleting file:", error);
    }
  }
}
