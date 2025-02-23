/**
 * Validation result interface
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the validation passed
 * @property {string[]} errors - Array of error messages
 * @property {Object} [details] - Optional validation details
 */

/**
 * Status transition interface
 * @typedef {Object} StatusTransition
 * @property {string} current - Current status
 * @property {string} next - Next status
 * @property {Object} [data] - Optional transition data
 */

/**
 * Status validation result
 * @typedef {Object} StatusValidation
 * @property {boolean} valid - Whether the status transition is valid
 * @property {string[]} errors - Array of error messages
 * @property {Object} [statusInfo] - Status metadata
 * @property {string[]} [validTransitions] - List of valid transitions
 */

/**
 * Time range interface
 * @typedef {Object} TimeRange
 * @property {Date|string} start - Start date/time
 * @property {Date|string} end - End date/time
 */

/**
 * Metric validation result
 * @typedef {Object} MetricValidation
 * @property {boolean} valid - Whether the metrics are valid
 * @property {string[]} errors - Array of error messages
 * @property {Object} [metrics] - Validated metrics data
 */

/**
 * Schema validation options
 * @typedef {Object} SchemaValidationOptions
 * @property {boolean} [strict=true] - Whether to perform strict validation
 * @property {string[]} [requiredFields] - Additional required fields
 * @property {Object} [customValidators] - Custom validation functions
 */

// Export validation error types
export const ValidationErrorType = {
    SCHEMA_ERROR: 'SCHEMA_ERROR',
    TYPE_ERROR: 'TYPE_ERROR',
    REQUIRED_FIELD: 'REQUIRED_FIELD',
    FORMAT_ERROR: 'FORMAT_ERROR',
    BUSINESS_RULE: 'BUSINESS_RULE',
    STATUS_ERROR: 'STATUS_ERROR',
    TIME_ERROR: 'TIME_ERROR',
    METRIC_ERROR: 'METRIC_ERROR'
};

// Export validation result factory
export const createValidationResult = (valid = true, errors = [], details = {}) => ({
    valid,
    errors,
    details
});

// Export status validation result factory
export const createStatusValidation = (valid = true, errors = [], statusInfo = {}, validTransitions = []) => ({
    valid,
    errors,
    statusInfo,
    validTransitions
});

// Export metric validation result factory
export const createMetricValidation = (valid = true, errors = [], metrics = {}) => ({
    valid,
    errors,
    metrics
});

// Export validation error factory
export const createValidationError = (type, message, details = {}) => ({
    type,
    message,
    details,
    timestamp: new Date().toISOString()
});