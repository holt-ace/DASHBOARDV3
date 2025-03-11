import React from 'react';
import { ValidationResult, PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { ValidationService } from '@/services/ValidationService';

/**
 * Props for the RequirementsChecklist component
 */
interface RequirementsChecklistProps {
  poData: Partial<PurchaseOrder>;
  status: POStatus;
  requirements?: Record<string, any>;
  validationResult?: ValidationResult;
  className?: string;
}

/**
 * RequirementsChecklist Component
 * 
 * Displays a checklist of requirements for a particular status,
 * showing which requirements are satisfied and which are not.
 * 
 * Includes a progress bar for visual feedback on completion status.
 */
export const RequirementsChecklist: React.FC<RequirementsChecklistProps> = ({
  poData,
  status,
  requirements,
  validationResult: propValidationResult,
  className = ''
}) => {
  // Use provided validation result or generate one if not provided
  const validationResults = propValidationResult || 
    ValidationService.validateForStatus(poData, status, requirements);
  
  // Count total requirements and satisfied ones
  const totalRequirements = 
    validationResults.errors.length + 
    validationResults.warnings.length + 
    validationResults.info.length +
    // Count the items that passed validation
    (Object.keys(requirements || {}).length - 
      (validationResults.errors.length + 
       validationResults.warnings.length + 
       validationResults.info.length));
  
  const satisfiedRequirements = totalRequirements - 
    validationResults.errors.length;
  
  const completionPercentage = 
    totalRequirements > 0 
      ? Math.round((satisfiedRequirements / totalRequirements) * 100) 
      : 100;
  
  // If no requirements or validation errors, show a success message
  if (totalRequirements === 0) {
    return (
      <div className={`requirements-checklist ${className}`}>
        <div className="alert alert-success mb-0">
          <i className="bi bi-check-circle-fill me-2"></i>
          No specific requirements for this status.
        </div>
      </div>
    );
  }
  
  return (
    <div className={`requirements-checklist ${className}`}>
      <h4 className="requirements-checklist__title mb-2">Requirements for {status}</h4>
      
      {/* Progress bar showing completion percentage */}
      <div className="progress mb-3">
        <div 
          className={`progress-bar ${completionPercentage < 100 ? 'bg-primary' : 'bg-success'}`}
          role="progressbar" 
          style={{ width: `${completionPercentage}%` }}
          aria-valuenow={completionPercentage} 
          aria-valuemin={0} 
          aria-valuemax={100}
        >
          {completionPercentage}%
        </div>
      </div>
      
      {/* List of requirements with their status */}
      <div className="requirements-checklist__items">
        {/* Error items (mandatory requirements not met) */}
        {validationResults.errors.map((error, index) => (
          <div key={`error-${index}`} className="list-group-item list-group-item-danger d-flex align-items-center">
            <i className="bi bi-x-circle-fill me-2"></i>
            <div>
              <strong>{error.field}:</strong> {error.message}
            </div>
          </div>
        ))}
        
        {/* Warning items (recommended requirements not met) */}
        {validationResults.warnings.map((warning, index) => (
          <div key={`warning-${index}`} className="list-group-item list-group-item-warning d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>
              <strong>{warning.field}:</strong> {warning.message}
            </div>
          </div>
        ))}
        
        {/* Info items (optional requirements not met) */}
        {validationResults.info.map((info, index) => (
          <div key={`info-${index}`} className="list-group-item list-group-item-info d-flex align-items-center">
            <i className="bi bi-info-circle-fill me-2"></i>
            <div>
              <strong>{info.field}:</strong> {info.message}
            </div>
          </div>
        ))}
      </div>
      
      {/* Show overall status */}
      {validationResults.isValid ? (
        validationResults.warnings.length > 0 ? (
          <div className="alert alert-warning mt-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            All mandatory requirements met, but there are some recommendations to consider.
          </div>
        ) : (
          <div className="alert alert-success mt-3">
            <i className="bi bi-check-circle-fill me-2"></i>
            All requirements met! Ready to proceed.
          </div>
        )
      ) : (
        <div className="alert alert-danger mt-3">
          <i className="bi bi-x-circle-fill me-2"></i>
          Cannot proceed until all mandatory requirements are met.
        </div>
      )}
    </div>
  );
};

export default RequirementsChecklist;