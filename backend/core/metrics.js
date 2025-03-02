import logger from "../utils/logger.js";
import { cacheService } from "./cache.js";

/**
 * MetricsService following the documented simple implementation pattern
 * Provides rich business intelligence through four core metric categories
 */
export class MetricsService {
    constructor() {
        this.processingMetrics = new Map(); // Store processing metrics
    }

    /**
     * Record a metric for specific operations
     * @param {string} type - Type of metric (e.g., 'pdf_processing')
     * @param {Object} data - Metric data to record
     */
    async recordMetric(type, data) {
        try {
            const metrics = this.processingMetrics.get(type) || [];
            metrics.push({
                ...data,
                timestamp: data.timestamp || new Date().toISOString()
            });

            // Keep only last 1000 metrics per type
            if (metrics.length > 1000) {
                metrics.shift();
            }

            this.processingMetrics.set(type, metrics);
            logger.info(`Recorded ${type} metric:`, data);
        } catch (error) {
            logger.error(`Error recording ${type} metric:`, error);
            throw error;
        }
    }

    /**
     * Calculate all metrics for the given POs
     * Follows the documented pattern from README.md
     */
    async calculateMetrics(pos, options = {}) {
        try {
            const cacheKey = this._generateCacheKey(pos, options);
            logger.debug("Metrics cache key generated:", { cacheKey });
            const cached = cacheService.get(cacheKey);
            if (cached) {
                logger.info("Using cached metrics result");
                return cached;
            }

            logger.info("Calculating metrics from scratch:", { 
                posCount: pos.length,
                options
            });

            const filteredPOs = this._filterPOsByDate(pos, options);
            logger.info("Filtered POs by date range:", { 
                originalCount: pos.length, 
                filteredCount: filteredPOs.length
            });
            
            if (filteredPOs.length === 0) {
                logger.warn("No POs found in the date range for metrics calculation");
            }

            // Match the documented structure exactly
            const metrics = {
                calendar: await this.calculateCalendarMetrics(filteredPOs),
                financial: await this.calculateFinancialMetrics(filteredPOs),
                operational: await this.calculateOperationalMetrics(filteredPOs),
                product: await this.calculateProductMetrics(filteredPOs)
            };

            // Include processing metrics if available
            if (this.processingMetrics.size > 0) {
                metrics.processing = Object.fromEntries(this.processingMetrics);
            }

            cacheService.set(cacheKey, metrics);
            return metrics;
        } catch (error) {
            logger.error("Error calculating metrics:", error);
            throw error;
        }
    }

    /**
     * Calculate calendar-based metrics
     * - Delivery performance
     * - Volume tracking
     * - Status distribution
     */
    async calculateCalendarMetrics(pos) {
        const delivery = this._calculateDeliveryMetrics(pos);
        const volume = this._calculateVolumeMetrics(pos);
        const status = this._calculateStatusMetrics(pos);

        return {
            delivery,
            volume,
            status
        };
    }

    /**
     * Calculate financial metrics
     * - Sales analysis
     * - Product rankings
     * - Growth trends
     */
    async calculateFinancialMetrics(pos) {
        const sales = this._calculateSalesMetrics(pos);
        const products = this._calculateProductRankings(pos);
        const growth = this._calculateGrowthTrends(pos);

        return {
            sales,
            products,
            growth
        };
    }

    /**
     * Calculate operational metrics
     * - Efficiency tracking
     * - Resource utilization
     */
    async calculateOperationalMetrics(pos) {
        const efficiency = this._calculateEfficiencyMetrics(pos);
        const resources = this._calculateResourceMetrics(pos);

        return {
            efficiency,
            resources
        };
    }

    /**
     * Calculate product-specific metrics
     * - Product rankings
     * - Category analysis
     */
    async calculateProductMetrics(pos) {
        return this._calculateProductRankings(pos);
    }

    _calculateDeliveryMetrics(pos) {
        const total = pos.length;
        const onTime = pos.filter(po => {
            const deliveryDate = new Date(po.header.deliveryInfo.date);
            const actualDate = po.header.deliveryInfo.actualDate 
                ? new Date(po.header.deliveryInfo.actualDate)
                : new Date();
            return deliveryDate >= actualDate;
        }).length;

        return {
            onTime,
            total,
            performance: total > 0 ? (onTime / total) * 100 : 0
        };
    }

