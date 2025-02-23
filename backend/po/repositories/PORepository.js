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
    options = { batchSize: 500 }
  ) {
    const dateFilters = {
      "header.orderDate": {
        $gte: startDate,
        $lte: endDate,
      },
    };
    const combinedFilters = { ...dateFilters, ...filters };
    
    // Use cursor for efficient streaming of large datasets
    const cursor = this.model
      .find(combinedFilters)
      .sort({ "header.orderDate": 1 })
      .cursor({ batchSize: options.batchSize });
    
    const results = [];
    let count = 0;
    
    // Process documents in batches
    for await (const doc of cursor) {
      results.push(doc);
      count++;
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

    return this.model
      .find(combinedFilters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
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
