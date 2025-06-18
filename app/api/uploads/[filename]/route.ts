import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await params;

    // Validate filename to prevent directory traversal
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Construct file path
    const uploadDir = process.env.UPLOAD_DIR || "./public/uploads";
    const filePath = join(process.cwd(), uploadDir, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Get original filename from query params if provided
    const url = new URL(request.url);
    const originalName = url.searchParams.get("name") || filename;
    const download = url.searchParams.get("download") === "true";

    // Determine content type based on file extension
    const getContentType = (filename: string): string => {
      const ext = filename.toLowerCase().split(".").pop();
      switch (ext) {
        case "pdf":
          return "application/pdf";
        case "jpg":
        case "jpeg":
          return "image/jpeg";
        case "png":
          return "image/png";
        case "gif":
          return "image/gif";
        case "webp":
          return "image/webp";
        case "svg":
          return "image/svg+xml";
        case "mp4":
          return "video/mp4";
        case "webm":
          return "video/webm";
        case "mp3":
          return "audio/mpeg";
        case "wav":
          return "audio/wav";
        case "ogg":
          return "audio/ogg";
        case "txt":
          return "text/plain";
        case "html":
          return "text/html";
        case "css":
          return "text/css";
        case "js":
          return "application/javascript";
        case "json":
          return "application/json";
        case "xml":
          return "application/xml";
        case "zip":
          return "application/zip";
        case "rar":
          return "application/x-rar-compressed";
        case "7z":
          return "application/x-7z-compressed";
        case "doc":
          return "application/msword";
        case "docx":
          return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case "xls":
          return "application/vnd.ms-excel";
        case "xlsx":
          return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        case "ppt":
          return "application/vnd.ms-powerpoint";
        case "pptx":
          return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        default:
          return "application/octet-stream";
      }
    };

    const contentType = getContentType(filename);

    // Create response with appropriate headers
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": download
          ? `attachment; filename="${originalName}"`
          : `inline; filename="${originalName}"`,
        "Cache-Control": download
          ? "private, no-cache"
          : "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });

    return response;
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
