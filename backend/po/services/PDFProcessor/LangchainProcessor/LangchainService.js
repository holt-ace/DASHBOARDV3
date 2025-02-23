import { ChatOpenAI } from '@langchain/openai';
import { LLMError } from '../errors.js';
import { 
    schema,
    REQUIRED_FIELDS,
    FIELD_FORMATS,
    BUSINESS_RULES,
    DEFAULT_VALUES 
} from '../../../../core/schema/index.js';
import fetch from 'node-fetch';

class LangchainService {
    constructor(config) {
        this.model = new ChatOpenAI({
            modelName: config.llm?.model || 'gpt-4',
            temperature: config.llm?.temperature || 0.3,
            maxTokens: config.llm?.maxTokens || 2000,
            maxRetries: 0  // We handle retries at the processor level
        });

        this.systemPrompt = this.buildSystemPrompt();
        this.outputFormat = schema;
        this.callCount = 0;
    }

    buildSystemPrompt() {
        // Build a comprehensive system prompt that includes all schema requirements
        const prompt = [
            'You are a specialized purchase order processor. Extract data according to this exact schema:',
            '',
            'Schema Structure:',
            JSON.stringify(schema, null, 2),
            '',
            'Required Fields:',
            Object.entries(REQUIRED_FIELDS).map(([section, fields]) =>
                `${section}:\n${fields.map(f => `- ${f}`).join('\n')}`
            ).join('\n\n'),
            '',
            'Field Formats:',
            Object.entries(FIELD_FORMATS).map(([field, spec]) =>
                `${field}: ${spec.description} (${spec.format || spec.pattern})`
            ).join('\n'),
            '',
            'Business Rules:',
            Object.entries(BUSINESS_RULES).map(([field, rule]) =>
                `${field}: ${rule.message}`
            ).join('\n'),
            '',
            'Critical Requirements:',
            '1. Dates must be in YYYY-MM-DD format',
            '2. All numeric fields must be numbers, not strings',
            '3. Follow schema structure exactly - no additional or missing fields',
            '4. Use exact field names as specified',
            '5. Apply default values only when data is not present:',
            Object.entries(DEFAULT_VALUES).map(([field, value]) =>
                `   ${field}: ${value}`
            ).join('\n'),
            '',
            'Validation:',
            '1. All required fields must be present',
            '2. Field formats must match specifications',
            '3. Business rules must be satisfied',
            '4. No empty strings or null values for required fields',
            '5. Products array must not be empty'
        ].join('\n');

        return prompt;
    }

    async process(text, options = {}) {
        this.callCount++;
        const prompt = await this.buildStructuredPrompt(text);
        
        try {
            const apiUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
            
            const headers = {
                'Content-Type': 'application/json'
            };
            if (apiUrl.includes("llmproxy")) {
                headers["api-key"] = process.env.OPENAI_API_KEY;
            } else {
                headers["Authorization"] = `Bearer ${process.env.OPENAI_API_KEY}`;
            }
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: this.model?.modelName || 'gpt-4',
                    messages: prompt,
                    temperature: this.model?.temperature || 0.3,
                    max_tokens: this.model?.maxTokens || 2000
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(`API error: ${data.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            const result = { content: data.choices[0].message.content };
            const parsed = this.parseResponse(result);
            
            if (!this.validateStructure(parsed)) {
                throw new LLMError('Response does not match schema structure');
            }

            return parsed;
        } catch (error) {
            if (error instanceof LLMError) {
                throw error;
            }
            throw new LLMError(
                `LLM processing failed: ${error.message}`,
                error.response,
                error.tokenUsage
            );
        }
    }

    async buildStructuredPrompt(text) {
        return [
            { role: "system", content: this.systemPrompt },
            {
                role: "user",
                content: 'Extract data from the following document in valid JSON format matching the schema structure exactly:\n\n' +
                    this.preprocessText(text)
            }
        ];
    }

    preprocessText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\s+/g, ' ')
            .trim();
    }

    parseResponse(response) {
        try {
            const content = response.content;
            const jsonStr = content.trim().replace(/```json\n?|\n?```/g, '');
            return JSON.parse(jsonStr);
        } catch (error) {
            throw new LLMError(`Failed to parse LLM response: ${error.message}\nResponse: ${JSON.stringify(response)}`);
        }
    }

    validateStructure(parsed) {
        if (!parsed || typeof parsed !== 'object') return false;

        // Validate required fields
        for (const [section, fields] of Object.entries(REQUIRED_FIELDS)) {
            if (section === 'root') {
                for (const field of fields) {
                    if (!(field in parsed)) return false;
                }
            } else {
                if (!(section in parsed)) return false;
                for (const field of fields) {
                    const fieldPath = field.split('.');
                    let value = parsed[section];
                    for (const part of fieldPath) {
                        value = value?.[part];
                        if (value === undefined) return false;
                    }
                }
            }
        }

        // Validate field formats
        for (const [field, spec] of Object.entries(FIELD_FORMATS)) {
            const fieldPath = field.split('.');
            let value = parsed;
            for (const part of fieldPath) {
                value = value?.[part];
                if (value === undefined) continue;
            }
            if (value !== undefined) {
                if (spec.pattern && !spec.pattern.test(value)) return false;
                if (spec.format === 'YYYY-MM-DD' && isNaN(Date.parse(value))) return false;
            }
        }

        // Validate business rules
        for (const [field, rule] of Object.entries(BUSINESS_RULES)) {
            const fieldPath = field.split('.');
            let value = parsed;
            for (const part of fieldPath) {
                value = value?.[part];
                if (value === undefined) break;
            }
            if (value !== undefined && !rule.validate(value, parsed)) return false;
        }

        return true;
    }
}

export default LangchainService;
