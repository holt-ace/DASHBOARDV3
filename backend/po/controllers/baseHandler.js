import POService from "../../po/services/POService.js"; // Corrected import path
import logger from "../../utils/logger.js"; // Import logger - adjust path if necessary

/**
 * Base handler function to reduce code duplication in controllers
 * @param {function} serviceMethod - The POService method to call
 * @param {string} operationName - The name of the operation for logging
 * @param {function} requestHandler - Function to handle request-specific logic and return service method arguments
 */
export const baseHandler = async (
  serviceMethod,
  operationName,
  requestHandler,
) => {
  return async (req, res, next) => {
    try {
      const serviceArgs = await requestHandler(req, res);
      const result = Array.isArray(serviceArgs)
        ? await serviceMethod(...serviceArgs)
        : await serviceMethod(serviceArgs); // Pass as single arg if not array

      logger.info(`${operationName} completed:`, {
        ...serviceArgs, // Log service arguments for context
        resultCount: Array.isArray(result) ? result.length : 1, // Log result count if array
      });

      res.json(result);
    } catch (error) {
      logger.error(`Error in ${operationName}:`, {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  };
};