    _calculateVolumeMetrics(pos) {
        const dailyVolumes = new Map();
        const weeklyVolumes = new Map();
        const monthlyVolumes = new Map();

        pos.forEach(po => {
            const date = new Date(po.header.orderDate);
            const dayKey = date.toISOString().split('T')[0];
            const weekKey = this._getWeekKey(date);
            const monthKey = this._getMonthKey(date);

            dailyVolumes.set(dayKey, (dailyVolumes.get(dayKey) || 0) + 1);
            weeklyVolumes.set(weekKey, (weeklyVolumes.get(weekKey) || 0) + 1);
            monthlyVolumes.set(monthKey, (monthlyVolumes.get(monthKey) || 0) + 1);
        });

        return {
            daily: Array.from(dailyVolumes.values()),
            weekly: Array.from(weeklyVolumes.values()),
            monthly: Array.from(monthlyVolumes.values())
        };
    }

    _calculateStatusMetrics(pos) {
        const distribution = {};
        const transitions = {};

        pos.forEach(po => {
            const status = po.header.status;
            distribution[status] = (distribution[status] || 0) + 1;

            if (po.statusHistory && po.statusHistory.length > 1) {
                po.statusHistory.forEach((_, index) => {
                    if (index === 0) return;
                    const transition = `${po.statusHistory[index - 1].status}->${po.statusHistory[index].status}`;
                    transitions[transition] = (transitions[transition] || 0) + 1;
                });
            }
        });

        return { distribution, transitions };
    }

    _calculateSalesMetrics(pos) {
        const total = pos.reduce((sum, po) => sum + (po.totalCost || 0), 0);
        const average = pos.length > 0 ? total / pos.length : 0;
        
        const sortedPos = [...pos].sort((a, b) => 
            new Date(b.header.orderDate) - new Date(a.header.orderDate)
        );
        
        const midPoint = Math.floor(sortedPos.length / 2);
        const recentTotal = sortedPos.slice(0, midPoint).reduce((sum, po) => sum + (po.totalCost || 0), 0);
        const previousTotal = sortedPos.slice(midPoint).reduce((sum, po) => sum + (po.totalCost || 0), 0);
        
        const growth = previousTotal > 0 ? ((recentTotal - previousTotal) / previousTotal) * 100 : 0;

        return {
            total,
            average,
            growth
        };
    }

