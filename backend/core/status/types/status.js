/**
 * Status management types and utilities
 * This file defines the core types and helper functions for the status management system
 */

/**
 * Status colors for UI representation
 * @enum {string}
 */
export const StatusColor = {
    UPLOADED: '#3498db',   // Blue
    CONFIRMED: '#2ecc71',  // Green
    SHIPPED: '#f39c12',    // Orange
    INVOICED: '#9b59b6',   // Purple
    DELIVERED: '#27ae60',  // Dark Green
    CANCELLED: '#e74c3c'   // Red
};

/**
 * Requirement levels for status validation
 * @enum {string}
 */
export const RequirementLevel = {
    MANDATORY: 'MANDATORY',
    RECOMMENDED: 'RECOMMENDED',
    OPTIONAL: 'OPTIONAL'
};

/**
 * Status error types
 * @enum {string}
 */
export const StatusErrorType = {
    INVALID_STATUS: 'INVALID_STATUS',
    INVALID_TRANSITION: 'INVALID_TRANSITION',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    MISSING_REQUIRED_DATA: 'MISSING_REQUIRED_DATA',
    REQUIREMENTS_NOT_MET: 'REQUIREMENTS_NOT_MET',
    SYSTEM_ERROR: 'SYSTEM_ERROR'
};

/**
 * Transition types
 * @enum {string}
 */
export const TransitionType = {
    FORWARD: 'FORWARD',     // Moving forward in the workflow
    BACKWARD: 'BACKWARD',   // Moving backward in the workflow
    RESET: 'RESET',         // Resetting to initial state
    MANUAL: 'MANUAL',       // Manual transition
    AUTOMATIC: 'AUTOMATIC', // Automatic transition
    SYSTEM: 'SYSTEM',       // System-triggered transition
    SCHEDULED: 'SCHEDULED'  // Scheduled transition
};

/**
 * Status validation result
 * @typedef {Object} StatusValidationResult
 * @property {boolean} valid - Whether the transition is valid
 * @property {Array<Object>} errors - Validation errors if any
 * @property {Object} metadata - Additional metadata
 */

/**
 * Create a validation result object
 * @param {boolean} valid - Whether the validation passed
 * @param {Array<Object>} [errors=[]] - Validation errors
 * @param {Object} [metadata={}] - Additional metadata
 * @returns {StatusValidationResult} Validation result
 */
export const createValidationResult = (valid, errors = [], metadata = {}) => ({
    valid,
    errors,
    metadata
});

/**
 * Status history entry
 * @typedef {Object} StatusHistoryEntry
 * @property {string} from - Previous status
 * @property {string} to - New status
 * @property {string} timestamp - When the transition occurred
 * @property {string} userId - User who performed the transition
 * @property {string} [reason] - Reason for the transition
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Create a history entry for a status transition
 * @param {string} to - New status
 * @param {string} [reason=''] - Reason for the transition
 * @param {Object} [data={}] - Associated data
 * @param {string} [userId='system'] - User who performed the transition
 * @returns {StatusHistoryEntry} History entry
 */
export const createHistoryEntry = (to, reason = '', data = {}, userId = 'system') => ({
    to,
    reason,
    data,
    userId,
    timestamp: new Date().toISOString()
});

/**
 * Status transition
 * @typedef {Object} StatusTransition
 * @property {string} from - Current status
 * @property {string} to - Target status
 * @property {string} reason - Transition reason
 * @property {Object} data - Associated data
 * @property {string} userId - User who performed the transition
 */

/**
 * Create a transition definition
 * @param {string} from - Current status
 * @param {string} to - Target status
 * @param {string} [reason=''] - Transition reason
 * @param {Object} [data={}] - Associated data
 * @param {string} [userId='system'] - User who performed the transition
 * @returns {StatusTransition} Transition definition
 */
export const createTransition = (from, to, reason = '', data = {}, userId = 'system') => ({
    from,
    to,
    reason,
    data,
    userId,
    timestamp: new Date().toISOString()
});

/**
 * Status error
 * @typedef {Object} StatusError
 * @property {StatusErrorType} type - Error type
 * @property {string} message - Error message
 * @property {Object} [details] - Additional details
 */

/**
 * Create a status error
 * @param {StatusErrorType} type - Error type
 * @param {string} message - Error message
 * @param {Object} [details={}] - Additional details
 * @returns {StatusError} Status error
 */
export const createStatusError = (type, message, details = {}) => ({
    type,
    message,
    details
});