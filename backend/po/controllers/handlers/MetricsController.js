import logger from "../../../utils/logger.js";
import { PORepository } from "../../repositories/PORepository.js";

export class MetricsController {
    constructor(metricsService) {
        if (!metricsService) {
            throw new Error('MetricsService is required');
        }
        this.metricsService = metricsService;
        this.poRepository = new PORepository();
    }

    async getMetrics(req, res) {
        try {
            const { startDate, endDate } = this.parseTimeRange(req.query);
            logger.info("Metrics date range parsed:", { 
                rawStartDate: req.query.startDate, 
                rawEndDate: req.query.endDate,
                parsedStartDate: startDate, 
                parsedEndDate: endDate 
            });
            const { batchSize = 500 } = req.query;

            logger.info("Fetching POs for metrics with params:", { 
                startDate, 
                endDate, 
                batchSize: parseInt(batchSize)
            });
            const pos = await this.poRepository.findByDateRange(
                startDate,
                endDate,
                {},
                parseInt(batchSize)
            );
            logger.info("Retrieved POs for metrics:", { 
                count: pos.data.length,
                firstPODate: pos.data.length > 0 ? pos.data[0].header.orderDate : null,
                lastPODate: pos.data.length > 0 ? pos.data[pos.data.length - 1].header.orderDate : null
            });
            
            logger.info("Calculating metrics with POs data structure:", {
                samplePOFields: pos.data.length > 0 ? Object.keys(pos.data[0]).join(', ') : 'No POs found',
                headerSample: pos.data.length > 0 ? Object.keys(pos.data[0].header).join(', ') : 'No header'
            });
            const result = await this.metricsService.calculateMetrics(
                pos.data,
                { startDate, endDate }
            );

            logger.info("Successfully fetched metrics");

            res.json({
                success: true,
                data: result,
                metadata: {
                    timeRange: { startDate, endDate },
                    queryParams: req.query
                }
            });
        } catch (error) {
            logger.error("Error getting metrics:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Error retrieving metrics"
            });
        }
    }

    async getDetailedMetrics(req, res) {
        try {
            const { startDate, endDate } = this.parseTimeRange(req.query);
            const { filters } = req.query;

            const parsedFilters = this.parseFilters(filters);
            const pos = await this.poRepository.findByDateRange(
                startDate,
                endDate,
                parsedFilters || {}
            );

            const metrics = await this.metricsService.calculateMetrics(
                pos.data,
                { startDate, endDate }
            );

            logger.info("Successfully fetched detailed metrics");

            res.json({
                success: true,
                data: metrics,
                metadata: {
                    timeRange: { startDate, endDate },
                    filters: parsedFilters
                }
            });
        } catch (error) {
            logger.error("Error getting detailed metrics:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Error retrieving detailed metrics"
            });
        }
    }

    async getCategoryMetrics(req, res) {
        try {
            const { category } = req.params;
            const { startDate, endDate } = this.parseTimeRange(req.query);
            
            const pos = await this.poRepository.findByDateRange(
                startDate,
                endDate
            );
            
            const metrics = await this.metricsService.calculateMetrics(
                pos.data,
                { startDate, endDate }
            );
            
            if (!metrics[category]) {
                return res.status(404).json({ success: false, error: `Category '${category}' not found` });
            }
            
            logger.info(`Successfully fetched ${category} metrics`);
            res.json({ success: true, data: metrics[category], category });
        } catch (error) {
            logger.error(`Error getting ${req.params.category} metrics:`, error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getCustomMetrics(req, res) {
        try {
            const { startDate, endDate } = this.parseTimeRange(req.query);
            const customFilters = req.body;
            
            logger.info("Custom metrics request with filters:", customFilters);
            
            // Get POs with custom filters from request body
            const pos = await this.poRepository.findByDateRange(
                startDate,
                endDate,
                customFilters
            );
            
            const metrics = await this.metricsService.calculateMetrics(
                pos.data,
                { startDate, endDate, customFilters }
            );
            
            logger.info("Successfully fetched custom metrics");
            res.json({
                success: true,
                data: metrics,
                metadata: {
                    timeRange: { startDate, endDate },
                    filters: customFilters
                }
            });
        } catch (error) {
            logger.error("Error getting custom metrics:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Error retrieving custom metrics"
            });
        }
    }

    // Helper method to parse time range from query parameters
    parseTimeRange(query) {
        const { startDate, endDate } = query;
        logger.info("Raw time range values:", { startDate, endDate });

        // Default to last 30 days if no dates provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate
            ? new Date(startDate)
            : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        logger.debug("Parsed date objects:", { 
            start: start.toISOString(), 
            end: end.toISOString(),
            startTimestamp: start.getTime(),
            endTimestamp: end.getTime() 
        });

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            logger.error("Invalid date format in parseTimeRange:", { startDate, endDate });
            throw new Error("Invalid date format");
        }

        if (start > end) {
            logger.error("Start date after end date in parseTimeRange:", { 
                start: start.toISOString(), 
                end: end.toISOString() 
            });
            throw new Error("Start date must be before end date");
        }

        logger.info("Final time range values:", { 
            startDate: start.toISOString(), 
            endDate: end.toISOString() 
        });
        return { startDate: start, endDate: end };
    }

    // Helper method to parse filters from query parameters
    parseFilters(filterString) {
        if (!filterString) return null;

        try {
            return typeof filterString === "string"
                ? JSON.parse(filterString)
                : filterString;
        } catch (error) {
            logger.warn("Error parsing filters:", error);
            return null;
        }
    }
}
