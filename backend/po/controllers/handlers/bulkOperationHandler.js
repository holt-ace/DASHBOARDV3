import logger from "../../../utils/logger.js";

export const bulkOperationHandler = async (req, res, next, poService) => {
  try {
    const { poNumbers, operation, status } = req.body;
    let result;

    switch (operation) {
      case "status":
        result = await Promise.all(
          poNumbers.map((poNumber) => poService.updateStatus(poNumber, status)),
        );
        break;
      default:
        throw new Error(`Invalid operation: ${operation}`);
    }

    logger.info("Bulk operation completed:", {
      operation,
      count: poNumbers.length,
      status,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
