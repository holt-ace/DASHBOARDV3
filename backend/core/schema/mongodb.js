import { schema, REQUIRED_FIELDS, FIELD_FORMATS } from './definitions.js';

/**
 * MongoDB schema configuration
 * Handles database validation and indexing
 */

// Convert core schema to MongoDB BSON types
const convertToBSONType = (jsType) => {
    const typeMap = {
        [String]: 'string',
        [Number]: 'number',
        [Boolean]: 'bool',
        [Date]: 'date',
        [Object]: 'object',
        [Array]: 'array'
    };
    return typeMap[jsType] || 'mixed';
};

// Convert schema to MongoDB validation format
const createMongoSchema = (schemaObj, path = '') => {
    const properties = {};
    const required = [];

    Object.entries(schemaObj).forEach(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key;

        // Handle arrays
        if (Array.isArray(value)) {
            properties[key] = {
                bsonType: 'array',
                minItems: 1,
                items: {
                    bsonType: 'object',
                    required: REQUIRED_FIELDS.products || [],
                    properties: createMongoSchema(value[0]).properties
                }
            };
            if (REQUIRED_FIELDS.root?.includes(key)) {
                required.push(key);
            }
            return;
        }

        // Handle objects
        if (typeof value === 'object' && value !== null) {
            const nested = createMongoSchema(value, fullPath);
            properties[key] = {
                bsonType: 'object',
                required: REQUIRED_FIELDS[key] || [],
                properties: nested.properties
            };
            if (REQUIRED_FIELDS.root?.includes(key)) {
                required.push(key);
            }
            return;
        }

        // Handle primitive types
        properties[key] = {
            bsonType: convertToBSONType(value)
        };

        // Add format validation if specified
        if (FIELD_FORMATS[fullPath]?.pattern) {
            properties[key].pattern = FIELD_FORMATS[fullPath].pattern.toString();
        }

        // Add to required fields if specified
        if (REQUIRED_FIELDS.root?.includes(key)) {
            required.push(key);
        }
    });

    return { properties, required };
};

// Generate MongoDB schema
export const mongoSchema = {
    bsonType: 'object',
    required: REQUIRED_FIELDS.root || [],
    properties: createMongoSchema(schema).properties
};

// Define indexes for MongoDB
export const indexes = [
    // Primary indexes
    {
        key: { 'header.poNumber': 1 },
        unique: true,
        name: 'idx_po_number'
    },
    {
        key: { 'header.ocNumber': 1 },
        sparse: true,
        name: 'idx_oc_number'
    },

    // Search indexes
    {
        key: { 'header.status': 1 },
        name: 'idx_status'
    },
    {
        key: { 'header.orderDate': 1 },
        name: 'idx_order_date'
    },
    {
        key: { 'header.buyerInfo.email': 1 },
        name: 'idx_buyer_email'
    },
    {
        key: { 'header.syscoLocation.name': 1 },
        name: 'idx_location'
    },

    // Compound indexes
    {
        key: {
            'header.status': 1,
            'header.orderDate': -1
        },
        name: 'idx_status_date'
    },
    {
        key: {
            'header.syscoLocation.name': 1,
            'header.orderDate': -1
        },
        name: 'idx_location_date'
    },

    // Product indexes
    {
        key: { 'products.supc': 1 },
        name: 'idx_product_supc'
    },

    // Text search index
    {
        key: {
            'header.poNumber': 'text',
            'header.buyerInfo.firstName': 'text',
            'header.buyerInfo.lastName': 'text',
            'products.description': 'text'
        },
        name: 'idx_text_search',
        weights: {
            'header.poNumber': 10,
            'header.buyerInfo.firstName': 5,
            'header.buyerInfo.lastName': 5,
            'products.description': 3
        }
    }
];

// Collection configuration
export const collectionConfig = {
    name: 'purchase_orders',
    options: {
        validator: {
            $jsonSchema: mongoSchema
        },
        validationLevel: 'strict',
        validationAction: 'error'
    }
};

// Index creation options
export const indexOptions = {
    background: true,
    // Write operations will block until indexes are done building
    writeConcern: { w: 1 }
};

/**
 * Creates MongoDB collection with schema validation
 * @param {import('mongodb').Db} db - MongoDB database instance
 */
export const createCollection = async (db) => {
    try {
        // Create collection with validation
        await db.createCollection(collectionConfig.name, collectionConfig.options);
        console.log('Created purchase_orders collection with schema validation');

        // Create indexes
        const collection = db.collection(collectionConfig.name);
        await Promise.all(
            indexes.map(index =>
                collection.createIndex(index.key, {
                    ...indexOptions,
                    ...index,
                    background: true
                })
            )
        );
        console.log('Created indexes for purchase_orders collection');
    } catch (error) {
        console.error('Error creating collection:', error);
        throw error;
    }
};

/**
 * Updates MongoDB collection schema
 * @param {import('mongodb').Db} db - MongoDB database instance
 */
export const updateSchema = async (db) => {
    try {
        await db.command({
            collMod: collectionConfig.name,
            validator: {
                $jsonSchema: mongoSchema
            },
            validationLevel: collectionConfig.options.validationLevel,
            validationAction: collectionConfig.options.validationAction
        });
        console.log('Updated purchase_orders schema validation');
    } catch (error) {
        console.error('Error updating schema:', error);
        throw error;
    }
};