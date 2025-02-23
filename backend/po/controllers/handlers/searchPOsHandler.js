import logger from "../../../utils/logger.js";

export const searchPOsHandler = async (req, res, next, poService) => {
  try {
    const {
      query,
      startDate,
      endDate,
      status,
      buyer, // This will be the buyer name
      syscoLocation, // This will be the location name
      limit,
      offset,
    } = req.query;

    const pos = await poService.searchPOs({
      query,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      filters: {
        "buyerInfo.name": buyer,
        "syscoLocation.name": syscoLocation
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    logger.info("Search completed:", {
      query,
      filters: { 
        status, 
        buyerInfo: buyer ? { name: buyer } : undefined,
        syscoLocation: syscoLocation ? { name: syscoLocation } : undefined
      },
      resultCount: pos.length,
    });

    res.json(pos);
  } catch (error) {
    next(error);
  }
};
