import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import FeatureManager from './features.js';

/* global process */ // Tell ESLint that 'process' is a global object

// Load environment variables from .env file
dotenvConfig();

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load feature flags
const featureFlags = FeatureManager.getAllFeatures();

// Core configuration
const config = {
    // Server settings
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        env: process.env.NODE_ENV || 'development'
    },

    // Database settings
    database: {
        uri: process.env.MONGODB_URI,
        options: {}
    },

    // PDF processor settings
    pdfProcessor: {
        langchain: {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.LANGCHAIN_MODEL || 'gpt-4',
            temperature: parseFloat(process.env.LANGCHAIN_TEMP || '0.3'),
            maxTokens: parseInt(process.env.LANGCHAIN_MAX_TOKENS || '2000', 10),
            timeout: parseInt(process.env.LANGCHAIN_TIMEOUT || '30000', 10),
            configuration: {
                baseURL: "https://api.llmproxy.dev/v1",
                defaultHeaders: {
                    "api-key": process.env.OPENAI_API_KEY
                }
            }
        }
    },

    // Metrics settings
    metrics: {
        calculationInterval: 60000, // 60 seconds
        historyRetention: 86400000 * 7 // 7 days in milliseconds
    },

    // File upload settings
    upload: {
        directory: join(__dirname, '../temp-uploads'),
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['application/pdf']
    },

    // Feature flags
    features: featureFlags,

    // CORS settings
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },

    // Test settings
    test: {
        integration: {
            enabled: process.env.TEST_INTEGRATION_ENABLED === 'true',
            baseURL: process.env.TEST_INTEGRATION_BASE_URL || 'http://localhost:3000'
        }
    }
};

const validateFeatures = () => {
  const issues = [];

  // Example: Check if a required feature has its dependencies enabled
  // if (config.features.advancedSearch && !config.features.search) {
  //   issues.push('Advanced search requires the basic search feature to be enabled.');
  // }

  return issues;
};

// Log configuration issues
const validationIssues = validateFeatures();
if (validationIssues.length > 0) {
  console.warn('Configuration issues detected:', validationIssues);
}

export default config;
