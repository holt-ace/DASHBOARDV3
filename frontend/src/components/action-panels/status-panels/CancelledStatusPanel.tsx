import React, { useState } from 'react';
import { 
  PurchaseOrder, 
  POStatus, 
  StatusDefinition, 
  StatusRequirement, 
  ValidationResult 
} from '@/types/purchaseOrder';
import { Card, Alert, Badge, Button, Row, Col, ListGroup } from 'react-bootstrap';
import { format } from 'date-fns';

/**
 * Props for the CancelledStatusPanel component
 */
interface CancelledStatusPanelProps {
  po: PurchaseOrder;
  statusDefinition: StatusDefinition;
  requirements: Record<string, StatusRequirement>;
  validationResult: ValidationResult | null;
  onUpdate: (updateData: Partial<PurchaseOrder>) => Promise<void>;
  onStatusChange: (newStatus: POStatus, notes?: string) => Promise<void>;
}

/**
 * CancelledStatusPanel Component
 * 
 * This panel is displayed when a PO is in the CANCELLED status.
 * It shows cancellation details and reason, and offers options to
 * reactivate the order if applicable.
 */
const CancelledStatusPanel: React.FC<CancelledStatusPanelProps> = ({
  po,
  // statusDefinition might be used in future updates, commented out for now
  // Removed other unused props from destructuring
  onStatusChange
}) => {
  // State for reactivation
  const [isReactivating, setIsReactivating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  /**
   * Format a date for display
   */
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch (e) {
      return dateStr;
    }
  };
  
  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  /**
   * Get the cancellation details from the PO history
   */
  const getCancellationDetails = () => {
    if (!po.history) return null;
    
    const cancellationEvent = po.history.find(
      entry => entry.status === POStatus.CANCELLED
    );
    
    if (!cancellationEvent) return null;
    
    return {
      date: cancellationEvent.timestamp,
      user: cancellationEvent.user,
      notes: cancellationEvent.notes
    };
  };
  
  /**
   * Determine if the PO can be reactivated based on its state
   */
  const canReactivate = () => {
    // Check if the PO can be reactivated based on business rules
    // This could depend on how long it's been cancelled, whether it's been replaced, etc.
    
    // For this example, we'll consider any PO cancelled less than 30 days ago as reactivatable
    const cancellationDetails = getCancellationDetails();
    if (!cancellationDetails) return false;
    
    const cancellationDate = new Date(cancellationDetails.date);
    const today = new Date();
    const daysSinceCancellation = Math.floor((today.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceCancellation < 30;
  };
  
  /**
   * Handle PO reactivation
   */
  const handleReactivate = async () => {
    // In a real app, you might want to prompt for confirmation and reason
    try {
      setIsReactivating(true);
      setError(null);
      
      // Determine which status to reactivate to
      // This would typically be based on where the PO was in the workflow when it was cancelled
      // For this example, we'll reactivate to UPLOADED status
      const reactivationStatus = POStatus.UPLOADED;
      
      // Update status
      await onStatusChange(reactivationStatus, 'Order reactivated from cancelled state');
      
      setSuccess('Purchase Order reactivated successfully');
      setIsReactivating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate purchase order');
      setIsReactivating(false);
    }
  };
  
  // Get cancellation details
  const cancellationDetails = getCancellationDetails();
  
  return (
    <div className="cancelled-status-panel">
      {/* Error alert */}
      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}
      
      {/* Success alert */}
      {success && (
        <Alert variant="success" className="mb-4" onClose={() => setSuccess(null)} dismissible>
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
        </Alert>
      )}
      
      {/* Cancellation Banner */}
      <Alert variant="danger" className="d-flex align-items-center mb-4">
        <div className="display-6 me-3">
          <i className="bi bi-x-circle"></i>
        </div>
        <div>
          <h4 className="alert-heading mb-1">This Purchase Order has been cancelled</h4>
          <p className="mb-0">
            {cancellationDetails ? (
              <>Cancelled on {formatDate(cancellationDetails.date)}</>
            ) : (
              <>Cancellation date not available</>
            )}
            {cancellationDetails?.user && (
              <> by {cancellationDetails.user}</>
            )}
          </p>
        </div>
      </Alert>
      
      {/* Cancellation Details */}
      <Card className="mb-4">
        <Card.Header className="bg-status-cancelled-light">
          <h5 className="mb-0">
            <i className="bi bi-info-circle me-2"></i>
            Cancellation Details
          </h5>
        </Card.Header>
        
        <Card.Body>
          {cancellationDetails?.notes ? (
            <div>
              <h6>Cancellation Reason</h6>
              <div className="border p-3 rounded bg-light mb-4">
                {cancellationDetails.notes}
              </div>
            </div>
          ) : (
            <Alert variant="info" className="mb-4">
              No cancellation reason provided.
            </Alert>
          )}
          
          {canReactivate() && (
            <div className="mt-3">
              <h6>Reactivation Options</h6>
              <p className="text-muted">
                This order was cancelled recently and can be reactivated if needed.
              </p>
              <Button
                variant="outline-primary"
                onClick={handleReactivate}
                disabled={isReactivating}
              >
                {isReactivating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-counterclockwise me-2"></i>
                    Reactivate Order
                  </>
                )}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Order Summary */}
      <Card className="mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">
            <i className="bi bi-clipboard me-2"></i>
            Cancelled Order Summary
          </h5>
        </Card.Header>
        
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Order Information</h6>
              <dl className="row">
                <dt className="col-sm-4">PO Number</dt>
                <dd className="col-sm-8">{po.header.poNumber}</dd>
                
                <dt className="col-sm-4">Order Date</dt>
                <dd className="col-sm-8">{formatDate(po.header.orderDate)}</dd>
                
                <dt className="col-sm-4">Total Amount</dt>
                <dd className="col-sm-8">{formatCurrency(po.totalCost)}</dd>
                
                <dt className="col-sm-4">Products</dt>
                <dd className="col-sm-8">{po.products.length} items</dd>
              </dl>
            </Col>
            
            <Col md={6}>
              <h6>Buyer/Supplier Information</h6>
              <dl className="row">
                <dt className="col-sm-4">Buyer</dt>
                <dd className="col-sm-8">
                  {po.header.buyerInfo.firstName} {po.header.buyerInfo.lastName}
                  <div className="small text-muted">{po.header.buyerInfo.email}</div>
                </dd>
                
                <dt className="col-sm-4">Location</dt>
                <dd className="col-sm-8">
                  {po.header.syscoLocation.name}
                  {po.header.syscoLocation.address && (
                    <div className="small text-muted">{po.header.syscoLocation.address}</div>
                  )}
                </dd>
              </dl>
            </Col>
          </Row>
          
          {/* Order Timeline */}
          <div className="mt-4">
            <h6>Order Timeline</h6>
            {po.history && po.history.length > 0 ? (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <ListGroup variant="flush">
                  {[...po.history].reverse().map((entry, index) => (
                    <ListGroup.Item key={index} className="py-2">
                      <div className="d-flex align-items-center">
                        <Badge 
                          bg={entry.status === POStatus.CANCELLED ? 'danger' : 'primary'} 
                          className="me-2"
                        >
                          {entry.status}
                        </Badge>
                        <span className="text-muted small">
                          {formatDate(entry.timestamp)}
                          {entry.user && <> by {entry.user}</>}
                        </span>
                      </div>
                      {entry.notes && (
                        <div className="mt-1 small text-secondary">
                          {entry.notes}
                        </div>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            ) : (
              <p className="text-muted">No history available</p>
            )}
          </div>
        </Card.Body>
      </Card>
      
      {/* Actions */}
      <Card>
        <Card.Header className="bg-light">
          <h5 className="mb-0">
            <i className="bi bi-tools me-2"></i>
            Available Actions
          </h5>
        </Card.Header>
        
        <Card.Body>
          <Row className="g-3">
            <Col sm={6}>
              <Card className="h-100">
                <Card.Body>
                  <h6 className="card-title">
                    <i className="bi bi-files me-2"></i>
                    Create New Order
                  </h6>
                  <p className="text-muted small">Create a new purchase order based on this one</p>
                  <Button variant="outline-primary" size="sm">
                    <i className="bi bi-plus-circle me-2"></i>
                    Create New Order
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            
            <Col sm={6}>
              <Card className="h-100">
                <Card.Body>
                  <h6 className="card-title">
                    <i className="bi bi-printer me-2"></i>
                    Export Cancelled PO
                  </h6>
                  <p className="text-muted small">Export this cancelled purchase order to PDF</p>
                  <Button variant="outline-secondary" size="sm">
                    <i className="bi bi-download me-2"></i>
                    Export to PDF
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CancelledStatusPanel;