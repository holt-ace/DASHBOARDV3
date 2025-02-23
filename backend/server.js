import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

import poRoutes from './po/routes/poRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { connectDB } from './config/database.js';
import poService from './po/services/POService.js';
import logger from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes

// Initialize PO routes
const initializeRoutes = async () => {
  await poService.initialize();
  const poRouter = await poRoutes(poService);
  app.use('/api/po', poRouter);
};

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Create required directories
    await fs.mkdir(join(__dirname, 'temp-uploads'), { recursive: true });

    // Initialize routes
    await initializeRoutes();

    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
