import {
    schema,
    SCHEMA_VERSION,
    REQUIRED_FIELDS,
    FIELD_FORMATS,
    BUSINESS_RULES,
    DEFAULT_VALUES,
    FIELD_TYPES,
    SCHEMA_METADATA,
    schemaConfig
} from './definitions.js';

import {
    mongoSchema,
    indexes,
    collectionConfig,
    indexOptions,
    createCollection,
    updateSchema
} from './mongodb.js';

import { createSchemaManager } from './migrations.js';

/**
 * Schema management service
 * Provides unified interface for schema operations
 */
class SchemaService {
    constructor(db) {
        this.db = db;
        this.schemaManager = createSchemaManager(db);
    }

    /**
     * Initialize schema system
     */
    async initialize() {
        try {
            // Initialize schema versioning
            await this.schemaManager.initialize();

            // Validate current version
            const isValid = await this.schemaManager.validateVersion();
            if (!isValid) {
                console.warn('Schema version mismatch detected');
                await this.migrate();
            }

            // Ensure collection exists with proper schema
            await this.ensureCollection();

            console.log('Schema system initialized successfully');
        } catch (error) {
            console.error('Error initializing schema system:', error);
            throw error;
        }
    }

    /**
     * Ensure collection exists with current schema
     */
    async ensureCollection() {
        try {
            const collections = await this.db.listCollections().toArray();
            const exists = collections.find(c => c.name === collectionConfig.name);

            if (!exists) {
                await createCollection(this.db);
            } else {
                await updateSchema(this.db);
            }
        } catch (error) {
            console.error('Error ensuring collection:', error);
            throw error;
        }
    }

    /**
     * Migrate schema to target version
     * @param {string} targetVersion - Target schema version
     */
    async migrate(targetVersion = SCHEMA_VERSION) {
        await this.schemaManager.migrate(targetVersion);
    }

    /**
     * Get current schema information
     * @returns {Object} Schema information
     */
    getSchemaInfo() {
        return {
            version: SCHEMA_VERSION,
            metadata: SCHEMA_METADATA,
            requiredFields: REQUIRED_FIELDS,
            fieldFormats: FIELD_FORMATS,
            fieldTypes: FIELD_TYPES
        };
    }

    /**
     * Get migration history
     * @returns {Promise<Array>} Migration history
     */
    async getMigrationHistory() {
        return this.schemaManager.getMigrationHistory();
    }

    /**
     * Get available migrations
     * @returns {Object} Available migrations
     */
    getAvailableMigrations() {
        return this.schemaManager.getAvailableMigrations();
    }

    /**
     * Apply default values to document
     * @param {Object} doc - Document to apply defaults to
     * @returns {Object} Document with defaults
     */
    applyDefaults(doc) {
        const result = { ...doc };
        Object.entries(DEFAULT_VALUES).forEach(([path, value]) => {
            const parts = path.split('.');
            let current = result;
            
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }

            const lastPart = parts[parts.length - 1];
            if (current[lastPart] === undefined) {
                current[lastPart] = typeof value === 'function' ? value() : value;
            }
        });
        return result;
    }
}

// Export schema components
export {
    schema,
    SCHEMA_VERSION,
    REQUIRED_FIELDS,
    FIELD_FORMATS,
    BUSINESS_RULES,
    DEFAULT_VALUES,
    FIELD_TYPES,
    SCHEMA_METADATA,
    schemaConfig,
    mongoSchema,
    indexes,
    collectionConfig,
    indexOptions
};

// Export schema service factory
export const createSchemaService = (db) => new SchemaService(db);

// Export singleton instance for direct use
let schemaService = null;
export const initializeSchemaService = async (db) => {
    if (!schemaService) {
        schemaService = new SchemaService(db);
        await schemaService.initialize();
    }
    return schemaService;
};

export const getSchemaService = () => {
    if (!schemaService) {
        throw new Error('Schema service not initialized');
    }
    return schemaService;
};