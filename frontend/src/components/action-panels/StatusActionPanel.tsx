import React, { useState, useEffect } from 'react';
import { 
  PurchaseOrder, 
  POStatus, 
  StatusDefinition, 
  StatusRequirement, 
  ValidationResult 
} from '@/types/purchaseOrder';
import { ApiService } from '@/services/ApiService';
import { ValidationService } from '@/services/ValidationService';
import { RequirementsChecklist } from '@/components/validations/RequirementsChecklist';

// Import status-specific panels
import UploadedStatusPanel from './status-panels/UploadedStatusPanel';
import ConfirmedStatusPanel from './status-panels/ConfirmedStatusPanel';
import ShippedStatusPanel from './status-panels/ShippedStatusPanel';
import InvoicedStatusPanel from './status-panels/InvoicedStatusPanel';
import DeliveredStatusPanel from './status-panels/DeliveredStatusPanel';
import CancelledStatusPanel from './status-panels/CancelledStatusPanel';

/**
 * Props for StatusActionPanel component
 */
interface StatusActionPanelProps {
  po: PurchaseOrder;
  onUpdate: (updateData: Partial<PurchaseOrder>) => Promise<void>;
  onStatusChange: (newStatus: POStatus, notes?: string) => Promise<void>;
  className?: string;
}

/**
 * StatusActionPanel Component
 * 
 * A dynamic panel that renders different action interfaces based on the current
 * status of a purchase order. This component adapts to show only the relevant
 * actions and fields for each status, streamlining the user experience.
 * 
 * It fetches status requirements from the API and provides validation feedback
 * for status transitions, ensuring data integrity throughout the PO lifecycle.
 */
export const StatusActionPanel: React.FC<StatusActionPanelProps> = ({
  po,
  onUpdate,
  onStatusChange,
  className = ''
}) => {
  // State to hold the status definition and requirements
  const [statusDefinition, setStatusDefinition] = useState<StatusDefinition | null>(null);
  const [requirements, setRequirements] = useState<Record<string, StatusRequirement> | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch status requirements on mount and when status changes
  useEffect(() => {
    const fetchStatusRequirements = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const statusData = await ApiService.getStatus(po.header.status);
        setStatusDefinition(statusData);
        setRequirements(statusData.requirements);
        
        // Validate PO data against requirements
        const validation = ValidationService.validateForStatus(
          po,
          po.header.status,
          statusData.requirements
        );
        setValidationResult(validation);
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load status requirements');
        setLoading(false);
      }
    };
    
    fetchStatusRequirements();
  }, [po, po.header.status]);
  
  /**
   * Handle status change with validation
   */
  const handleStatusChange = async (newStatus: POStatus, notes: string = '') => {
    try {
      // Validate the transition first
      const validationResult = await ValidationService.validateTransition(
        po.header.status,
        newStatus,
        po
      );
      
      if (!validationResult.isValid) {
        // Show validation errors
        setValidationResult(validationResult);
        return;
      }
      
      // If valid, perform the status change
      await onStatusChange(newStatus, notes);
    } catch (error) {
      console.error('Error changing status:', error);
      setError(error instanceof Error ? error.message : 'Failed to change status');
    }
  };
  
  /**
   * Determine the background color based on status
   */
  const getStatusColor = (status: POStatus): string => {
    const colorMap: Record<string, string> = {
      [POStatus.UPLOADED]: 'bg-status-uploaded',
      [POStatus.CONFIRMED]: 'bg-status-confirmed',
      [POStatus.SHIPPED]: 'bg-status-shipped',
      [POStatus.INVOICED]: 'bg-status-invoiced',
      [POStatus.DELIVERED]: 'bg-status-delivered',
      [POStatus.CANCELLED]: 'bg-status-cancelled'
    };
    return colorMap[status] || 'bg-light';
  };
  
  /**
   * Render loading state
   */
  const renderLoading = () => (
    <div className="status-action-panel__loading p-4 text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading status actions...</span>
      </div>
      <p className="mt-3">Loading action panel...</p>
    </div>
  );
  
  /**
   * Render error state
   */
  const renderError = () => (
    <div className="status-action-panel__error p-4">
      <div className="alert alert-danger mb-0">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {error}
      </div>
    </div>
  );
  
  /**
   * Render the appropriate panel based on current status
   */
  const renderStatusPanel = () => {
    if (!statusDefinition || !requirements) return null;
    
    const panelProps = {
      po,
      statusDefinition,
      requirements,
      validationResult,
      onUpdate,
      onStatusChange: handleStatusChange
    };
    
    switch (po.header.status) {
      case POStatus.UPLOADED:
        return <UploadedStatusPanel {...panelProps} />;
      case POStatus.CONFIRMED:
        return <ConfirmedStatusPanel {...panelProps} />;
      case POStatus.SHIPPED:
        return <ShippedStatusPanel {...panelProps} />;
      case POStatus.INVOICED:
        return <InvoicedStatusPanel {...panelProps} />;
      case POStatus.DELIVERED:
        return <DeliveredStatusPanel {...panelProps} />;
      case POStatus.CANCELLED:
        return <CancelledStatusPanel {...panelProps} />;
      default:
        return (
          <div className="alert alert-warning">
            Unknown status: {po.header.status}
          </div>
        );
    }
  };
  
  return (
    <div className={`status-action-panel ${className}`}>
      {/* Panel header */}
      <div className={`status-action-panel__header p-3 ${getStatusColor(po.header.status)}`}>
        <h3 className="m-0 text-white">
          <i className="bi bi-clipboard-check me-2"></i>
          Actions for {statusDefinition?.label || po.header.status}
        </h3>
      </div>
      
      {/* Panel content */}
      <div className="status-action-panel__body p-3">
        {loading && renderLoading()}
        {error && renderError()}
        {!loading && !error && (
          <>
            {/* Requirements checklist */}
            {requirements && (
              <RequirementsChecklist
                poData={po}
                status={po.header.status}
                requirements={requirements}
                validationResult={validationResult || undefined}
                className="mb-4"
              />
            )}
            
            {/* Status-specific panel */}
            {renderStatusPanel()}
          </>
        )}
      </div>
    </div>
  );
};

export default StatusActionPanel;