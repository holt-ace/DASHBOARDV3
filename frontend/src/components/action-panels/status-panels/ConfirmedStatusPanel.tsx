import React, { useState } from 'react';
import { 
  PurchaseOrder, 
  POStatus, 
  StatusDefinition, 
  StatusRequirement, 
  ValidationResult,
  POShipping
} from '@/types/purchaseOrder';
import { Form, Button, Card, Alert, Badge } from 'react-bootstrap';
import { FileUploader, UploadedFile } from '@/components/common/FileUploader';
import { format } from 'date-fns';

/**
 * Props for the ConfirmedStatusPanel component
 */
interface ConfirmedStatusPanelProps {
  po: PurchaseOrder;
  statusDefinition: StatusDefinition;
  requirements: Record<string, StatusRequirement>;
  validationResult: ValidationResult | null;
  onUpdate: (updateData: Partial<PurchaseOrder>) => Promise<void>;
  onStatusChange: (newStatus: POStatus, notes?: string) => Promise<void>;
}

/**
 * Form data interface for shipping information
 */
interface ShippingFormData {
  shippingDate: string;
  carrier: string;
  trackingNumber: string;
  estimatedDeliveryDate: string;
  notes: string;
}

/**
 * ConfirmedStatusPanel Component
 * 
 * This panel is displayed when a PO is in the CONFIRMED status.
 * It allows users to provide shipping details and documentation
 * to mark the PO as shipped.
 */
