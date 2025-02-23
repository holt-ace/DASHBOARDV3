import { createValidationResult, createValidationError, ValidationErrorType } from './types/validation.js';

// Time constants
const TIME_UNITS = {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
};

/**
 * Validates a time range
 * @param {import('./types/validation.js').TimeRange} range - Time range to validate
 * @param {Object} [options] - Validation options
 * @returns {import('./types/validation.js').ValidationResult}
 */
export const validateTimeRange = (range, options = {}) => {
    const {
        maxRange = TIME_UNITS.YEAR,
        minRange = 0,
        allowFuture = false,
        allowPast = true
    } = options;

    const errors = [];
    const start = new Date(range.start);
    const end = new Date(range.end);
    const now = new Date();

    // Validate date formats
    if (isNaN(start.getTime())) {
        errors.push(createValidationError(
            ValidationErrorType.TIME_ERROR,
            'Invalid start date format'
        ));
    }

    if (isNaN(end.getTime())) {
        errors.push(createValidationError(
            ValidationErrorType.TIME_ERROR,
            'Invalid end date format'
        ));
    }

    if (errors.length > 0) {
        return createValidationResult(false, errors);
    }

    // Validate start is before end
    if (start > end) {
        errors.push(createValidationError(
            ValidationErrorType.TIME_ERROR,
            'Start date must be before end date'
        ));
    }

    // Validate range limits
    const rangeMs = end.getTime() - start.getTime();
    if (rangeMs > maxRange) {
        errors.push(createValidationError(
            ValidationErrorType.TIME_ERROR,
            'Time range exceeds maximum allowed'
        ));
    }

    if (rangeMs < minRange) {
        errors.push(createValidationError(
            ValidationErrorType.TIME_ERROR,
            'Time range is below minimum required'
        ));
    }

    // Validate future/past restrictions
    if (!allowFuture && end > now) {
        errors.push(createValidationError(
            ValidationErrorType.TIME_ERROR,
            'Future dates are not allowed'
        ));
    }

    if (!allowPast && start < now) {
        errors.push(createValidationError(
            ValidationErrorType.TIME_ERROR,
            'Past dates are not allowed'
        ));
    }

    return createValidationResult(
        errors.length === 0,
        errors,
        { start, end, range: rangeMs }
    );
};

/**
 * Validates a date string format
 * @param {string} date - Date string to validate
 * @param {string} [format='YYYY-MM-DD'] - Expected format
 * @returns {import('./types/validation.js').ValidationResult}
 */
export const validateDateFormat = (date, format = 'YYYY-MM-DD') => {
    const formatRegex = {
        'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
        'MM/DD/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
        'DD-MM-YYYY': /^\d{2}-\d{2}-\d{4}$/,
        'ISO': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
    };

    if (!formatRegex[format].test(date)) {
        return createValidationResult(false, [
            createValidationError(
                ValidationErrorType.FORMAT_ERROR,
                `Invalid date format. Expected ${format}`
            )
        ]);
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
        return createValidationResult(false, [
            createValidationError(
                ValidationErrorType.TIME_ERROR,
                'Invalid date value'
            )
        ]);
    }

    return createValidationResult(true);
};

/**
 * Validates a time period
 * @param {string} period - Time period to validate (e.g., '1d', '2w', '3m', '1y')
 * @returns {import('./types/validation.js').ValidationResult}
 */
export const validateTimePeriod = (period) => {
    const periodRegex = /^(\d+)([dwmy])$/i;
    const match = period.match(periodRegex);

    if (!match) {
        return createValidationResult(false, [
            createValidationError(
                ValidationErrorType.FORMAT_ERROR,
                'Invalid time period format. Expected format: {number}[d|w|m|y]'
            )
        ]);
    }

    const [, value, unit] = match;
    const unitMap = { d: 'DAY', w: 'WEEK', m: 'MONTH', y: 'YEAR' };
    const ms = parseInt(value) * TIME_UNITS[unitMap[unit.toLowerCase()]];

    return createValidationResult(true, [], { ms });
};

/**
 * Gets the time unit in milliseconds
 * @param {string} unit - Time unit (MINUTE, HOUR, DAY, WEEK, MONTH, YEAR)
 * @returns {number} Milliseconds
 */
export const getTimeUnit = (unit) => TIME_UNITS[unit.toUpperCase()];

/**
 * Creates a time range from a period
 * @param {string} period - Time period (e.g., '1d', '2w', '3m', '1y')
 * @param {Date} [end=new Date()] - End date
 * @returns {import('./types/validation.js').TimeRange}
 */
export const createTimeRange = (period, end = new Date()) => {
    const { valid, details } = validateTimePeriod(period);
    if (!valid) {
        throw new Error('Invalid time period');
    }

    const endDate = new Date(end);
    const startDate = new Date(endDate.getTime() - details.ms);

    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
};