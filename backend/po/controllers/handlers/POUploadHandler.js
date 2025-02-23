import config from "../../../config/index.js";
import { ProcessorFactory } from "../../services/PDFProcessor/ProcessorFactory.js";
import logger from "../../../utils/logger.js";
import { validateSchema } from "../../../core/validation/schemaValidator.js";
import { FileSystemService } from "../../services/FileSystemService.js";

// Initialize services
const fileSystemService = new FileSystemService();

// Initialize FileSystemService before exporting
let initialized = false;
const initializeHandler = async () => {
    if (!initialized) {
        await fileSystemService.initialize();
        initialized = true;
    }
};

// Export middleware function
export async function POUploadHandler(req, res, next, poService) {
    // Ensure FileSystemService is initialized
    await initializeHandler();

    let tempFilePath = null;
    let processor = null;
    const startTime = Date.now();

    try {
        // Validate request
        if (!req.file) {
            const error = new Error("No file uploaded");
            error.statusCode = 400;
            return next(error);
        }

        logger.info("Processing upload", {
            filename: req.file.originalname,
            size: req.file.size,
            processor: 'langchain'
        });

        // Store temp file path for cleanup
        tempFilePath = fileSystemService.getFilePath(req.file.originalname);
        
        // Save the uploaded file
        await fileSystemService.saveTemporaryFile(
            req.file.buffer, 
            req.file.originalname
        );

        // Create processor with proper configuration
        processor = await ProcessorFactory.create({
            llm: {
                model: config.pdfProcessor.langchain.model,
                temperature: config.pdfProcessor.langchain.temperature,
                maxTokens: config.pdfProcessor.langchain.maxTokens,
                retryAttempts: 3,
                retryDelay: 1000
            },
            prompts: {
                systemPrompt: 'Extract structured data from purchase order documents...',
                examples: [],
                outputFormat: {
                    header: {
                        poNumber: 'string',
                        ocNumber: 'string',
                        orderDate: 'string',
                        buyerInfo: 'object',
                        syscoLocation: 'object',
                        deliveryInfo: 'object'
                    },
                    products: [{
                        supc: 'string',
                        itemCode: 'string',
                        description: 'string',
                        packSize: 'string',
                        quantity: 'number',
                        fobCost: 'number',
                        total: 'number'
                    }],
                    weights: {
                        grossWeight: 'number',
                        netWeight: 'number'
                    },
                    totalCost: 'number'
                }
            },
            validation: {
                header: {
                    poNumber: { required: true },
                    ocNumber: { required: true },
                    orderDate: { required: true },
                    buyerInfo: { required: true },
                    syscoLocation: { required: true },
                    deliveryInfo: { required: true }
                },
                products: {
                    minItems: 1,
                    itemRules: {
                        supc: { required: true },
                        quantity: { required: true, min: 0 },
                        fobCost: { required: true, min: 0 }
                    }
                }
            }
        });

        // Process the PDF
        const extractedData = await processor.process(tempFilePath);

        // Validate against core schema
        if (!validateSchema(extractedData)) {
            const error = new Error('Extracted data does not match schema structure');
            error.code = 'VALIDATION_ERROR';
            error.validationErrors = ['Data structure does not conform to core schema'];
            throw error;
        }

        // Record processing metrics
        if (config.features.PROCESSOR_METRICS.enabled && poService.metricsService) {
            try {
                await poService.metricsService.recordMetric('pdf_processing', {
                    success: true,
                    duration: Date.now() - startTime,
                    processor: extractedData.processor,
                    fileSize: req.file.size,
                    processingTime: Date.now() - startTime,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error("Failed to record processing metrics:", error);
            }
        }

        // Create PO (schema already validated)
        const result = await poService.createPO(extractedData);

        // Prepare response
        const response = {
            success: true,
            data: result,
            processingTime: Date.now() - startTime
        };

        // Include processing metrics if enabled
        if (config.features.PROCESSOR_METRICS.enabled) {
            response.metrics = {
                processingTime: Date.now() - startTime,
                fileSize: req.file.size
            };
        }

        logger.info("Upload processed successfully", {
            poNumber: result.header.poNumber,
            processor: extractedData.processor,
            processingTime: response.processingTime
        });

        return res.json(response);

    } catch (error) {
        // Record failed processing metrics
        if (config.features.PROCESSOR_METRICS.enabled && poService.metricsService) {
            try {
                await poService.metricsService.recordMetric('pdf_processing', {
                    success: false,
                    duration: Date.now() - startTime,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } catch (metricError) {
                logger.error("Failed to record error metrics:", metricError);
            }
        }

        logger.error("Upload processing failed", {
            error: error.message,
            stack: error.stack,
            filename: req.file?.originalname
        });

        // Pass error to error handling middleware
        return next(error);

    } finally {
        // Cleanup
        try {
            if (tempFilePath) {
                await fileSystemService.deleteTemporaryFile(req.file.originalname);
            }
            if (processor) {
                await processor.cleanup();
            }
        } catch (cleanupError) {
            logger.error("Cleanup error:", cleanupError);
        }
    }
}
