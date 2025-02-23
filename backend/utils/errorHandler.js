import logger from "./logger.js";

// Standard error types
export const ErrorType = {
    VALIDATION: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    PROCESSING: 'PROCESSING_ERROR',
    BUSINESS_RULE: 'BUSINESS_RULE_ERROR',
    SYSTEM: 'SYSTEM_ERROR'
};

// HTTP status code mappings
const statusCodes = {
    [ErrorType.VALIDATION]: 400,
    [ErrorType.NOT_FOUND]: 404,
    [ErrorType.PROCESSING]: 422,
    [ErrorType.BUSINESS_RULE]: 400,
    [ErrorType.SYSTEM]: 500
};

// User-friendly error messages
const errorMessages = {
    [ErrorType.VALIDATION]: 'The provided data is invalid.',
    [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorType.PROCESSING]: 'Unable to process the request.',
    [ErrorType.BUSINESS_RULE]: 'The request violates business rules.',
    [ErrorType.SYSTEM]: 'An internal system error occurred.'
};

/**
 * Create a standardized error response
 */
const createErrorResponse = (error, isDevelopment = process.env.NODE_ENV === 'development') => {
    // Determine error type
    const errorType = error.type || ErrorType.SYSTEM;
    
    return {
        success: false,
        error: {
            type: errorType,
            message: error.message || errorMessages[errorType],
            details: error.details || null,
            ...(isDevelopment && { stack: error.stack })
        }
    };
};

/**
 * Global error handling middleware
 */
export const errorMiddleware = (err, req, res, next) => {
    // Log error
    logger.error("Error caught:", {
        type: err.type || 'UNKNOWN',
        message: err.message,
        path: req.path,
        method: req.method
    });

    // Determine status code
    const statusCode = err.statusCode || 
                      statusCodes[err.type] || 
                      (res.statusCode !== 200 ? res.statusCode : 500);

    // Send response
    res.status(statusCode).json(createErrorResponse(err));
};

/**
 * Create a typed error
 */
export const createError = (type, message, details = null) => {
    const error = new Error(message);
    error.type = type;
    error.details = details;
    error.statusCode = statusCodes[type];
    return error;
};

// Export error creation helpers
export const ValidationError = (message, details) => 
    createError(ErrorType.VALIDATION, message, details);

export const NotFoundError = (message, details) => 
    createError(ErrorType.NOT_FOUND, message, details);

export const ProcessingError = (message, details) => 
    createError(ErrorType.PROCESSING, message, details);

export const BusinessRuleError = (message, details) => 
    createError(ErrorType.BUSINESS_RULE, message, details);

export const SystemError = (message, details) => 
    createError(ErrorType.SYSTEM, message, details);

export default errorMiddleware;