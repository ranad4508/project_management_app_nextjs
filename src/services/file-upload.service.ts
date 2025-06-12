import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

export class FileUploadService {
  private uploadDir = process.env.UPLOAD_DIR || "./uploads";

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
    file: File,
    userId: string
  ): Promise<{
    filename: string;
    url: string;
    size: number;
  }> {
    const fileExtension = path.extname(file.name);
    const filename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, filename);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file
    await fs.writeFile(filePath, buffer);

    return {
      filename,
      url: `/uploads/${filename}`,
      size: file.size,
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
