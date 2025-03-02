import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

// Track connection state
let isConnected = false;

export const connectDB = async () => {
    try {
        // If already connected, return early
        if (isConnected) {
            logger.info('MongoDB connection already established');
            return;
        }

        const { uri, options } = config.database;
        
        // Check if URI is provided
        if (!uri) {
            throw new Error('MongoDB URI is not defined. Please check your .env file.');
        }
        
        // Connect with mongoose
        await mongoose.connect(uri, options);
        
        // Verify connection with a ping
        const db = mongoose.connection.db;
        await db.command({ ping: 1 });
        
        // Log which database we're connected to
        logger.info('MongoDB connected to database:', {
            databaseName: mongoose.connection.db.databaseName,
            collectionsCount: (await mongoose.connection.db.listCollections().toArray()).length
        });
        
        isConnected = true;
        logger.info('MongoDB connected successfully and verified with ping');
        
        // Set up connection event handlers
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
            isConnected = false;
        });
        
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
            isConnected = false;
        });
        
        // Handle graceful shutdown
        setupGracefulShutdown();
        
        return mongoose.connection;
    } catch (error) {
        isConnected = false;
        logger.error('MongoDB connection error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        throw error;
    }
};

// Disconnect from MongoDB
export const disconnectDB = async () => {
    if (!isConnected) {
        return;
    }
    
    try {
        await mongoose.disconnect();
        isConnected = false;
        logger.info('MongoDB disconnected successfully');
    } catch (error) {
        logger.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
};

// Set up graceful shutdown handlers
const setupGracefulShutdown = () => {
    // Handle application termination
    process.on('SIGINT', async () => {
        await disconnectDB();
        logger.info('Application terminated, MongoDB connection closed');
        process.exit(0);
    });
    
    // Handle nodemon restarts
    process.on('SIGUSR2', async () => {
        await disconnectDB();
        logger.info('Nodemon restart, MongoDB connection closed');
        process.kill(process.pid, 'SIGUSR2');
    });
};

export default {
    connectDB,
    disconnectDB
};