import fs from "fs/promises";
import path from "path";
import logger from "../../utils/logger.js";
import { FileHandler } from "./PDFProcessor/handlers/FileHandler.js";

export class FileSystemService {
  constructor() {
    this.tempUploadsDir = path.join(process.cwd(), "temp-uploads");
    this.fileHandler = new FileHandler(this.tempUploadsDir);
  }

  async initialize() {
    try {
      // Ensure temp-uploads directory exists
      await this.ensureDirectory(this.tempUploadsDir);
      logger.info("FileSystemService initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize FileSystemService:", error);
      throw error;
    }
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    }
  }

  async saveTemporaryFile(fileBuffer, filename) {
    try {
      const filePath = path.join(this.tempUploadsDir, filename);
      await fs.writeFile(filePath, fileBuffer);
      logger.info(`File saved successfully: ${filename}`);
      return filePath;
    } catch (error) {
      logger.error("Failed to save temporary file:", error);
      throw error;
    }
  }

  async deleteTemporaryFile(filename) {
    try {
      const filePath = path.join(this.tempUploadsDir, filename);
      await fs.unlink(filePath);
      logger.info(`File deleted successfully: ${filename}`);
    } catch (error) {
      logger.error("Failed to delete temporary file:", error);
      throw error;
    }
  }

  async cleanupTemporaryFiles(maxAge = 24 * 60 * 60 * 1000) {
    // Default 24 hours
    try {
      const files = await fs.readdir(this.tempUploadsDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempUploadsDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          await this.deleteTemporaryFile(file);
          logger.info(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      logger.error("Failed to cleanup temporary files:", error);
      throw error;
    }
  }

  async getFileStats(filename) {
    try {
      const filePath = path.join(this.tempUploadsDir, filename);
      const stats = await fs.stat(filePath);
      return stats;
    } catch (error) {
      logger.error("Failed to get file stats:", error);
      throw error;
    }
  }

  async listTemporaryFiles() {
    try {
      const files = await fs.readdir(this.tempUploadsDir);
      return files;
    } catch (error) {
      logger.error("Failed to list temporary files:", error);
      throw error;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getFilePath(filename) {
    return path.join(this.tempUploadsDir, filename);
  }
}
