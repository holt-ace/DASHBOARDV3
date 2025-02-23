import { validateSchema } from './schema.js';

/**
 * Simple schema validation middleware
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export const validatePO = (req, res, next) => {
    try {
        if (!validateSchema(req.body)) {
            return res.status(400).json({
                error: 'Invalid schema',
                message: 'Request body does not match required schema'
            });
        }

        // Validate product calculations
        const { products, totalCost } = req.body;
        if (Array.isArray(products)) {
            // Check each product's total matches quantity * fobCost
            const invalidProducts = products.filter(product => {
                const calculatedTotal = product.quantity * product.fobCost;
                return Math.abs(calculatedTotal - product.total) > 0.01;
            });

            if (invalidProducts.length > 0) {
                return res.status(400).json({
                    error: 'Invalid product calculations',
                    message: 'Product totals do not match quantity * fobCost',
                    products: invalidProducts.map(p => p.supc)
                });
            }

            // Check total cost matches sum of product totals
            const calculatedTotal = products.reduce((sum, p) => sum + p.total, 0);
            if (Math.abs(calculatedTotal - totalCost) > 0.01) {
                return res.status(400).json({
                    error: 'Invalid total cost',
                    message: 'Total cost does not match sum of product totals'
                });
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Apply middleware to routes
export const applyValidation = (app) => {
    app.post('/po', validatePO);
    app.put('/po/:id', validatePO);
};