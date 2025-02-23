import LangchainProcessor from './LangchainProcessor/index.js';
import { ConfigurationError } from './errors.js';
import { 
    schema,
    REQUIRED_FIELDS,
    FIELD_FORMATS,
    BUSINESS_RULES,
    DEFAULT_VALUES,
    SCHEMA_VERSION 
} from '../../../core/schema/index.js';

class ProcessorFactory {
    static async create(config = {}) {
        // Validate configuration
        this.validateConfig(config);

        // Create processor instance
        try {
            const processor = new LangchainProcessor({
                llm: {
                    model: config.llm?.model || 'gpt-4',
                    temperature: config.llm?.temperature || 0.3,
                    maxTokens: config.llm?.maxTokens || 2000,
                    retryAttempts: config.llm?.retryAttempts || 3,
                    retryDelay: config.llm?.retryDelay || 1000
                },
                retryConfig: {
                    maxAttempts: config.llm?.retryAttempts || 3,
                    backoffMs: config.llm?.retryDelay || 1000
                },
                promptConfig: {
                    systemPrompt: config.prompts?.systemPrompt,
                    examples: config.prompts?.examples || [],
                    outputFormat: schema // Use core schema directly
                },
                validationRules: {
                    requiredFields: REQUIRED_FIELDS,
                    fieldFormats: FIELD_FORMATS,
                    businessRules: BUSINESS_RULES,
                    defaultValues: DEFAULT_VALUES
                }
            });

            return processor;
        } catch (error) {
            throw new ConfigurationError(
                `Failed to create processor: ${error.message}`
            );
        }
    }

    static validateConfig(config) {
        // Required configuration sections
        const requiredSections = ['llm', 'prompts'];
        const missingSections = requiredSections.filter(
            section => !config[section]
        );

        if (missingSections.length > 0) {
            throw new ConfigurationError(
                `Missing required configuration sections: ${missingSections.join(', ')}`
            );
        }

        // Validate LLM configuration
        if (!config.llm.model) {
            throw new ConfigurationError('LLM model must be specified');
        }

        // Validate prompt configuration
        if (!config.prompts.systemPrompt) {
            throw new ConfigurationError('System prompt must be specified');
        }

        // Validate any custom validation rules don't conflict with core schema
        if (config.validation) {
            // Check for conflicts with core schema required fields
            for (const [section, fields] of Object.entries(config.validation)) {
                if (REQUIRED_FIELDS[section]) {
                    const conflicts = fields.filter(f => !REQUIRED_FIELDS[section].includes(f));
                    if (conflicts.length > 0) {
                        throw new ConfigurationError(
                            `Custom validation rules conflict with core schema: ${conflicts.join(', ')}`
                        );
                    }
                }
            }

            // Check for conflicts with field formats
            for (const [field, format] of Object.entries(config.validation.fieldFormats || {})) {
                if (FIELD_FORMATS[field] && format.pattern !== FIELD_FORMATS[field].pattern) {
                    throw new ConfigurationError(
                        `Field format conflict with core schema: ${field}`
                    );
                }
            }
        }
    }

    static getDefaultConfig() {
        return {
            llm: {
                model: 'gpt-4',
                temperature: 0.3,
                maxTokens: 2000,
                retryAttempts: 3,
                retryDelay: 1000
            },
            prompts: {
                systemPrompt: 'Extract structured data from purchase order documents...',
                examples: [],
                outputFormat: schema // Use core schema directly
            },
            validation: {
                requiredFields: REQUIRED_FIELDS,
                fieldFormats: FIELD_FORMATS,
                businessRules: BUSINESS_RULES,
                defaultValues: DEFAULT_VALUES
            },
            metadata: {
                schemaVersion: SCHEMA_VERSION,
                processorVersion: '1.0.0'
            }
        };
    }
}

export { ProcessorFactory };
