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

    // Sample first few PO documents to inspect date structure
    if (pos.length > 0) {
      const sample = pos.slice(0, Math.min(3, pos.length));
      sample.forEach((po, index) => {
        logger.info(`Sample PO ${index + 1} data:`, {
          poNumber: po.header?.poNumber,
          createdAt: po.createdAt,
          orderDate: po.header?.orderDate,
          hasOrderDate: !!po.header?.orderDate,
          orderDateType: typeof po.header?.orderDate,
          orderDateObj: po.header?.orderDate ? new Date(po.header.orderDate) : null,
          orderDateObjISO: po.header?.orderDate ? new Date(po.header.orderDate).toISOString() : null
        });
      });
    }

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
