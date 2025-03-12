import logger from "../../../utils/logger.js";

export const searchPOsHandler = async (req, res, next, poService) => {
  try {
    logger.info("searchPOsHandler: Request received", {
      query: req.query,
      url: req.url,
      method: req.method
    });
    
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

    logger.debug("searchPOsHandler: Parsed request parameters", {
      query,
      startDate,
      endDate,
      status,
      buyer,
      syscoLocation,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Validate date parameters
    if (startDate) {
      const parsedStartDate = new Date(startDate);
      logger.debug("searchPOsHandler: Parsed startDate", {
        raw: startDate,
        parsed: parsedStartDate,
        isValid: !isNaN(parsedStartDate.getTime())
      });
    }
    
    if (endDate) {
      const parsedEndDate = new Date(endDate);
      logger.debug("searchPOsHandler: Parsed endDate", {
        raw: endDate,
        parsed: parsedEndDate,
        isValid: !isNaN(parsedEndDate.getTime())
      });
    }

    const result = await poService.searchPOs({
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

    const pos = result.data;
    
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
          orderDateObjISO: po.header?.orderDate ? new Date(po.header.orderDate).toISOString() : null,
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
      totalCount: result.metadata.total,
    });

    res.json(result);
  } catch (error) {
    logger.error("searchPOsHandler: Error searching POs", {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    
    // Provide a more detailed error response
    res.status(500).json({
      success: false,
      error: "Failed to search purchase orders",
      message: error.message,
      code: error.code || "SEARCH_ERROR"
    });
    
    next(error);
  }
};
