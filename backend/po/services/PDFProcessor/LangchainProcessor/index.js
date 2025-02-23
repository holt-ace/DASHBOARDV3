import LangchainService from './LangchainService.js';
import ValidationHelper from './ValidationHelper.js';
import { ProcessingError, ValidationError, LLMError } from '../errors.js';

class LangchainProcessor {
    constructor(config) {
        this.config = config;
        this.llmService = new LangchainService(config);
        this.validator = new ValidationHelper(config.validationRules);
    }

    async process(text) {
        const startTime = Date.now();
        let attempts = 0;

        try {
            // Process with retry
            const result = await this.processWithRetry(text);
            
            // Validate the result
            const validationResult = await this.validator.validate(result);
            
            if (!validationResult.isValid) {
                throw new ValidationError('Validation failed', validationResult.errors);
            }

            return {
                success: true,
                data: result,
                metrics: {
                    processingTime: Date.now() - startTime,
                    attempts
                }
            };

        } catch (error) {
            // For malformed input or parsing errors
            if (error instanceof LLMError && error.message.includes('parse')) {
                throw new ProcessingError(
                    'Failed to process malformed input',
                    error.message,
                    { processingTime: Date.now() - startTime, attempts }
                );
            }

            // For validation errors
            if (error instanceof ValidationError) {
                throw error;
            }

            // For all other errors
            throw new ProcessingError(
                'Processing failed',
                error.message,
                { processingTime: Date.now() - startTime, attempts }
            );
        }
    }

    async processWithRetry(text) {
        const maxAttempts = this.config.retryConfig?.maxAttempts || 3;
        const backoffMs = this.config.retryConfig?.backoffMs || 1000;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await this.llmService.process(text);
            } catch (error) {
                lastError = error;
                
                if (attempt < maxAttempts) {
                    // Wait with exponential backoff before retrying
                    const delay = backoffMs * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
        }

        throw lastError || new LLMError('Processing failed after all retry attempts');
    }
}

export default LangchainProcessor;
