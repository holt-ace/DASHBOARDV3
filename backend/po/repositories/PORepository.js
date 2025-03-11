import logger from "../../utils/logger.js";
import PO from "../models/po.js";

export class PORepository {
  constructor() {
    this.model = PO;
  }

  async initialize() {
    try {
      // Ensure indexes are created
      await this.model.createIndexes();
      logger.info("PORepository initialized");
    } catch (error) {
      logger.error("Error initializing PORepository:", error);
      throw error;
    }
  }

  async findAll(filters = {}, limit = 100, offset = 0) {
    return this.model
      .find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
  }

  async findByNumber(poNumber) {
    return this.model.findOne({ "header.poNumber": poNumber });
  }

  async findByDateRange(
    startDate,
    endDate,
    filters = {},
    batchSize = 500
  ) {
    logger.info("PORepository.findByDateRange called with:", { 
      startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
      endDate: endDate instanceof Date ? endDate.toISOString() : endDate,
      filters,
      batchSize
    });
    
    // Handle string dates in MM/DD/YY format
    let dateFilters = {};
    if (startDate || endDate) {
      logger.info("Creating date filters for both createdAt (Date) and orderDate (string format)");

      // First, we'll filter by createdAt which is a proper Date object
      dateFilters = {
        "createdAt": {}
      };

      if (startDate) {
        dateFilters.createdAt.$gte = startDate;
      }

      if (endDate) {
        dateFilters.createdAt.$lte = endDate;
      }
    }

    const combinedFilters = { ...dateFilters, ...filters };
    logger.debug("Combined filters for query:", combinedFilters);
    
    const options = { batchSize: typeof batchSize === 'number' ? batchSize : 500 };
    logger.debug("Using cursor options:", options);
    
    // Use cursor for efficient streaming of large datasets
    let cursor;
    try {
      cursor = this.model
        .find(combinedFilters)
        .sort({ "header.orderDate": 1 })
        .cursor({ batchSize: options.batchSize });
    } catch (error) {
      logger.error("Error creating MongoDB cursor:", {
        error: error.message,
        filters: combinedFilters
      });
      throw error;
    }
    
    const results = [];
    let count = 0;
    
    // Process documents in batches
    try {
      for await (const doc of cursor) {
        results.push(doc);
        
        // Log the first 3 POs to see their date structure
        if (count < 3) {
          logger.info(`PO document ${count + 1} details:`, {
            poNumber: doc.header?.poNumber,
            createdAt: doc.createdAt,
            orderDate: doc.header?.orderDate,
            orderDateType: typeof doc.header?.orderDate,
            dateObj: doc.header?.orderDate ? new Date(doc.header.orderDate) : null
          });
        }
        
        count++;
      }
      
      // Sample the date range of returned POs
      if (count > 0) {
        const firstPO = results[0];
        const lastPO = results[count - 1];
        logger.info(`Returned POs date range:`, {
          firstPONumber: firstPO.header?.poNumber,
          firstPOOrderDate: firstPO.header?.orderDate,
          lastPONumber: lastPO.header?.poNumber,
          lastPOOrderDate: lastPO.header?.orderDate
        });
      }
      
      logger.info(`Retrieved ${count} POs from database for date range`, {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null
      });
    } catch (error) {
      logger.error("Error processing MongoDB cursor:", {
        error: error.message,
        processedCount: count
      });
      throw error;
    }
    
    return {
      data: results,
      metadata: {
        total: count,
        dateRange: { startDate, endDate },
        filters: combinedFilters
      }
    };
  }

  async create(poData) {
    const po = new this.model(poData);
    return po.save();
  }

  async updateStatus(poNumber, status) {
    const now = new Date().toISOString();
    return this.model.findOneAndUpdate(
      { "header.poNumber": poNumber },
      {
        $set: {
          "header.status": status,
          lastUpdated: now,
        },
      },
      { new: true },
    );
  }

  async update(poNumber, updateData) {
    // Remove _id from updateData if it exists
    if (updateData._id) delete updateData._id;
    
    const now = new Date().toISOString();
    return this.model.findOneAndUpdate(
      { "header.poNumber": poNumber },
      {
        $set: {
          ...updateData,
          lastUpdated: now,
        },
      },
      {
        new: true,
        runValidators: true
      }
    );
  }

  async delete(poNumber) {
    return this.model.findOneAndDelete({ "header.poNumber": poNumber });
  }

  async deleteAll() {
    return this.model.deleteMany({});
  }

  async getDistinctBuyers() {
    return this.model.distinct("header.buyerInfo.name").sort();
  }

  async getDistinctSyscoLocations() {
    return this.model.distinct("header.syscoLocation.name").sort();
  }

  async searchPOs(query, filters = {}, limit = 100, offset = 0) {
    const searchQuery = query
      ? {
          $or: [
            { "header.poNumber": { $regex: this._escapeRegex(query), $options: "i" } },
            {
              "header.buyerInfo.name": {
                $regex: this._escapeRegex(query),
                $options: "i",
              },
            },
            {
              "header.syscoLocation.name": {
                $regex: this._escapeRegex(query),
                $options: "i",
              },
            },
          ],
        }
      : {};

    const combinedFilters = { ...searchQuery, ...filters };

    // Get total count for these filters before applying pagination
    const total = await this.model.countDocuments(combinedFilters);
    
    // Get paginated results
    const results = await this.model
        .find(combinedFilters)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
        
    return {
      data: results,
      metadata: {
        total,
        page: Math.floor(offset / limit) + 1,
        pages: Math.ceil(total / limit)
      }
    };
  }

  _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Aggregation methods for metrics
  async getMetricsByDateRange(startDate, endDate, pipeline = []) {
    return this.model.aggregate([
      {
        $match: {
          "header.orderDate": {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      ...pipeline,
    ]);
  }

  async getStatusDistribution() {
    return this.model.aggregate([
      {
        $group: {
          _id: "$header.status",
          count: { $sum: 1 },
          pos: { $push: "$header.poNumber" },
        },
      },
    ]);
  }

  async getGeographicDistribution() {
    return this.model.aggregate([
      {
        $group: {
          _id: "$header.syscoLocation.name",
          count: { $sum: 1 },
          total: { $sum: "$totalCost" },
        },
      },
    ]);
  }

  async getCategoryBreakdown() {
    return this.model.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.description",
          count: { $sum: 1 },
          total: { $sum: "$products.total" },
        },
      },
    ]);
  }

  async getVolumeTrends(startDate, endDate) {
    return this.model.aggregate([
      {
        $match: {
          "header.orderDate": {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$header.orderDate",
          count: { $sum: 1 },
          total: { $sum: "$totalCost" },
        },
      },
      { $sort: { "_id": 1 } },
    ]);
  }
}

export default PORepository;
