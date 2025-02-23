import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import logger from "../../../utils/logger.js";
import { FileSystemService } from "../../services/FileSystemService.js";

class FileUploadHandler {
  constructor(fileSystemService) {
    if (!fileSystemService) {
      throw new Error("FileSystemService is required");
    }
    this.fileSystemService = fileSystemService;
    this.initialized = false;
    this.initializationPromise = null;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        await this.fileSystemService.initialize();
        this.storage = this.configureStorage();
        this.uploader = this.configureUploader();
        this.initialized = true;
        logger.info("FileUploadHandler initialized successfully");
      } catch (error) {
        logger.error("Error initializing FileUploadHandler:", error);
        this.initialized = false;
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  configureStorage() {
    return multer.memoryStorage();
  }

  async saveUploadedFile(file) {
    try {
      if (!file || !file.buffer) {
        throw new Error("Invalid file: missing buffer");
      }

      const uploadDir = await this.fileSystemService.getUploadDirectory();
      const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
      const ext = path.extname(file.originalname);
      const filename = `file-${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, filename);

      // Create a file object with all required properties
      const fileToSave = {
        ...file,
        path: filePath,
        filename,
        buffer: file.buffer,
        size: file.size || file.buffer.length,
        mimetype: file.mimetype || "application/pdf",
      };

      const savedPath = await this.fileSystemService.saveFile(fileToSave);
      logger.info("File saved successfully:", {
        originalName: file.originalname,
        savedPath,
        size: fileToSave.size,
      });

      return savedPath;
    } catch (error) {
      logger.error("Error saving uploaded file:", error);
      throw error;
    }
  }

  configureUploader() {
    return multer({
      storage: this.storage,
      fileFilter: this.fileFilter.bind(this),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1, // Only allow one file per request
      },
    });
  }

  fileFilter(req, file, cb) {
    try {
      // Check file type
      if (file.mimetype !== "application/pdf") {
        logger.warn("Invalid file type:", { mimetype: file.mimetype });
        return cb(new Error("Only PDF files are allowed"), false);
      }

      // Check file name
      if (!this.isValidFilename(file.originalname)) {
        logger.warn("Invalid filename:", { filename: file.originalname });
        return cb(new Error("Invalid filename"), false);
      }

      // Log accepted file
      logger.info("File upload accepted:", {
        filename: file.originalname,
        mimetype: file.mimetype,
      });

      cb(null, true);
    } catch (error) {
      logger.error("Error in file filter:", error);
      cb(error);
    }
  }

  isValidFilename(filename) {
    // Check if filename has .pdf extension and contains a PO number
    const ext = path.extname(filename);
    if (ext.toLowerCase() !== ".pdf") {
      return false;
    }
    // Extract any sequence of 7-8 digits from filename
    const matches = filename.match(/\d{7,8}/);
    return matches !== null;
  }

  async handleUploadError(err, req, res, next) {
    try {
      // Clean up any uploaded file if it exists
      if (req.file && req.file.path) {
        try {
          await this.fileSystemService.deleteFile(req.file.path);
          logger.info("Cleaned up file after upload error:", {
            path: req.file.path,
          });
        } catch (cleanupError) {
          logger.error("Error cleaning up file:", {
            error: cleanupError.message,
            path: req.file.path,
          });
        }
      }

      // Log detailed error information
      logger.error("File upload error:", {
        error: err.message,
        stack: err.stack,
        code: err.code,
        originalName: req.file?.originalname,
        path: req.file?.path,
      });

      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case "LIMIT_FILE_SIZE":
            return res.status(413).json({
              success: false,
              error: "File too large",
              details: "Maximum file size is 5MB",
              timestamp: new Date().toISOString(),
            });
          case "LIMIT_FILE_COUNT":
            return res.status(400).json({
              success: false,
              error: "Too many files",
              details: "Only one file can be uploaded at a time",
              timestamp: new Date().toISOString(),
            });
          default:
            return res.status(400).json({
              success: false,
              error: "File upload error",
              details: err.message,
              code: err.code,
              timestamp: new Date().toISOString(),
            });
        }
      }

      if (err.message === "Only PDF files are allowed") {
        return res.status(415).json({
          success: false,
          error: "Invalid file type",
          details: "Only PDF files are allowed",
          timestamp: new Date().toISOString(),
        });
      }

      if (err.message === "Invalid filename") {
        return res.status(400).json({
          success: false,
          error: "Invalid filename",
          details: "Filename must be an 8-digit PO number",
          timestamp: new Date().toISOString(),
        });
      }

      if (err.message.includes("PDF")) {
        return res.status(422).json({
          success: false,
          error: "PDF processing error",
          details: err.message,
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(500).json({
        success: false,
        error: "Internal server error",
        details: "An unexpected error occurred during file upload",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error in error handler:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        details: "Error handling system failure",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Method to get the configured uploader middleware
  getMiddleware() {
    return [
      // Initialize and handle file upload
      async (req, res, next) => {
        try {
          await this.ensureInitialized();
          if (!this.uploader) {
            throw new Error("FileUploadHandler not properly initialized");
          }
          const upload = this.uploader.single("file");
          upload(req, res, (err) => {
            if (err) {
              next(err);
              return;
            }
            next();
          });
        } catch (error) {
          next(error);
        }
      },
      // Error handling middleware
      this.getErrorHandler()
    ];
  }

  // Method to get the error handler middleware
  getErrorHandler() {
    return async (err, req, res, next) => {
      try {
        await this.ensureInitialized();
        return this.handleUploadError(err, req, res, next);
      } catch (error) {
        logger.error("Error in upload error handler:", error);
        return res.status(500).json({
          success: false,
          error: "Internal server error",
          details: "File upload service unavailable",
          timestamp: new Date().toISOString(),
        });
      }
    };
  }
}

// Export the class only - singleton will be created with proper dependencies
export { FileUploadHandler };
