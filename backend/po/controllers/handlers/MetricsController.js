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
            const { batchSize = 500 } = req.query;

            const pos = await this.poRepository.findByDateRange(
                startDate,
                endDate,
                {},
                parseInt(batchSize)
            );
            
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

    // Helper method to parse time range from query parameters
    parseTimeRange(query) {
        const { startDate, endDate } = query;

        // Default to last 30 days if no dates provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate
            ? new Date(startDate)
            : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error("Invalid date format");
        }

        if (start > end) {
            throw new Error("Start date must be before end date");
        }

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
