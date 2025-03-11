import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

import poRouter from './po/controllers/poController.js';
import errorHandler from './middleware/errorHandler.js';
import { connectDB, disconnectDB } from './config/database.js';
import poService from './po/services/POService.js';
import logger from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  // Configure CORS to allow the React frontend specifically
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
// Comment out or remove the static file serving to disable the old frontend
// app.use(express.static(join(__dirname, 'public')));

// Routes

// Initialize PO routes
const initializeRoutes = async () => {
  await poService.initialize();
  app.use('/api/po', poRouter);
  
  // Remove the root route handler that serves the old frontend
  // app.get('/', (req, res) => {
  //   res.sendFile(join(__dirname, 'public', 'index.html'));
  // });

  // Only in production mode, serve the React app from the public directory
  if (process.env.NODE_ENV === 'production') {
    logger.info('Running in production mode, serving React frontend...');
    
    // Serve static files from the public directory (React build)
    app.use(express.static(join(__dirname, 'public')));
    
    // For any route that doesn't start with /api, serve the React index.html
    // This enables client-side routing with React Router
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        // Skip API routes
        return next();
      }
      
      // Serve the React app's index.html for all other routes
      res.sendFile(join(__dirname, 'public', 'index.html'));
    });
    
    logger.info('React frontend is configured for serving');
  }
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
