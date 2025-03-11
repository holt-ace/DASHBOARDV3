import logger from "../../utils/logger.js";
import { metricsService } from "../../core/metrics.js";
import { PORepository } from "../repositories/PORepository.js";
import { 
    ValidationError, 
    NotFoundError, 
    BusinessRuleError 
} from "../../utils/errorHandler.js";

export class POService {
    constructor() {
        this.poRepository = new PORepository();
        this.metricsService = metricsService;
    }

    async initialize() {
        try {
            await this.poRepository.initialize();
            logger.info("POService initialized successfully");
        } catch (error) {
            logger.error("Error initializing POService:", error);
            throw error;
        }
    }

    async updateMetrics(po) {
        try {
            await this.metricsService.calculateMetrics(
                [po],
                { startDate: po.header.orderDate, endDate: new Date().toISOString() }
            );
        } catch (error) {
            logger.warn("Failed to update metrics:", {
                error: error.message,
                poNumber: po.header.poNumber
            });
        }
    }

    async createPO(data) {
        try {
            const existingPO = await this.poRepository.findByNumber(data.header.poNumber);
            
            if (existingPO) {
                logger.info("PO already exists:", { poNumber: data.header.poNumber });
                return {
                    ...existingPO.toObject(),
                    isExisting: true
                };
            }

            const po = await this.poRepository.create(data);
            await this.updateMetrics(po);

            logger.info("PO created successfully:", {
                poNumber: po.header.poNumber,
                buyerInfo: po.header.buyerInfo,
                syscoLocation: po.header.syscoLocation,
            });

            return po;
        } catch (error) {
            logger.error("Error creating PO:", error);
            throw error;
        }
    }

    async findByPONumber(poNumber) {
        const po = await this.poRepository.findByNumber(poNumber);
        if (!po) {
            throw NotFoundError(`PO not found: ${poNumber}`);
        }
        return po;
    }

    async findPOs(filters = {}) {
        try {
            const {
                limit = 100,
                offset = 0,
                ...queryParams
            } = filters;

            const queryFilters = this.buildQueryFilters(queryParams);
            return await this.poRepository.findAll(queryFilters, limit, offset);
        } catch (error) {
            logger.error("Error finding POs:", error);
            throw error;
        }
    }

    async updatePO(poNumber, updateData) {
        try {
            const existingPO = await this.findByPONumber(poNumber);

            if (!updateData.header?.buyerInfo?.name) {
                throw ValidationError('Buyer name is required');
            }

            if (!updateData.header?.syscoLocation?.name) {
                throw ValidationError('Sysco location is required');
            }

            const updatedPO = await this.poRepository.update(poNumber, updateData);
            await this.updateMetrics(updatedPO);

            logger.info("PO updated successfully:", {
                poNumber: updatedPO.header.poNumber,
                buyerInfo: updatedPO.header.buyerInfo,
                syscoLocation: updatedPO.header.syscoLocation,
            });

            return updatedPO;
        } catch (error) {
            logger.error("Error updating PO:", {
                poNumber,
                error: error.message
            });
            throw error;
        }
    }

    async updateStatus(poNumber, newStatus, notes) {
        try {
            const po = await this.findByPONumber(poNumber);
            const oldStatus = po.header.status;

            const updatedPO = await this.poRepository.updateStatus(poNumber, newStatus);

            if (notes) {
                updatedPO.notes = notes;
                await updatedPO.save();
            }

            await this.updateMetrics(updatedPO);

            logger.info("Status updated successfully:", {
                poNumber,
                oldStatus,
                newStatus,
                buyerInfo: updatedPO.header.buyerInfo,
                syscoLocation: updatedPO.header.syscoLocation,
            });

            return updatedPO;
        } catch (error) {
            logger.error("Error updating status:", error);
            throw error;
        }
    }
    
    async deletePO(poNumber) {
        try {
            const po = await this.findByPONumber(poNumber);
            if (!po) {
                throw NotFoundError(`PO not found: ${poNumber}`);
            }
            
            await this.poRepository.delete(poNumber);
            
            logger.info("PO deleted successfully:", {
                poNumber,
                buyerInfo: po.header.buyerInfo,
                syscoLocation: po.header.syscoLocation,
            });
            
            return { success: true, message: `PO ${poNumber} deleted successfully` };
        } catch (error) {
            logger.error("Error deleting PO:", {
                poNumber,
                error: error.message
            });
            throw error;
        }
    }

    async getBuyers() {
        return await this.poRepository.getDistinctBuyers();
    }

    async getSyscoLocations() {
        return await this.poRepository.getDistinctSyscoLocations();
    }

    async searchPOs(params) {
        try {
            const {
                query,
                limit = 100,
                offset = 0,
                ...filters
            } = params;

            const queryFilters = this.buildQueryFilters(filters);
            const result = await this.poRepository.searchPOs(query, queryFilters, limit, offset);
            
            logger.info("Search completed:", {
                query,
                filters: queryFilters,
                resultCount: result.data.length,
                totalCount: result.metadata.total
            });
            return result;
        } catch (error) {
            logger.error("Error searching POs:", error);
            throw error;
        }
    }

    buildQueryFilters({ startDate, endDate, buyer, syscoLocation, status }) {
        const filters = {};
        
        if (startDate && endDate) {
            filters.createdAt = { $gte: startDate, $lte: endDate };
        }
        if (buyer) {
            filters["header.buyerInfo.name"] = buyer;
        }
        if (syscoLocation) {
            filters["header.syscoLocation.name"] = syscoLocation;
        }
        if (status) {
            filters["header.status"] = status;
        }

        return filters;
    }

    async getCount() {
        try {
            const count = await this.poRepository.model.countDocuments();
            logger.info("PO count retrieved:", { count });
            return count;
        } catch (error) {
            logger.error("Error getting PO count:", error);
            throw error;
        }
    }

    async getLastPO() {
        try {
            const lastPO = await this.poRepository.model.findOne().sort({ createdAt: -1 });
            logger.info("Last PO retrieved:", {
                poNumber: lastPO?.header?.poNumber,
                createdAt: lastPO?.createdAt
            });
            return lastPO;
        } catch (error) {
            logger.error("Error getting last PO:", error);
            throw error;
        }
    }
}

// Export singleton instance
export default new POService();
