class BaseError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends BaseError {
    constructor(message, errors = []) {
        super(message);
        this.errors = errors;
    }
}

export class ProcessingError extends BaseError {
    constructor(message, originalError, metrics = {}) {
        super(message);
        this.originalError = originalError;
        this.metrics = metrics;
    }
}

export class ConfigurationError extends BaseError {
    constructor(message) {
        super(message);
    }
}

export class FeatureError extends BaseError {
    constructor(message) {
        super(message);
    }
}

export class LLMError extends BaseError {
    constructor(message, response = null, tokenUsage = null) {
        super(message);
        this.response = response;
        this.tokenUsage = tokenUsage;
    }
}

export class ParsingError extends BaseError {
    constructor(message, rawContent = null) {
        super(message);
        this.rawContent = rawContent;
    }
}

// Error types mapping for error handling strategies
export const ErrorTypes = {
    VALIDATION: 'validation_error',
    PROCESSING: 'processing_error',
    CONFIGURATION: 'configuration_error',
    FEATURE: 'feature_error',
    LLM: 'llm_error',
    PARSING: 'parsing_error'
};

// Error recovery strategies
export const RecoveryStrategies = {
    RETRY: 'retry',          // Retry the operation
    FALLBACK: 'fallback',    // Use fallback processing method
    MANUAL: 'manual',        // Queue for manual review
    ABORT: 'abort'           // Abort processing
};

// Helper to determine recovery strategy based on error type
export function getRecoveryStrategy(error) {
    if (error instanceof LLMError) {
        return RecoveryStrategies.RETRY;
    }
    if (error instanceof ValidationError) {
        return RecoveryStrategies.MANUAL;
    }
    if (error instanceof ProcessingError) {
        return RecoveryStrategies.FALLBACK;
    }
    if (error instanceof ConfigurationError || error instanceof FeatureError) {
        return RecoveryStrategies.ABORT;
    }
    return RecoveryStrategies.MANUAL;
}
