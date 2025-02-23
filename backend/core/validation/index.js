import { validateSchema, validateField, createCustomValidators } from './schemaValidator.js';
import {
    validateStatusTransition,
    validateStatusRequirements,
    getAvailableTransitions,
    getStatusRequirements,
    getStatusWorkflow,
    isValidStatus
} from './statusValidator.js';
import {
    validateTimeRange,
    validateDateFormat,
    validateTimePeriod,
    createTimeRange,
    getTimeUnit
} from './timeValidator.js';
import {
    ValidationErrorType,
    createValidationResult,
    createValidationError
} from './types/validation.js';

/**
 * Unified validation service
 */
class ValidationService {
    constructor() {
        this.customValidators = {};
    }

    /**
     * Adds custom validators
     * @param {Object} validators - Custom validation rules
     */
    addCustomValidators(validators) {
        this.customValidators = {
            ...this.customValidators,
            ...createCustomValidators(validators)
        };
    }

    /**
     * Validates data against schema
     * @param {Object} data - Data to validate
     * @param {Object} options - Validation options
     * @returns {import('./types/validation.js').ValidationResult}
     */
    validateData(data, options = {}) {
        return validateSchema(data, {
            ...options,
            customValidators: this.customValidators
        });
    }

    /**
     * Validates a specific field
     * @param {string} field - Field path
     * @param {*} value - Field value
     * @returns {import('./types/validation.js').ValidationResult}
     */
    validateField(field, value) {
        return validateField(field, value);
    }

    /**
     * Validates a status transition
     * @param {import('./types/validation.js').StatusTransition} transition
     * @returns {import('./types/validation.js').StatusValidation}
     */
    validateStatusTransition(transition) {
        return validateStatusTransition(transition);
    }

    /**
     * Validates status requirements
     * @param {string} status - Status to validate
     * @param {Object} data - Data to validate against requirements
     * @returns {import('./types/validation.js').StatusValidation}
     */
    validateStatusRequirements(status, data) {
        return validateStatusRequirements(status, data);
    }

    /**
     * Gets available status transitions
     * @param {string} status - Current status
     * @returns {string[]} Available transitions
     */
    getAvailableTransitions(status) {
        return getAvailableTransitions(status);
    }

    /**
     * Gets status requirements
     * @param {string} status - Status to check
     * @returns {Object} Status requirements
     */
    getStatusRequirements(status) {
        return getStatusRequirements(status);
    }

    /**
     * Gets complete status workflow
     * @returns {Object} Status workflow
     */
    getStatusWorkflow() {
        return getStatusWorkflow();
    }

    /**
     * Checks if a status is valid
     * @param {string} status - Status to check
     * @returns {boolean} Whether status is valid
     */
    isValidStatus(status) {
        return isValidStatus(status);
    }

    /**
     * Validates a time range
     * @param {import('./types/validation.js').TimeRange} range
     * @param {Object} options - Validation options
     * @returns {import('./types/validation.js').ValidationResult}
     */
    validateTimeRange(range, options = {}) {
        return validateTimeRange(range, options);
    }

    /**
     * Validates a date format
     * @param {string} date - Date string
     * @param {string} format - Expected format
     * @returns {import('./types/validation.js').ValidationResult}
     */
    validateDateFormat(date, format) {
        return validateDateFormat(date, format);
    }

    /**
     * Validates a time period
     * @param {string} period - Time period
     * @returns {import('./types/validation.js').ValidationResult}
     */
    validateTimePeriod(period) {
        return validateTimePeriod(period);
    }

    /**
     * Creates a time range from period
     * @param {string} period - Time period
     * @param {Date} end - End date
     * @returns {import('./types/validation.js').TimeRange}
     */
    createTimeRange(period, end) {
        return createTimeRange(period, end);
    }

    /**
     * Gets time unit in milliseconds
     * @param {string} unit - Time unit
     * @returns {number} Milliseconds
     */
    getTimeUnit(unit) {
        return getTimeUnit(unit);
    }

    /**
     * Creates a validation error
     * @param {string} type - Error type
     * @param {string} message - Error message
     * @param {Object} details - Error details
     * @returns {Object} Validation error
     */
    createError(type, message, details = {}) {
        return createValidationError(type, message, details);
    }

    /**
     * Creates a validation result
     * @param {boolean} valid - Whether validation passed
     * @param {string[]} errors - Error messages
     * @param {Object} details - Additional details
     * @returns {import('./types/validation.js').ValidationResult}
     */
    createResult(valid, errors = [], details = {}) {
        return createValidationResult(valid, errors, details);
    }
}

// Export singleton instance
export const validationService = new ValidationService();

// Export types and constants
export {
    ValidationErrorType,
    createValidationResult,
    createValidationError
};