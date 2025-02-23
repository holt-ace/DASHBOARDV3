import logger from "./logger.js";

class ModuleError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ModuleError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (operationName, error, context = {}) => {
  // If error is already a ModuleError, just add context and rethrow
  if (error instanceof ModuleError) {
    error.details = {
      ...error.details,
      ...context,
      operationName
    };
    throw error;
  }

  // Determine error code
  let errorCode = 'UNKNOWN_ERROR';
  if (error.code) {
    errorCode = error.code;
  } else if (error instanceof TypeError) {
    errorCode = 'TYPE_ERROR';
  } else if (error instanceof ReferenceError) {
    errorCode = 'REFERENCE_ERROR';
  } else if (error instanceof SyntaxError) {
    errorCode = 'SYNTAX_ERROR';
  }

  // Collect error details
  const errorDetails = {
    ...context,
    originalError: {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    },
    operationName,
    timestamp: new Date().toISOString()
  };

  // Add any additional error properties
  if (error.details) {
    errorDetails.additionalDetails = error.details;
  }

  // Log the error with full context
  logger.error(`${operationName} failed:`, error, {
    ...context,
    errorCode,
    errorDetails
  });

  // Create and throw a new ModuleError
  throw new ModuleError(
    `${operationName} failed: ${error.message}`,
    errorCode,
    errorDetails
  );
};

export const wrapAsync = (fn) => {
  return async function (req, res, next) {
    try {
      await fn(req, res, next);
    } catch (error) {
      // Log the error
      logger.error('Async operation failed:', error, {
        path: req.path,
        method: req.method,
        query: req.query,
        params: req.params
      });

      // Determine status code based on error
      let statusCode = 500;
      if (error instanceof ModuleError) {
        switch (error.code) {
          case 'VALIDATION_ERROR':
            statusCode = 400;
            break;
          case 'NOT_FOUND':
            statusCode = 404;
            break;
          case 'UNAUTHORIZED':
            statusCode = 401;
            break;
          case 'FORBIDDEN':
            statusCode = 403;
            break;
        }
      }

      // Send error response
      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
          details: error.details || {}
        }
      });
    }
  };
};

export { ModuleError };