const ConfirmedStatusPanel: React.FC<ConfirmedStatusPanelProps> = ({
  po,
  statusDefinition,
  // Removed unused prop warning
  // requirements,
  validationResult,
  onUpdate,
  onStatusChange
}) => {
  // Determine if the PO can be transitioned to SHIPPED
  const canTransitionToShipped = statusDefinition.allowedTransitions.includes(POStatus.SHIPPED);
  
  // State for shipping form data
  const [shippingData, setShippingData] = useState<ShippingFormData>({
    shippingDate: format(new Date(), 'yyyy-MM-dd'),
    carrier: '',
    trackingNumber: '',
    estimatedDeliveryDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Default to 7 days from now
    notes: ''
  });
  
  // State for shipping documents
  const [shippingDocuments, setShippingDocuments] = useState<UploadedFile[]>([]);
  
  // State for form validation and submission
  const [validated, setValidated] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setShippingData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  /**
   * Handle file uploads
   */
  const handleFileUpload = (files: UploadedFile[]) => {
    setShippingDocuments(prev => [...prev, ...files]);
  };
  
  /**
   * Remove an uploaded file
   */
  const handleRemoveFile = (fileId: string) => {
    setShippingDocuments(prev => prev.filter(file => file.id !== fileId));
  };
  
  /**
   * Get the confirmation date from the PO history
   */
  const getConfirmationDate = (): string => {
    if (!po.history) return 'N/A';
    
    const confirmationEvent = po.history.find(
      entry => entry.status === POStatus.CONFIRMED
    );
    
    return confirmationEvent 
      ? format(new Date(confirmationEvent.timestamp), 'MMM d, yyyy')
      : format(new Date(po.createdAt || Date.now()), 'MMM d, yyyy');
  };
  
  /**
   * Handle form submission and status transition to SHIPPED
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
      
      // Prepare shipping data for update
      const updateData: Partial<PurchaseOrder> = {
        header: {
          ...po.header,
          deliveryInfo: {
            ...po.header.deliveryInfo,
            date: shippingData.shippingDate
          }
        },
        shipping: {
          carrier: shippingData.carrier,
          trackingNumber: shippingData.trackingNumber,
          shippingDate: shippingData.shippingDate,
          estimatedDeliveryDate: shippingData.estimatedDeliveryDate,
          status: 'in-transit'
        } as POShipping,
        documents: [
          ...(po.documents || []),
          ...shippingDocuments.map(doc => ({
            id: doc.id,
            url: doc.url,
            name: doc.name,
            type: 'shipping',
            uploadedAt: new Date().toISOString()
          }))
        ]
      };
      
      // Update PO with shipping information
      await onUpdate(updateData);
      
      // Transition to SHIPPED status
      await onStatusChange(POStatus.SHIPPED, shippingData.notes);
      
      setSuccess('Purchase order marked as shipped successfully');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark purchase order as shipped');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="confirmed-status-panel">
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
      
      {/* Confirmation Summary */}
      <Card className="mb-4">
        <Card.Header className="bg-status-confirmed-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-check-circle me-2"></i>
            Confirmed Order Details
          </h5>
          <Badge bg="success">
            Confirmed on: {getConfirmationDate()}
          </Badge>
        </Card.Header>
        
        <Card.Body>
          <div className="row">
            <div className="col-md-6">
              <h6>Order Information</h6>
              <dl className="row">
                <dt className="col-sm-4">PO Number</dt>
                <dd className="col-sm-8">{po.header.poNumber}</dd>
                
                <dt className="col-sm-4">Order Date</dt>
                <dd className="col-sm-8">{format(new Date(po.header.orderDate), 'MMM d, yyyy')}</dd>
                
                <dt className="col-sm-4">Total Amount</dt>
                <dd className="col-sm-8">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(po.totalCost)}
                </dd>
                
                <dt className="col-sm-4">Products</dt>
                <dd className="col-sm-8">{po.products.length} items</dd>
              </dl>
            </div>
            
            <div className="col-md-6">
              <h6>Shipping Information</h6>
              <dl className="row">
                <dt className="col-sm-4">Ship To</dt>
                <dd className="col-sm-8">
                  {po.header.syscoLocation.name}
                  {po.header.syscoLocation.address && (
                    <div className="small text-muted">{po.header.syscoLocation.address}</div>
                  )}
                </dd>
                
                <dt className="col-sm-4">Buyer</dt>
                <dd className="col-sm-8">
                  {po.header.buyerInfo.firstName} {po.header.buyerInfo.lastName}
                  <div className="small text-muted">{po.header.buyerInfo.email}</div>
                </dd>
                
                {po.header.deliveryInfo?.instructions && (
                  <>
                    <dt className="col-sm-4">Instructions</dt>
                    <dd className="col-sm-8">{po.header.deliveryInfo.instructions}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {/* Shipping Form */}
      {canTransitionToShipped ? (
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Card className="mb-4">
            <Card.Header className="bg-status-confirmed-light">
              <h5 className="mb-0">
                <i className="bi bi-truck me-2"></i>
                Mark Order as Shipped
              </h5>
            </Card.Header>
            
            <Card.Body>
              <div className="row">
                {/* Shipping Date */}
                <div className="col-md-6">
                  <Form.Group className="mb-3" controlId="shippingDate">
                    <Form.Label>Shipping Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="shippingDate"
                      value={shippingData.shippingDate}
                      onChange={handleInputChange}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Shipping date is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                
                {/* Estimated Delivery Date */}
                <div className="col-md-6">
                  <Form.Group className="mb-3" controlId="estimatedDeliveryDate">
                    <Form.Label>Estimated Delivery Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="estimatedDeliveryDate"
                      value={shippingData.estimatedDeliveryDate}
                      onChange={handleInputChange}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Estimated delivery date is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                
                {/* Carrier */}
                <div className="col-md-6">
                  <Form.Group className="mb-3" controlId="carrier">
                    <Form.Label>Carrier *</Form.Label>
                    <Form.Control
                      type="text"
                      name="carrier"
                      value={shippingData.carrier}
                      onChange={handleInputChange}
                      placeholder="Enter carrier name"
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Carrier is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                
                {/* Tracking Number */}
                <div className="col-md-6">
                  <Form.Group className="mb-3" controlId="trackingNumber">
                    <Form.Label>Tracking Number *</Form.Label>
                    <Form.Control
                      type="text"
                      name="trackingNumber"
                      value={shippingData.trackingNumber}
                      onChange={handleInputChange}
                      placeholder="Enter tracking number"
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Tracking number is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
              </div>
              
              {/* Shipping Documents */}
              <h6 className="mt-2 mb-3">Shipping Documents</h6>
              <FileUploader
                onFileUpload={handleFileUpload}
                acceptedFileTypes=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                maxFileSize={5}
                multiple={true}
                className="mb-3"
              />
              
              {shippingDocuments.length > 0 && (
                <div className="mb-4 mt-3">
                  <h6>Uploaded Documents</h6>
                  <div className="list-group">
                    {shippingDocuments.map((file) => (
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
              
              {/* Notes */}
              <Form.Group className="mb-3" controlId="notes">
                <Form.Label>Shipping Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  name="notes"
                  rows={3}
                  value={shippingData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes about shipping"
                />
              </Form.Group>
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
                    <i className="bi bi-truck me-2"></i>
                    Mark as Shipped
                  </>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </Form>
      ) : (
        <Alert variant="warning">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          This purchase order cannot be marked as shipped at this time.
        </Alert>
      )}
    </div>
  );
};

export default ConfirmedStatusPanel;