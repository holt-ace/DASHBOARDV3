import { 
  PurchaseOrder, 
  StatusRequirement, 
  ValidationResult,
  POStatus
} from '@/types/purchaseOrder';
import { ApiService } from './ApiService';

/**
 * ValidationService
 * 
 * A service for validating PO data against status requirements.
 * Provides both client-side validation and integration with backend validation.
 */
export class ValidationService {
  /**
   * Validate PO data against requirements for a specific status
   * 
   * @param poData The purchase order data to validate
   * @param status The status to validate against
   * @param requirements The requirements to check
   * @returns Validation results including errors, warnings, and info messages
   */
  public static validateForStatus(
    poData: Partial<PurchaseOrder>,
    _status: POStatus, // Using underscore to indicate intentionally unused parameter
    requirements?: Record<string, StatusRequirement>
  ): ValidationResult {
    const validationResults: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };
    
    // Skip if no requirements
    if (!requirements) return validationResults;
    
    // Check each requirement
    Object.entries(requirements).forEach(([key, requirement]) => {
      const { level, validate, message } = requirement;
      const isValid = this._executeValidator(validate, poData);
      
      if (!isValid) {
        switch (level) {
          case 'MANDATORY':
            validationResults.isValid = false;
            validationResults.errors.push({
              field: key,
              message: message || `Required: ${key}`
            });
            break;
          case 'RECOMMENDED':
            validationResults.warnings.push({
              field: key,
              message: message || `Recommended: ${key}`
            });
            break;
          case 'OPTIONAL':
            validationResults.info.push({
              field: key,
              message: message || `Optional: ${key}`
            });
            break;
          default:
            break;
        }
      }
    });
    
