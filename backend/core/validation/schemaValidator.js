import { schema } from '../schema/index.js';
import { ValidationErrorType, createValidationResult, createValidationError } from './types/validation.js';

/**
 * Validates data against the core schema
 * @param {Object} data - Data to validate
 * @param {import('./types/validation.js').SchemaValidationOptions} [options={}] - Validation options
 * @returns {import('./types/validation.js').ValidationResult}
 */
export const validateSchema = (data, options = {}) => {
    const {
        strict = true,
        requiredFields = [],
        customValidators = {}
    } = options;

    const errors = [];
    
    // Validate data exists
    if (!data || typeof data !== 'object') {
        return createValidationResult(false, [
            createValidationError(
                ValidationErrorType.TYPE_ERROR,
                'Invalid data type: expected object'
            )
        ]);
    }

    const validate = (obj, schemaObj, path = '') => {
        // Check required fields
        Object.keys(schemaObj).forEach(key => {
            const fullPath = path ? `${path}.${key}` : key;
            const val = obj?.[key];
            const schemaVal = schemaObj[key];

            // Handle undefined/null values
            if (val === undefined || val === null) {
                if (strict || requiredFields.includes(fullPath)) {
                    errors.push(createValidationError(
                        ValidationErrorType.REQUIRED_FIELD,
                        `Required field missing: ${fullPath}`
                    ));
                }
                return;
            }

            // Handle arrays
            if (Array.isArray(schemaVal)) {
                if (!Array.isArray(val)) {
                    errors.push(createValidationError(
                        ValidationErrorType.TYPE_ERROR,
                        `Invalid type for ${fullPath}: expected array`
                    ));
                    return;
                }

                // Validate array items
                val.forEach((item, index) => {
                    validate(item, schemaVal[0], `${fullPath}[${index}]`);
                });
                return;
            }

            // Handle objects
            if (typeof schemaVal === 'object') {
                if (typeof val !== 'object') {
                    errors.push(createValidationError(
                        ValidationErrorType.TYPE_ERROR,
                        `Invalid type for ${fullPath}: expected object`
                    ));
                    return;
                }

                validate(val, schemaVal, fullPath);
                return;
            }

            // Handle primitive types
            if (val.constructor !== schemaVal) {
                errors.push(createValidationError(
                    ValidationErrorType.TYPE_ERROR,
                    `Invalid type for ${fullPath}: expected ${schemaVal.name}`
                ));
                return;
            }

            // Run custom validators if provided
            if (customValidators[fullPath]) {
                try {
                    const customResult = customValidators[fullPath](val, obj);
                    if (customResult !== true) {
                        errors.push(createValidationError(
                            ValidationErrorType.BUSINESS_RULE,
                            customResult || `Custom validation failed for ${fullPath}`
                        ));
                    }
                } catch (error) {
                    errors.push(createValidationError(
                        ValidationErrorType.BUSINESS_RULE,
                        `Custom validator error for ${fullPath}: ${error.message}`
                    ));
                }
            }
        });
    };

    // Perform validation
    validate(data, schema);

    return createValidationResult(
        errors.length === 0,
        errors,
        { validatedFields: Object.keys(data) }
    );
};

/**
 * Creates a custom validator function
 * @param {Object} rules - Validation rules
 * @returns {Object} Custom validators object
 */
export const createCustomValidators = (rules) => {
    const validators = {};

    Object.entries(rules).forEach(([path, rule]) => {
        validators[path] = (value, data) => {
            if (typeof rule === 'function') {
                return rule(value, data);
            }
            
            if (rule.validate) {
                return rule.validate(value, data);
            }

            if (rule.pattern) {
                return rule.pattern.test(value) || rule.message || 'Pattern validation failed';
            }

            if (rule.enum) {
                return rule.enum.includes(value) || rule.message || 'Invalid enum value';
            }

            return true;
        };
    });

    return validators;
};

/**
 * Validates a specific field against the schema
 * @param {string} field - Field path (dot notation)
 * @param {*} value - Field value
 * @returns {import('./types/validation.js').ValidationResult}
 */
export const validateField = (field, value) => {
    const fieldPath = field.split('.');
    let schemaValue = schema;

    // Traverse schema to find field
    for (const part of fieldPath) {
        if (Array.isArray(schemaValue)) {
            schemaValue = schemaValue[0];
        }
        schemaValue = schemaValue[part];
        
        if (!schemaValue) {
            return createValidationResult(false, [
                createValidationError(
                    ValidationErrorType.SCHEMA_ERROR,
                    `Invalid field path: ${field}`
                )
            ]);
        }
    }

    // Validate field value
    if (value === undefined || value === null) {
        return createValidationResult(false, [
            createValidationError(
                ValidationErrorType.REQUIRED_FIELD,
                `Required field missing: ${field}`
            )
        ]);
    }

    if (value.constructor !== schemaValue) {
        return createValidationResult(false, [
            createValidationError(
                ValidationErrorType.TYPE_ERROR,
                `Invalid type for ${field}: expected ${schemaValue.name}`
            )
        ]);
    }

    return createValidationResult(true);
};