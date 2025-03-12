import { Router } from "express";
import config from "../../config/index.js"; 
import poService from "../services/POService.js";
import logger from "../../utils/logger.js";
import { searchPOsHandler } from "./handlers/searchPOsHandler.js";
import { bulkOperationHandler } from "./handlers/bulkOperationHandler.js";
import { StatusService } from '../../core/status/index.js';

const router = Router();
const statusService = new StatusService();

/**
 * Create PO endpoint
 */
router.post("/", async (req, res, next) => {
  try {
    const newPO = await poService.createPO(req.body);
    res.status(201).json({
      success: true,
      data: newPO
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create metrics endpoint
 */
router.post("/metrics", async (req, res, next) => {
  try {
    const { summary, metrics } = req.body;
    logger.info("Metrics received:", { 
      summary,
      processingMetrics: metrics
    });

    // Store metrics in memory for now
    // TODO: Implement proper metrics storage
    res.json({
      success: true,
      message: 'Metrics received'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Calendar view data endpoint
 */
router.get(
  "/calendar", 
  async (req, res, next) => {
    try {
      const {
        startDate,
        endDate,
        viewType,
        buyer,
        syscoLocation,
      } = req.query;

      const data = await poService.getCalendarViewData({
        startDate,
        endDate,
        viewType,
        buyer,
        syscoLocation,
      });

      logger.info("Calendar data fetched:", {
        dateRange: `${startDate} to ${endDate}`,
        buyerInfo: { name: buyer },
        syscoLocation: { name: syscoLocation },
      });

      res.json(data);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Search POs endpoint
 */
router.get("/search", (req, res, next) => searchPOsHandler(req, res, next, poService));

/**
 * Get unique buyers endpoint
 */
router.get("/buyers", async (req, res, next) => {
  try {
    const buyers = await poService.getBuyers();

    logger.info("Buyers fetched:", {
      count: buyers.length,
    });

    res.json(buyers);
  } catch (error) {
    next(error);
  }
});

/**
 * Get unique Sysco locations endpoint
 */
router.get("/locations", async (req, res, next) => {
  try {
    const locations = await poService.getSyscoLocations();

    logger.info("Locations fetched:", {
      count: locations.length,
    });

    res.json(locations);
  } catch (error) {
    next(error);
  }
});

/**
 * Get database stats
 */
router.get("/stats", async (req, res, next) => {
  try {
    const count = await poService.getCount();
    const lastPO = await poService.getLastPO();

    res.json({
      totalPOs: count,
      lastPO: lastPO ? {
        poNumber: lastPO.header.poNumber,
        createdAt: lastPO.createdAt,
        status: lastPO.header.status
      } : null,
      databaseConnected: true
    });
  } catch (error) {
    next(error);
  }
});

/* === STATUS MANAGEMENT ENDPOINTS === */
/**
 * Get all statuses
 */
router.get('/statuses', async (req, res, next) => {
  try {
    logger.info('Fetching all statuses');
    const statuses = await statusService.getStatuses();
    res.json(statuses);
  } catch (error) {
    logger.error('Error fetching statuses:', error);
    next(error);
  }
});

/**
 * Get initial status
 */
router.get('/statuses/initial', async (req, res, next) => {
  try {
    logger.info('Fetching initial status');
    const initialStatus = await statusService.getInitialStatus();
    res.json(initialStatus);
  } catch (error) {
    logger.error('Error fetching initial status:', error);
    next(error);
  }
});

/**
 * Get status workflow configuration
 */
router.get("/status/workflow", async (req, res, next) => {
  try {
    res.json(config.statusWorkflow);
  } catch (error) {
    logger.error("Error fetching status workflow:", {
      error: error.message,
    });
    next(error);
  }
});

/**
 * Get specific status
 */
router.get('/statuses/:status', async (req, res, next) => {
  try {
    const { status } = req.params;
    logger.info(`Fetching status: ${status}`);
    const statusData = await statusService.getStatus(status);
    if (!statusData) {
      return res.status(404).json({ message: `Status ${status} not found` });
    }
    res.json(statusData);
  } catch (error) {
    logger.error(`Error fetching status ${req.params.status}:`, error);
    next(error);
  }
});

/**
 * Get available transitions for a status
 */
router.get('/statuses/:status/transitions', async (req, res, next) => {
  try {
    const { status } = req.params;
    logger.info(`Fetching transitions for status: ${status}`);
    const availableTransitions = await statusService.getAvailableTransitions(status);
    res.json(availableTransitions);
  } catch (error) {
    logger.error(`Error fetching transitions for status ${req.params.status}:`, error);
    next(error);
  }
});

/**
 * Validate status transition
 */
router.post('/validateTransition', async (req, res, next) => {
  try {
    const { from, to, data } = req.body;
    logger.info(`Validating transition from ${from} to ${to}`);
    const validationResult = await statusService.validateTransition(from, to, data);
    res.json(validationResult);
  } catch (error) {
    logger.error('Error validating transition:', error);
    next(error);
  }
});

/**
 * Execute status transition
 */
router.post('/transition', async (req, res, next) => {
  try {
    const { from, to, options } = req.body;
    logger.info(`Executing transition from ${from} to ${to}`);
    const transitionResult = await statusService.transition(from, to, options);
    res.json(transitionResult);
  } catch (error) {
    logger.error('Error executing transition:', error);
    next(error);
  }
});

/**
 * Get PO by number endpoint
 */
router.get("/:poNumber", async (req, res, next) => {
  try {
    const po = await poService.findByPONumber(req.params.poNumber);

    logger.info("PO fetched:", {
      poNumber: po.header.poNumber,
      buyerInfo: po.header.buyerInfo,
      syscoLocation: po.header.syscoLocation,
    });

    res.json(po);
  } catch (error) {
    next(error);
  }
});

/**
 * Update PO status endpoint
 */
router.patch("/:poNumber/status", async (req, res, next) => {
  try {
    const { poNumber } = req.params;
    const { status, notes } = req.body;
    
    const updatedPO = await poService.updateStatus(poNumber, status, notes);
    
    logger.info("Status updated successfully:", {
      poNumber, oldStatus: req.body.oldStatus, newStatus: status
    });
    
    res.json({ success: true, data: updatedPO });
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk operations endpoint
 */
router.post(
  "/bulk",
  bulkOperationHandler
);

/**
 * Update PO details endpoint
 */
router.put("/:poNumber", async (req, res, next) => {
  try {
    const updatedPO = await poService.updatePO(req.params.poNumber, req.body);

    logger.info("PO updated:", {
      poNumber: updatedPO.header.poNumber,
      buyerInfo: updatedPO.header.buyerInfo,
      syscoLocation: updatedPO.header.syscoLocation,
    });

    res.json({
      success: true,
      data: updatedPO,
    });
  } catch (error) {
    logger.error("Error updating PO:", {
      poNumber: req.params.poNumber,
      error: error.message,
    });

    // Handle specific error cases
    if (error.message.includes('PO not found')) {
      res.status(404).json({
        success: false,
        error: 'Purchase Order Not Found',
        details: `No purchase order found with number: ${req.params.poNumber}. Please verify the PO number and try again.`
      });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: 'The provided data is invalid. Please check your input and try again.',
        validationErrors: Object.values(error.errors).map(err => err.message)
      });
    } else {
      next(error);
    }
  }
});

/**
 * Delete PO endpoint
 */
router.delete("/:poNumber", async (req, res, next) => {
  try {
    const result = await poService.deletePO(req.params.poNumber);
    
    logger.info("PO deleted:", {
      poNumber: req.params.poNumber
    });
    
    res.json(result);
  } catch (error) {
    logger.error("Error deleting PO:", {
      poNumber: req.params.poNumber,
      error: error.message
    });
    
    if (error.message.includes('PO not found')) {
      res.status(404).json({
        success: false,
        error: 'Purchase Order Not Found',
        details: `No purchase order found with number: ${req.params.poNumber}. Please verify the PO number and try again.`
      });
    } else {
      next(error);
    }
  }
});


export default router;
