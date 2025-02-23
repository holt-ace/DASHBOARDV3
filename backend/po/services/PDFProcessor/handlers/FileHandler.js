import fs from "fs/promises";
import path from "path";
import logger from "../../../../utils/logger.js";

export class FileHandler {
  constructor(tempDir) {
    this.tempDir = tempDir;
  }

  async saveFile(file) {
    try {
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join(this.tempDir, fileName);
      await fs.writeFile(filePath, file.buffer);
      logger.info("File saved successfully:", {
        path: filePath
      });
      return filePath;
    } catch (error) {
      logger.error("Error saving file:", error);
      throw error;
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info("File deleted successfully:", {
        path: filePath
      });
    } catch (error) {
      logger.error("Error deleting file:", error);
      throw error;
    }
  }

  async readFile(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      logger.info("File read successfully:", {
        path: filePath
      });
      return buffer;
    } catch (error) {
      logger.error("Error reading file:", error);
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

  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile()
      };
    } catch (error) {
      logger.error("Error getting file stats:", error);
      throw error;
    }
  }

  async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      const deletePromises = files.map(file => this.deleteFile(path.join(this.tempDir, file)));
      await Promise.all(deletePromises);
      logger.info("Temporary files cleaned up");
    } catch (error) {
      logger.error("Error cleaning up temp files:", error);
      throw error;
    }
  }
}