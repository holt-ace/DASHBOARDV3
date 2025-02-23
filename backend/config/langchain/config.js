import { schema, REQUIRED_FIELDS, FIELD_FORMATS, BUSINESS_RULES } from '../../core/schema/index.js';

const config = {
    features: {
        enableLangchain: true,
        enableFallback: false,
        enableComparison: false
    },

    llm: {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 2000,
        retryAttempts: 3,
        retryDelay: 1000,
        timeouts: {
            processing: 30000,
            validation: 5000,
            comparison: 10000
        }
    },

    prompts: {
        systemPrompt: `You are a specialized purchase order processor. Your task is to extract structured data from purchase order documents with high accuracy. Follow these guidelines:

1. Data Structure:
   - Extract all data according to the exact schema structure
   - Maintain all required fields and relationships
   - Use correct data types for all fields

2. Data Quality Rules:
   - Maintain exact number formats (no rounding)
   - Preserve original text for identifiers
   - Convert all dates to YYYY-MM-DD format
   - Ensure numeric values are actual numbers, not strings

3. Critical Requirements:
   - All required fields must be present and valid
   - Field formats must match specifications
   - Business rules must be satisfied
   - No empty strings or null values for required fields
   - Products array must not be empty

4. Special Instructions:
   - Handle missing data by omitting optional fields
   - Validate all numeric values are positive and reasonable
   - Ensure all identifiers match specified patterns
   - Verify all calculations and totals`,
        
        // Examples will be dynamically generated from test_uploads
        examples: [],

        // Use core schema as output format
        outputFormat: schema
    },

    validation: {
        // Use core schema validation rules
        requiredFields: REQUIRED_FIELDS,
        fieldFormats: FIELD_FORMATS,
        businessRules: BUSINESS_RULES,
        
        // Additional processing-specific validation
        processing: {
            minConfidenceScore: 0.8,
            requireAllFields: true,
            allowPartialExtraction: false
        }
    },

    metrics: {
        enableMonitoring: true,
        samplingRate: 1.0,
        logLevel: 'info',
        performance: {
            maxProcessingTime: 30000,
            maxValidationTime: 5000,
            maxTokenUsage: 4000
        }
    }
};

export default config;