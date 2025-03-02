/**
 * Schema re-export file
 * Provides a simplified interface to the schema system
 */

import {
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
    indexOptions,
    createSchemaService,
    initializeSchemaService,
    getSchemaService
} from './schema/index.js';

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @returns {boolean} Whether data is valid
 */
export const validateSchema = (data) => {
    // Simple validation implementation
    // In a real system, this would use a more sophisticated validation
    try {
        // Check required fields
        for (const field of REQUIRED_FIELDS.root || []) {
            if (data[field] === undefined || data[field] === null) {
                return false;
            }
        }

        // Check header required fields
        for (const field of REQUIRED_FIELDS.header || []) {
            const parts = field.split('.');
            let current = data.header;
            
            for (const part of parts) {
                if (!current || current[part] === undefined || current[part] === null) {
                    return false;
                }
                current = current[part];
            }
        }

        // Check products required fields
        if (Array.isArray(data.products)) {
            for (const product of data.products) {
                for (const field of REQUIRED_FIELDS.products || []) {
                    if (product[field] === undefined || product[field] === null) {
                        return false;
                    }
                }
            }
        } else {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Schema validation error:', error);
        return false;
    }
};

// Re-export schema components
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
    indexOptions,
    createSchemaService,
    initializeSchemaService,
    getSchemaService
};