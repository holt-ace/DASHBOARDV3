import { ValidationError } from '../errors.js';
import { validateSchema } from '../../../../core/validation/schemaValidator.js';

class ValidationHelper {
    constructor() {
        // Using core schema validation directly
    }

    async validate(data) {
        try {
            const validationResult = validateSchema(data, {
                strict: true,
                requiredFields: [
                    'header.poNumber',
                    'header.buyerInfo',
                    'header.syscoLocation',
                    'products',
                    'weights',
                    'totalCost'
                ]
            });

            return {
                isValid: validationResult.isValid,
                errors: validationResult.errors?.map(err => err.message) || []
            };

        } catch (error) {
            throw new ValidationError('Validation failed', [error.message]);
        }
    }
}

export default ValidationHelper;