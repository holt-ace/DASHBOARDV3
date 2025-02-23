import { ProcessorFactory } from './ProcessorFactory.js';
import { FileHandler } from './handlers/FileHandler.js';
import LangchainProcessor from './LangchainProcessor/index.js';
import {
    ConfigurationError,
    ProcessingError,
    ValidationError,
    LLMError,
    ParsingError,
    FeatureError,
    ErrorTypes,
    RecoveryStrategies,
    getRecoveryStrategy
} from './errors.js';

// Export the main factory function for primary usage
export const createPDFProcessor = ProcessorFactory.create;

// Export core components
export {
    ProcessorFactory,
    LangchainProcessor,
    FileHandler,
    // Error types
    ConfigurationError,
    ProcessingError,
    ValidationError,
    LLMError,
    ParsingError,
    FeatureError,
    // Error handling utilities
    ErrorTypes,
    RecoveryStrategies,
    getRecoveryStrategy
};

// Export default for backward compatibility
export default {
    createPDFProcessor,
    ProcessorFactory,
    LangchainProcessor,
    FileHandler,
    errors: {
        ConfigurationError,
        ProcessingError,
        ValidationError,
        LLMError,
        ParsingError,
        FeatureError,
        ErrorTypes,
        RecoveryStrategies,
        getRecoveryStrategy
    }
};
