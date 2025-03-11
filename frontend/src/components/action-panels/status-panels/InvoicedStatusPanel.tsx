import React, { useState } from 'react';
import { 
  PurchaseOrder, 
  POStatus, 
  StatusDefinition, 
  StatusRequirement, 
  ValidationResult 
} from '@/types/purchaseOrder';
import { Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import { FileUploader, UploadedFile } from '@/components/common/FileUploader';
import { format } from 'date-fns';

/**
 * Props for the InvoicedStatusPanel component
 */
interface InvoicedStatusPanelProps {
  po: PurchaseOrder;
  statusDefinition: StatusDefinition;
  requirements: Record<string, StatusRequirement>;
  validationResult: ValidationResult | null;
  onUpdate: (updateData: Partial<PurchaseOrder>) => Promise<void>;
  onStatusChange: (newStatus: POStatus, notes?: string) => Promise<void>;
}

/**
 * Form data interface for delivery confirmation
 */
interface DeliveryFormData {
  deliveryDate: string;
  receivedBy: string;
  condition: 'good' | 'damaged' | 'partial';
  notes: string;
}

/**
 * InvoicedStatusPanel Component
 * 
 * This panel is displayed when a PO is in the INVOICED status.
 * It allows users to confirm delivery of the order and provide
 * delivery details before transitioning to the DELIVERED status.
 */
const InvoicedStatusPanel: React.FC<InvoicedStatusPanelProps> = ({
  po,
  statusDefinition,
  // Removed unused prop warnings
  // requirements,
  validationResult,
  onUpdate,
  onStatusChange
}) => {
  // Determine if the PO can be transitioned to DELIVERED
  const canTransitionToDelivered = statusDefinition.allowedTransitions.includes(POStatus.DELIVERED);
  
  // Initialize default delivery date to today
  const today = new Date();
  const todayFormatted = format(today, 'yyyy-MM-dd');
  
  // State for delivery form data
  const [deliveryData, setDeliveryData] = useState<DeliveryFormData>({
    deliveryDate: todayFormatted,
    receivedBy: '',
    condition: 'good',
    notes: ''
  });
  
  // State for proof of delivery documents
  const [deliveryDocuments, setDeliveryDocuments] = useState<UploadedFile[]>([]);
  
  // State for form validation and submission
  const [validated, setValidated] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setDeliveryData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  /**
   * Handle file uploads
   */
  const handleFileUpload = (files: UploadedFile[]) => {
    setDeliveryDocuments(prev => [...prev, ...files]);
  };
  
  /**
   * Remove an uploaded file
   */
  const handleRemoveFile = (fileId: string) => {
    setDeliveryDocuments(prev => prev.filter(file => file.id !== fileId));
  };
  
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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  /**
   * Handle form submission to confirm delivery
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Validate form
    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Prepare delivery data for update
      const updateData: Partial<PurchaseOrder> = {
        delivery: {
          deliveryDate: deliveryData.deliveryDate,
          receivedBy: deliveryData.receivedBy,
          condition: deliveryData.condition,
          notes: deliveryData.notes
        },
        shipping: po.shipping ? {
          ...po.shipping,
          actualDeliveryDate: deliveryData.deliveryDate,
          status: 'delivered'
        } : undefined,
        documents: [
          ...(po.documents || []),
          ...deliveryDocuments.map(doc => ({
            id: doc.id,
            url: doc.url,
            name: doc.name,
            type: 'delivery',
            uploadedAt: new Date().toISOString()
          }))
        ]
      };
      
      // Update PO with delivery information
      await onUpdate(updateData);
      
      // Transition to DELIVERED status
      await onStatusChange(POStatus.DELIVERED, deliveryData.notes);
      
      setSuccess('Delivery confirmed successfully');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm delivery');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="invoiced-status-panel">
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
      
      {/* Invoice Summary */}
      <Card className="mb-4">
        <Card.Header className="bg-status-invoiced-light">
          <h5 className="mb-0">
            <i className="bi bi-receipt me-2"></i>
            Invoice Details
          </h5>
        </Card.Header>
        <Card.Body>
          {po.invoice ? (
            <Row>
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Invoice Number</dt>
                  <dd className="col-sm-8">{po.invoice.invoiceNumber}</dd>
                  
                  <dt className="col-sm-4">Invoice Date</dt>
                  <dd className="col-sm-8">{formatDate(po.invoice.invoiceDate)}</dd>
                </dl>
              </Col>
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Amount</dt>
                  <dd className="col-sm-8">{formatCurrency(po.invoice.amount)}</dd>
                  
                  <dt className="col-sm-4">Due Date</dt>
                  <dd className="col-sm-8">{formatDate(po.invoice.dueDate)}</dd>
                </dl>
              </Col>
            </Row>
          ) : (
            <Alert variant="warning">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              No invoice information available.
            </Alert>
          )}
        </Card.Body>
      </Card>
      
      {/* Shipping Information */}
      {po.shipping && (
        <Card className="mb-4">
          <Card.Header className="bg-status-shipped-light">
            <h5 className="mb-0">
              <i className="bi bi-truck me-2"></i>
              Shipping Information
            </h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Carrier</dt>
                  <dd className="col-sm-8">{po.shipping.carrier}</dd>
                  
                  <dt className="col-sm-4">Ship Date</dt>
                  <dd className="col-sm-8">{formatDate(po.shipping.shippingDate)}</dd>
                </dl>
              </Col>
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Tracking</dt>
                  <dd className="col-sm-8">
                    <a href={`https://www.google.com/search?q=${po.shipping.carrier}+tracking+${po.shipping.trackingNumber}`} target="_blank" rel="noopener noreferrer">
                      {po.shipping.trackingNumber}
                      <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                    </a>
                  </dd>
                  
                  <dt className="col-sm-4">Est. Delivery</dt>
                  <dd className="col-sm-8">{formatDate(po.shipping.estimatedDeliveryDate)}</dd>
                </dl>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
      
      {/* Delivery Confirmation Form */}
      {canTransitionToDelivered ? (
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Card>
            <Card.Header className="bg-status-invoiced-light">
              <h5 className="mb-0">
                <i className="bi bi-clipboard-check me-2"></i>
                Confirm Delivery
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                {/* Delivery Date */}
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="deliveryDate">
                    <Form.Label>Delivery Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="deliveryDate"
                      value={deliveryData.deliveryDate}
                      onChange={handleInputChange}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Delivery date is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                
                {/* Received By */}
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="receivedBy">
                    <Form.Label>Received By *</Form.Label>
                    <Form.Control
                      type="text"
                      name="receivedBy"
                      value={deliveryData.receivedBy}
                      onChange={handleInputChange}
                      placeholder="Enter name of person who received delivery"
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Receiver's name is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                
                {/* Condition */}
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="condition">
                    <Form.Label>Condition *</Form.Label>
                    <Form.Select
                      name="condition"
                      value={deliveryData.condition}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="good">Good - No issues</option>
                      <option value="damaged">Damaged - Items arrived damaged</option>
                      <option value="partial">Partial - Some items missing</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      Please select the condition
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
              
              {/* Notes */}
              <Form.Group className="mb-3" controlId="notes">
                <Form.Label>Delivery Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  name="notes"
                  rows={3}
                  value={deliveryData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes about the delivery"
                />
              </Form.Group>
              
              {/* Proof of Delivery Documents */}
              <div className="mb-4">
                <h6>Proof of Delivery Documents</h6>
                <p className="text-muted small mb-2">
                  Upload signed delivery receipts or other proof of delivery documents
                </p>
                <FileUploader
                  onFileUpload={handleFileUpload}
                  acceptedFileTypes=".pdf,.jpg,.jpeg,.png"
                  maxFileSize={5}
                  multiple={true}
                />
                
                {deliveryDocuments.length > 0 && (
                  <div className="mt-3">
                    <h6>Uploaded Documents</h6>
                    <div className="list-group">
                      {deliveryDocuments.map((file) => (
                        <div key={file.id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <i className="bi bi-file-earmark me-2"></i>
                            {file.name}
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleRemoveFile(file.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
            <Card.Footer className="d-flex justify-content-end">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={isSubmitting || (validationResult !== null && !validationResult.isValid)}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Confirm Delivery
                  </>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </Form>
      ) : (
        <Alert variant="warning">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          This purchase order cannot be marked as delivered at this time.
        </Alert>
      )}
    </div>
  );
};

export default InvoicedStatusPanel;