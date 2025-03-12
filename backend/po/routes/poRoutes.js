import express from "express";
import logger from "../../utils/logger.js";
import { bulkOperationHandler } from "../controllers/handlers/bulkOperationHandler.js";
import { searchPOsHandler } from "../controllers/handlers/searchPOsHandler.js";
import { POUploadHandler } from "../controllers/handlers/POUploadHandler.js";
import { MetricsController } from '../controllers/handlers/MetricsController.js';
import { StatusService } from '../../core/status/index.js';
import { metricsService } from '../../core/metrics.js';
import { FileUploadHandler } from "../middleware/handlers/FileUploadHandler.js";
import { FileSystemService } from "../services/FileSystemService.js";

export default async function configureRouter(poService) {
    const router = express.Router();
    const metricsController = new MetricsController(metricsService);
    const statusService = new StatusService();

    // Initialize file upload handler
    const fileSystemService = new FileSystemService();
    const fileUploadHandler = new FileUploadHandler(fileSystemService);

    // PO Management endpoints
    router.post("/upload",
        ...fileUploadHandler.getMiddleware(),
        (req, res, next) => POUploadHandler(req, res, next, poService)
    );
    router.get("/search", (req, res, next) => searchPOsHandler(req, res, next, poService));
    router.post("/bulk-operations", (req, res, next) => bulkOperationHandler(req, res, next, poService));

    // Get a single purchase order by PO number
    router.get("/:poNumber", async (req, res, next) => {
        try {
            const { poNumber } = req.params;
            logger.info(`Fetching purchase order: ${poNumber}`);
            const po = await poService.getPOByNumber(poNumber);
            if (!po) {
                return res.status(404).json({ message: `Purchase order ${poNumber} not found` });
            }
            res.json(po);
        } catch (error) {
            next(error);
        }
    });

    // Add routes for debugging
    router.get("/count", async (req, res, next) => {
        try {
            const count = await poService.getCount();
            res.json({ count });
        } catch (error) {
            next(error);
        }
    });

    router.get("/last", async (req, res, next) => {
        try {
            const lastPO = await poService.getLastPO();
            res.json(lastPO);
        } catch (error) {
            next(error);
        }
    });

    // Status Management endpoints
    router.get('/statuses', async (req, res, next) => {
        try {
            const statuses = await statusService.getStatuses();
            res.json(statuses);
        } catch (error) {
            next(error);
        }
    });

    // Important: This route must come before /statuses/:status to avoid conflicts
    router.get('/statuses/initial', async (req, res, next) => {
        try {
            const initialStatus = await statusService.getInitialStatus();
            res.json(initialStatus);
        } catch (error) {
            next(error);
        }
    });

    router.get('/statuses/:status', async (req, res, next) => {
        try {
            const { status } = req.params;
            const statusData = await statusService.getStatus(status);
            if (!statusData) {
                return res.status(404).json({ message: `Status ${status} not found` });
            }
            res.json(statusData);
        } catch (error) {
            next(error);
        }
    });

    router.get('/statuses/:status/transitions', async (req, res, next) => {
        try {
            const { status } = req.params;
            const availableTransitions = await statusService.getAvailableTransitions(status);
            res.json(availableTransitions);
        } catch (error) {
            next(error);
        }
    });

    router.post('/validateTransition', async (req, res, next) => {
        try {
            const { from, to, data } = req.body;
            const validationResult = await statusService.validateTransition(from, to, data);
            res.json(validationResult);
        } catch (error) {
            next(error);
        }
    });

    router.post('/transition', async (req, res, next) => {
        try {
            const { from, to, options } = req.body;
            const transitionResult = await statusService.transition(from, to, options);
            res.json(transitionResult);
        } catch (error) {
            next(error);
        }
    });

    // Metrics endpoints
    router.get(
        "/metrics",
        metricsController.getMetrics.bind(metricsController)
    );

    router.get(
        "/metrics/detailed",
        metricsController.getDetailedMetrics.bind(metricsController)
    );

    router.get(
        "/metrics/:category",
        metricsController.getCategoryMetrics.bind(metricsController)
    );

    router.post(
        "/metrics",
        express.json(),
        metricsController.getCustomMetrics.bind(metricsController)
    );

    // Centralized error handling middleware (must be last)
    router.use((err, req, res, next) => {
        try {
            const errorResponse = {
                success: false,
                message: err.message || "An unexpected error occurred",
                details: err.details || {},
                timestamp: new Date().toISOString()
            };

            // Add validation errors if present
            if (err.validationErrors) {
                errorResponse.validationErrors = err.validationErrors;
            }

            // Log the error with context
            logger.error("API Error:", {
                error: err.message,
                code: err.code,
                statusCode: err.statusCode,
                validationErrors: err.validationErrors,
                stack: err.stack,
                path: req.path,
                method: req.method
            });

            // Use error's status code or default to 500
            const statusCode = err.statusCode || 500;

            // Send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(statusCode).json(errorResponse);
            }
        } catch (error) {
            // If something goes wrong in our error handler, pass to Express' default error handler
            next(error);
        }
    });

    return router;
}
