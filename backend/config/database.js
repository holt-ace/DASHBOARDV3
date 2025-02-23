import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

export const connectDB = async () => {
    try {
        const { uri, options } = config.database;
        await mongoose.connect(uri, options);
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        throw error;
    }
};

export default {
    connectDB
};