    return validationResults;
  }
  
  /**
   * Validate a transition between statuses using the backend API
   * 
   * @param from Starting status
   * @param to Target status
   * @param data PO data to validate
   * @returns Promise with validation results
   */
  public static async validateTransition(
    from: POStatus,
    to: POStatus,
    data: Partial<PurchaseOrder>
  ): Promise<ValidationResult> {
    try {
      return await ApiService.validateTransition(from, to, data);
    } catch (error) {
      return {
        isValid: false,
        errors: [{ 
          field: 'status', 
          message: error instanceof Error ? error.message : 'Failed to validate transition' 
        }],
        warnings: [],
        info: []
      };
    }
  }
  
  /**
   * Validate PO data against common rules
   * 
   * @param poData Purchase order data to validate
   * @returns Validation results
   */
  public static validatePOData(poData: Partial<PurchaseOrder>): ValidationResult {
    const validationResults: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };
    
    // Header validation
    if (!poData.header) {
      validationResults.isValid = false;
      validationResults.errors.push({
        field: 'header',
        message: 'Purchase order header is required'
      });
    } else {
      // PO Number validation
      if (!poData.header.poNumber) {
        validationResults.isValid = false;
        validationResults.errors.push({
          field: 'header.poNumber',
          message: 'PO Number is required'
        });
      } else if (!/^\d{6,10}$/.test(poData.header.poNumber)) {
        validationResults.isValid = false;
        validationResults.errors.push({
          field: 'header.poNumber',
          message: 'PO Number must be 6-10 digits'
        });
      }
      
      // Buyer info validation
      if (!poData.header.buyerInfo) {
        validationResults.isValid = false;
        validationResults.errors.push({
          field: 'header.buyerInfo',
          message: 'Buyer information is required'
        });
      } else {
        if (!poData.header.buyerInfo.firstName) {
          validationResults.isValid = false;
          validationResults.errors.push({
            field: 'header.buyerInfo.firstName',
            message: 'Buyer first name is required'
          });
        }
        
        if (!poData.header.buyerInfo.lastName) {
          validationResults.isValid = false;
          validationResults.errors.push({
            field: 'header.buyerInfo.lastName',
            message: 'Buyer last name is required'
          });
        }
        
        if (!poData.header.buyerInfo.email) {
          validationResults.isValid = false;
          validationResults.errors.push({
            field: 'header.buyerInfo.email',
            message: 'Buyer email is required'
          });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(poData.header.buyerInfo.email)) {
          validationResults.isValid = false;
          validationResults.errors.push({
            field: 'header.buyerInfo.email',
            message: 'Please enter a valid email address'
          });
        }
      }
      
      // Location validation
      if (!poData.header.syscoLocation) {
        validationResults.isValid = false;
        validationResults.errors.push({
          field: 'header.syscoLocation',
          message: 'Sysco location is required'
        });
      } else if (!poData.header.syscoLocation.name) {
        validationResults.isValid = false;
        validationResults.errors.push({
          field: 'header.syscoLocation.name',
          message: 'Location name is required'
        });
      }
    }
    
    // Products validation
    if (!poData.products || poData.products.length === 0) {
      validationResults.isValid = false;
      validationResults.errors.push({
        field: 'products',
        message: 'At least one product is required'
      });
    } else {
      poData.products.forEach((product, index) => {
        if (!product.supc) {
          validationResults.isValid = false;
          validationResults.errors.push({
            field: `products[${index}].supc`,
            message: 'SUPC is required for all products'
          });
        }
        
        if (product.quantity <= 0) {
          validationResults.isValid = false;
          validationResults.errors.push({
            field: `products[${index}].quantity`,
            message: 'Quantity must be greater than 0'
          });
        }
        
        if (product.fobCost <= 0) {
          validationResults.isValid = false;
          validationResults.errors.push({
            field: `products[${index}].fobCost`,
            message: 'FOB cost must be greater than 0'
          });
        }
      });
    }
    
    // Weights validation
    if (!poData.weights) {
      validationResults.isValid = false;
      validationResults.errors.push({
        field: 'weights',
        message: 'Weight information is required'
      });
    } else {
      if (poData.weights.grossWeight <= 0) {
        validationResults.isValid = false;
        validationResults.errors.push({
          field: 'weights.grossWeight',
          message: 'Gross weight must be greater than 0'
        });
      }
      
      if (poData.weights.netWeight <= 0) {
        validationResults.isValid = false;
        validationResults.errors.push({
          field: 'weights.netWeight',
          message: 'Net weight must be greater than 0'
        });
      }
      
      if (poData.weights.netWeight > poData.weights.grossWeight) {
        validationResults.isValid = false;
        validationResults.errors.push({
          field: 'weights',
          message: 'Net weight cannot exceed gross weight'
        });
      }
    }
    
    // Total cost validation
    if (!poData.totalCost && poData.totalCost !== 0) {
      validationResults.isValid = false;
      validationResults.errors.push({
        field: 'totalCost',
        message: 'Total cost is required'
      });
    } else if (poData.totalCost < 0) {
      validationResults.isValid = false;
      validationResults.errors.push({
        field: 'totalCost',
        message: 'Total cost cannot be negative'
      });
    }
    
    // Check if total cost matches sum of products
    if (poData.products && poData.products.length > 0 && poData.totalCost != null) {
      const calculatedTotal = poData.products.reduce((sum, product) => sum + (product.total || 0), 0);
      if (Math.abs(calculatedTotal - poData.totalCost) > 0.01) {
        validationResults.warnings.push({
          field: 'totalCost',
          message: 'Total cost does not match sum of product totals'
        });
      }
    }
    
    return validationResults;
  }
  
  /**
   * Execute a validation function safely
   * 
   * @param validator The validation function or expression
   * @param data The data to validate
   * @returns Whether validation was successful
   */
  private static _executeValidator(
    validator: ((data: any) => boolean) | string,
    data: any
  ): boolean {
    // Handle string-based validator functions
    if (typeof validator === 'string') {
      try {
        // Convert string to function (CAUTION: potential security risk in some contexts)
        // This is meant for use with trusted validation rules from the backend
        // eslint-disable-next-line no-new-func
        return new Function('data', `return ${validator}`)(data);
      } catch (error) {
        console.error('Validator execution error:', error);
        return false;
      }
    }
    
    // Handle function validators
    if (typeof validator === 'function') {
      try {
        return validator(data);
      } catch (error) {
        console.error('Validator execution error:', error);
        return false;
      }
    }
    
    // Default to true if validator not recognized
    return true;
  }
}