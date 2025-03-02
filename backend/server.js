import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

import poRoutes from './po/routes/poRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { connectDB, disconnectDB } from './config/database.js';
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
  let server;
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Create required directories
    await fs.mkdir(join(__dirname, 'temp-uploads'), { recursive: true });

    // Initialize routes
    await initializeRoutes();

    // Start the server
    server = app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
    
    // Handle server shutdown
    setupGracefulShutdown(server);
    
  } catch (error) {
    logger.error('Failed to start server:', {
      message: error.message,
      stack: error.stack
    });
    
    // Attempt to disconnect from DB if connection was established
    try {
      await disconnectDB();
    } catch (dbError) {
      logger.error('Error disconnecting from database during startup failure:', dbError);
    }
    
    process.exit(1);
  }
  
  return server;
};

// Set up graceful shutdown for the HTTP server
const setupGracefulShutdown = (server) => {
  // Handle process termination
  const shutdownGracefully = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    
    // Close the HTTP server first
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed');
      });
    }
    
    // Database disconnection is handled by the event handlers in database.js
    
    // Allow some time for cleanup before forcing exit
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000); // 10 seconds timeout
  };
  
  // Register shutdown handlers
  process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
  process.on('SIGINT', () => shutdownGracefully('SIGINT'));
};

// Start the server
startServer();