    _calculateProductRankings(pos) {
        const productMap = new Map();
        const categoryMap = new Map();

        pos.forEach(po => {
            po.products.forEach(product => {
                const supc = product.supc;
                const category = product.category;
                const value = product.price * product.quantity;

                if (!productMap.has(supc)) {
                    productMap.set(supc, { supc, sales: 0, volume: 0 });
                }
                const productStats = productMap.get(supc);
                productStats.sales += value;
                productStats.volume += product.quantity;

                if (!categoryMap.has(category)) {
                    categoryMap.set(category, { name: category, value: 0, count: 0 });
                }
                const categoryStats = categoryMap.get(category);
                categoryStats.value += value;
                categoryStats.count += 1;
            });
        });

        return {
            rankings: Array.from(productMap.values())
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 10),
            categories: Array.from(categoryMap.values())
                .sort((a, b) => b.value - a.value)
        };
    }

    _calculateGrowthTrends(pos) {
        const periods = 12;
        const salesTrend = new Array(periods).fill(0);
        const ordersTrend = new Array(periods).fill(0);
        const averageTrend = new Array(periods).fill(0);

        const sortedPos = [...pos].sort((a, b) => 
            new Date(a.header.orderDate) - new Date(b.header.orderDate)
        );

        if (sortedPos.length > 0) {
            const start = new Date(sortedPos[0].header.orderDate);
            const end = new Date(sortedPos[sortedPos.length - 1].header.orderDate);
            const periodLength = (end - start) / periods;

            sortedPos.forEach(po => {
                const date = new Date(po.header.orderDate);
                const periodIndex = Math.min(
                    Math.floor((date - start) / periodLength),
                    periods - 1
                );
                
                salesTrend[periodIndex] += po.totalCost || 0;
                ordersTrend[periodIndex] += 1;
            });

            for (let i = 0; i < periods; i++) {
                averageTrend[i] = ordersTrend[i] > 0 ? salesTrend[i] / ordersTrend[i] : 0;
            }
        }

        return {
            sales: salesTrend,
            orders: ordersTrend,
            average: averageTrend
        };
    }

    _calculateEfficiencyMetrics(pos) {
        let totalProcessingTime = 0;
        let totalWeightAccuracy = 0;
        let totalDeliveryEfficiency = 0;
        let count = 0;

        pos.forEach(po => {
            if (po.processingTime) {
                totalProcessingTime += po.processingTime;
            }

            if (po.weights?.actual && po.weights?.estimated) {
                const accuracy = Math.abs(1 - (po.weights.actual / po.weights.estimated));
                totalWeightAccuracy += accuracy;
            }

            if (po.header.deliveryInfo?.date && po.header.deliveryInfo?.actualDate) {
                const expected = new Date(po.header.deliveryInfo.date);
                const actual = new Date(po.header.deliveryInfo.actualDate);
                const efficiency = Math.abs(1 - ((actual - expected) / (24 * 60 * 60 * 1000)));
                totalDeliveryEfficiency += efficiency;
            }

            count++;
        });

        return {
            processing: count > 0 ? totalProcessingTime / count : 0,
            weights: count > 0 ? totalWeightAccuracy / count : 0,
            delivery: count > 0 ? totalDeliveryEfficiency / count : 0
        };
    }

    _calculateResourceMetrics(pos) {
        const buyers = new Map();
        const locations = new Map();

        pos.forEach(po => {
            const buyer = po.header.buyerInfo.name;
            const location = po.header.syscoLocation.name;

            if (!buyers.has(buyer)) {
                buyers.set(buyer, { orders: 0, value: 0, processingTime: 0 });
            }
            const buyerStats = buyers.get(buyer);
            buyerStats.orders += 1;
            buyerStats.value += po.totalCost || 0;
            buyerStats.processingTime += po.processingTime || 0;

            if (!locations.has(location)) {
                locations.set(location, { orders: 0, value: 0, onTimeDeliveries: 0 });
            }
            const locationStats = locations.get(location);
            locationStats.orders += 1;
            locationStats.value += po.totalCost || 0;
            if (po.header.deliveryInfo?.date && po.header.deliveryInfo?.actualDate) {
                const expected = new Date(po.header.deliveryInfo.date);
                const actual = new Date(po.header.deliveryInfo.actualDate);
                if (actual <= expected) {
                    locationStats.onTimeDeliveries += 1;
                }
            }
        });

        return {
            buyers: {
                active: buyers.size,
                efficiency: Array.from(buyers.values())
                    .reduce((sum, stats) => sum + (stats.processingTime / stats.orders), 0) / buyers.size,
                volume: Array.from(buyers.values())
                    .reduce((sum, stats) => sum + stats.orders, 0) / buyers.size
            },
            locations: {
                active: locations.size,
                throughput: Array.from(locations.values())
                    .reduce((sum, stats) => sum + (stats.value / stats.orders), 0) / locations.size,
                performance: Array.from(locations.values())
                    .reduce((sum, stats) => sum + (stats.onTimeDeliveries / stats.orders), 0) / locations.size
            }
        };
    }

  _filterPOsByDate(pos, { startDate, endDate } = {}) {
    if (!startDate || !endDate) return pos;

    logger.debug("Filtering POs by date range:", { 
        startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
        endDate: endDate instanceof Date ? endDate.toISOString() : endDate
    });

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let filtered;
    try {
        filtered = pos.filter(po => {
            if (!po.header || !po.header.orderDate) {
                logger.warn("PO missing header.orderDate:", { 
                    poNumber: po.header?.poNumber || 'Unknown' 
                });
                return false;
            }
            
            const orderDate = new Date(po.header.orderDate);
            if (isNaN(orderDate.getTime())) {
                logger.warn("Invalid orderDate format:", { 
                    poNumber: po.header.poNumber,
                    orderDate: po.header.orderDate
                });
                return false;
            }
            
            return (!start || orderDate >= start) && (!end || orderDate <= end);
        });
    } catch (error) {
        logger.error("Error filtering POs by date:", {
            error: error.message,
            stack: error.stack
        });
        return [];
    }
    
    logger.debug("Date filtering results:", {
        originalCount: pos.length,
        filteredCount: filtered.length,
        excluded: pos.length - filtered.length
    });
    
    return filtered;
  }

    _generateCacheKey(pos, options) {
        const posIds = pos.map(po => po.header.poNumber).sort().join(',');
        return `metrics:${posIds}:${JSON.stringify(options)}`;
    }

    _getWeekKey(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        return d.toISOString().split('T')[0];
    }

    _getMonthKey(date) {
        return date.toISOString().slice(0, 7);
    }
}

// Export singleton instance
export const metricsService = new MetricsService();