import { mongoSchema } from './schema.js';

/**
 * Create purchase orders collection with schema validation
 * @param {import('mongodb').Db} db - MongoDB database instance
 */
export const createCollection = async (db) => {
    try {
        // Drop existing collection if it exists
        try {
            await db.dropCollection('purchase_orders');
        } catch (err) {
            // Ignore collection doesn't exist error
            if (err.code !== 26) throw err;
        }

        // Create new collection with schema validation
        await db.createCollection('purchase_orders', {
            validator: { $jsonSchema: mongoSchema }
        });

        // Create essential indexes
        await db.collection('purchase_orders').createIndexes([
            { key: { 'header.poNumber': 1 }, unique: true },
            { key: { 'header.status': 1 } }
        ]);

        console.log('Successfully configured purchase_orders collection with schema validation');
    } catch (error) {
        console.error('Error configuring database:', error);
        throw error;
    }
};

/**
 * Update collection schema validation
 * @param {import('mongodb').Db} db - MongoDB database instance
 */
export const updateValidation = async (db) => {
    try {
        await db.command({
            collMod: 'purchase_orders',
            validator: { $jsonSchema: mongoSchema }
        });

        console.log('Successfully updated schema validation');
    } catch (error) {
        console.error('Error updating schema validation:', error);
        throw error;
    }
};