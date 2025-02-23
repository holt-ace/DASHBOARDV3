export class LangchainProcessingError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'LangchainProcessingError';
    this.details = details;
    this.code = 'LANGCHAIN_PROCESSING_ERROR';
  }
}

export class LangchainValidationError extends Error {
  constructor(message, validationErrors = []) {
    super(message);
    this.name = 'LangchainValidationError';
    this.validationErrors = validationErrors;
    this.code = 'LANGCHAIN_VALIDATION_ERROR';
  }
}

export class LangchainConfigError extends Error {
  constructor(message, config = {}) {
    super(message);
    this.name = 'LangchainConfigError';
    this.config = config;
    this.code = 'LANGCHAIN_CONFIG_ERROR';
  }
}

export const createError = (type, message, details = {}) => {
  switch (type) {
    case 'processing':
      return new LangchainProcessingError(message, details);
    case 'validation':
      return new LangchainValidationError(message, details);
    case 'config':
      return new LangchainConfigError(message, details);
    default:
      return new Error(message);
  }
};

// Helper function to wrap errors with context
export const wrapError = (error, context) => {
  if (error instanceof LangchainProcessingError ||
      error instanceof LangchainValidationError ||
      error instanceof LangchainConfigError) {
    error.details = {
      ...error.details,
      ...context
    };
    return error;
  }

  return createError('processing', error.message, {
    originalError: error,
    ...context
  });
};

// Helper function to create validation errors with specific field information
export const createValidationError = (field, message, value) => {
  return new LangchainValidationError(message, [{
    field,
    message,
    value
  }]);
};

// Helper function to create processing errors with specific stage information
export const createProcessingError = (stage, message, details = {}) => {
  return new LangchainProcessingError(message, {
    stage,
    ...details
  });
};

// Helper function to create config errors with specific config information
export const createConfigError = (configKey, message, value) => {
  return new LangchainConfigError(message, {
    configKey,
    value
  });
};