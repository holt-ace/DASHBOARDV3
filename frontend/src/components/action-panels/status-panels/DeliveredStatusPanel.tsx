import React, { useState } from 'react';
import { 
  PurchaseOrder, 
  POStatus, 
  StatusDefinition, 
  StatusRequirement, 
  ValidationResult 
} from '@/types/purchaseOrder';
import { Form, Button, Card, Alert, Badge, Row, Col, ListGroup } from 'react-bootstrap';
import { format } from 'date-fns';

/**
 * Props for the DeliveredStatusPanel component
 */
interface DeliveredStatusPanelProps {
  po: PurchaseOrder;
  statusDefinition: StatusDefinition;
  requirements: Record<string, StatusRequirement>;
  validationResult: ValidationResult | null;
  onUpdate: (updateData: Partial<PurchaseOrder>) => Promise<void>;
  onStatusChange: (newStatus: POStatus, notes?: string) => Promise<void>;
}

/**
 * DeliveredStatusPanel Component
 * 
 * This panel is displayed when a PO is in the DELIVERED status.
 * It shows delivery details and provides options for marking the
 * invoice as paid and finalizing the PO.
 */
const DeliveredStatusPanel: React.FC<DeliveredStatusPanelProps> = ({
  po,
  // Removed unused props from destructuring
  onUpdate,
  // onStatusChange is unused but may be needed in future implementations
}) => {
  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
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
   * Get delivery condition badge variant
   */
  const getConditionVariant = (condition?: string) => {
    switch (condition) {
      case 'good':
        return 'success';
      case 'damaged':
        return 'danger';
      case 'partial':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  /**
   * Get delivery condition text
   */
  const getConditionText = (condition?: string) => {
    switch (condition) {
      case 'good':
        return 'Good - No issues';
      case 'damaged':
        return 'Damaged - Items arrived damaged';
      case 'partial':
        return 'Partial - Some items missing';
      default:
        return 'Unknown condition';
    }
  };
  
  /**
   * Calculate if the invoice is currently overdue
   */
  const isInvoiceOverdue = () => {
    if (!po.invoice?.dueDate) return false;
    
    const dueDate = new Date(po.invoice.dueDate);
    const today = new Date();
    
    return today > dueDate && po.invoice.status !== 'paid';
  };
  
  /**
   * Handle payment form submit
   */
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Prepare update data
      const updateData: Partial<PurchaseOrder> = {
        invoice: {
          ...po.invoice!,
          status: 'paid',
          paidDate: paymentDate
        }
      };
      
      // Update PO with payment information
      await onUpdate(updateData);
      
      setSuccess('Payment recorded successfully');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="delivered-status-panel">
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
      
      {/* Delivery Information */}
      <Card className="mb-4">
        <Card.Header className="bg-status-delivered-light d-flex align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-truck-flatbed me-2"></i>
            Delivery Information
          </h5>
          {po.delivery && (
            <Badge bg="success" className="ms-auto">
              Delivered on: {formatDate(po.delivery.deliveryDate)}
            </Badge>
          )}
        </Card.Header>
        
        <Card.Body>
          {po.delivery ? (
            <Row>
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Delivery Date</dt>
                  <dd className="col-sm-8">{formatDate(po.delivery.deliveryDate)}</dd>
                  
                  <dt className="col-sm-4">Received By</dt>
                  <dd className="col-sm-8">{po.delivery.receivedBy}</dd>
                </dl>
              </Col>
              
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Condition</dt>
                  <dd className="col-sm-8">
                    <Badge bg={getConditionVariant(po.delivery.condition)}>
                      {getConditionText(po.delivery.condition)}
                    </Badge>
                  </dd>
                </dl>
              </Col>
              
              {po.delivery.notes && (
                <Col xs={12} className="mt-3">
                  <h6>Delivery Notes</h6>
                  <div className="border p-3 rounded bg-light">
                    {po.delivery.notes}
                  </div>
                </Col>
              )}
            </Row>
          ) : (
            <Alert variant="warning">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              No delivery information available.
            </Alert>
          )}
          
          {/* Delivery Documents */}
          {po.documents && po.documents.length > 0 && (
            <div className="mt-4">
              <h6>Delivery Documents</h6>
              <ListGroup>
                {po.documents.filter(doc => doc.type === 'delivery').map(doc => (
                  <ListGroup.Item key={doc.id} className="d-flex justify-content-between align-items-center">
                    <div>
                      <i className="bi bi-file-earmark me-2"></i>
                      {doc.name}
                    </div>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      as="a"
                      href={doc.url}
                      target="_blank"
                    >
                      <i className="bi bi-eye me-1"></i>
                      View
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Invoice & Payment Information */}
      <Card className="mb-4">
        <Card.Header className="bg-status-invoiced-light">
          <h5 className="mb-0">
            <i className="bi bi-credit-card me-2"></i>
            Invoice & Payment
          </h5>
        </Card.Header>
        
        <Card.Body>
          {po.invoice ? (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <dl className="row">
                    <dt className="col-sm-4">Invoice #</dt>
                    <dd className="col-sm-8">{po.invoice.invoiceNumber}</dd>
                    
                    <dt className="col-sm-4">Issue Date</dt>
                    <dd className="col-sm-8">{formatDate(po.invoice.invoiceDate)}</dd>
                  </dl>
                </Col>
                
                <Col md={6}>
                  <dl className="row">
                    <dt className="col-sm-4">Amount</dt>
                    <dd className="col-sm-8">{formatCurrency(po.invoice.amount)}</dd>
                    
                    <dt className="col-sm-4">Due Date</dt>
                    <dd className="col-sm-8">
                      {formatDate(po.invoice.dueDate)}
                      {isInvoiceOverdue() && (
                        <Badge bg="danger" pill className="ms-2">Overdue</Badge>
                      )}
                    </dd>
                    
                    <dt className="col-sm-4">Status</dt>
                    <dd className="col-sm-8">
                      <Badge 
                        bg={po.invoice.status === 'paid' ? 'success' : 
                           (po.invoice.status === 'overdue' ? 'danger' : 'warning')}
                      >
                        {po.invoice.status === 'paid' ? 'Paid' : 
                         (po.invoice.status === 'overdue' ? 'Overdue' : 'Pending')}
                      </Badge>
                      {po.invoice.paidDate && (
                        <span className="ms-2 text-muted">
                          (Paid on: {formatDate(po.invoice.paidDate)})
                        </span>
                      )}
                    </dd>
                  </dl>
                </Col>
              </Row>
              
              {/* Payment form - Only show if not yet paid */}
              {po.invoice.status !== 'paid' && (
                <Form onSubmit={handlePaymentSubmit}>
                  <Card className="mb-0 mt-3">
                    <Card.Header>
                      <h6 className="mb-0">Record Payment</h6>
                    </Card.Header>
                    
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3" controlId="paymentDate">
                            <Form.Label>Payment Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Form.Group className="mb-3" controlId="paymentNotes">
                        <Form.Label>Payment Notes</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="Add any notes about the payment"
                        />
                      </Form.Group>
                    </Card.Body>
                    
                    <Card.Footer className="d-flex justify-content-end">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Record Payment
                          </>
                        )}
                      </Button>
                    </Card.Footer>
                  </Card>
                </Form>
              )}
            </>
          ) : (
            <Alert variant="warning">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              No invoice information available.
            </Alert>
          )}
        </Card.Body>
      </Card>
      
      {/* PO Summary */}
      <Card>
        <Card.Header className="bg-light">
          <h5 className="mb-0">
            <i className="bi bi-check2-all me-2"></i>
            Order Summary
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
              </dl>
            </Col>
            
            <Col md={6}>
              <h6>Status History</h6>
              {po.history && po.history.length > 0 ? (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <ListGroup variant="flush">
                    {po.history.map((entry, index) => (
                      <ListGroup.Item key={index} className="py-2">
                        <div className="d-flex align-items-center">
                          <Badge bg="primary" className="me-2">{entry.status}</Badge>
                          <span className="text-muted small">
                            {formatDate(entry.timestamp)}
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
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DeliveredStatusPanel;