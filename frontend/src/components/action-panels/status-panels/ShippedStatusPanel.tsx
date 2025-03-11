import React, { useState } from 'react';
import { 
  PurchaseOrder, 
  POStatus, 
  StatusDefinition, 
  StatusRequirement, 
  ValidationResult 
} from '@/types/purchaseOrder';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import { FileUploader, UploadedFile } from '@/components/common/FileUploader';
import { format } from 'date-fns';

/**
 * Props for the ShippedStatusPanel component
 */
interface ShippedStatusPanelProps {
  po: PurchaseOrder;
  statusDefinition: StatusDefinition;
  requirements: Record<string, StatusRequirement>;
  validationResult: ValidationResult | null;
  onUpdate: (updateData: Partial<PurchaseOrder>) => Promise<void>;
  onStatusChange: (newStatus: POStatus, notes?: string) => Promise<void>;
}

/**
 * Form data interface for invoice information
 */
interface InvoiceFormData {
  invoiceNumber: string;
  invoiceDate: Date;
  amount: number;
  dueDate: Date;
  notes: string;
}

/**
 * ShippedStatusPanel Component
 * 
 * This panel is displayed when a PO is in the SHIPPED status.
 * It allows users to create an invoice for the shipped order and
 * upload shipping documents before transitioning to the INVOICED status.
 */
const ShippedStatusPanel: React.FC<ShippedStatusPanelProps> = ({
  po,
  statusDefinition,
  // Removed unused props from destructuring
  onUpdate,
  onStatusChange
}) => {
  // Determine if the PO can be transitioned to INVOICED
  const canTransitionToInvoiced = statusDefinition.allowedTransitions.includes(POStatus.INVOICED);
  
  // State for invoice form data
  const [invoiceData, setInvoiceData] = useState<InvoiceFormData>({
    invoiceNumber: '',
    invoiceDate: new Date(),
    amount: po.totalCost || 0,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    notes: ''
  });
  
  // State for shipping documents
  const [shippingDocuments, setShippingDocuments] = useState<UploadedFile[]>([]);
  
  // State for form validation and submission
  const [validated, setValidated] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setInvoiceData(prevData => ({
      ...prevData,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };
  
  /**
   * Handle date changes
   */
  const handleDateChange = (name: string, date: Date | null) => {
    if (date) {
      setInvoiceData(prevData => ({
        ...prevData,
        [name]: date
      }));
    }
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
   * Handle form submission and status transition to INVOICED
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
      setSubmitting(true);
      setError(null);
      
      // Prepare invoice data for update
      const updateData: Partial<PurchaseOrder> = {
        invoice: {
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: format(invoiceData.invoiceDate, 'MM/dd/yy'),
          amount: invoiceData.amount,
          dueDate: format(invoiceData.dueDate, 'MM/dd/yy')
        },
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
      
      // Update PO with invoice information
      await onUpdate(updateData);
      
      // Transition to INVOICED status
      await onStatusChange(POStatus.INVOICED, invoiceData.notes);
      
      setSuccess('Invoice created and status updated successfully');
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      setSubmitting(false);
    }
  };
  
  /**
   * Format a date for display
   */
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? dateStr : format(date, 'MMM d, yyyy');
    } catch (e) {
      return dateStr;
    }
  };
  
  return (
    <Card className="mb-3">
      <Card.Header className="bg-status-shipped text-white d-flex justify-content-between align-items-center">
        <div>
          <i className="bi bi-truck me-2"></i>
          Create Invoice for Shipped Order
        </div>
        {po.header.deliveryInfo?.date && (
          <div className="badge bg-light text-dark">
            Shipped on: {formatDate(po.header.deliveryInfo.date)}
          </div>
        )}
      </Card.Header>
      
      <Card.Body>
        {/* Error alert */}
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </Alert>
        )}
        
        {/* Success alert */}
        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
            <i className="bi bi-check-circle-fill me-2"></i>
            {success}
          </Alert>
        )}
        
        {/* Shipping information */}
        <div className="mb-4">
          <h5>Shipping Information</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <strong>Ship To:</strong> {po.header.syscoLocation.name}
              {po.header.syscoLocation.address && (
                <div className="text-muted small">{po.header.syscoLocation.address}</div>
              )}
            </div>
            <div className="col-md-6">
              <strong>Shipping Date:</strong> {formatDate(po.header.deliveryInfo?.date)}
              {po.header.deliveryInfo?.instructions && (
                <div className="text-muted small">
                  <strong>Instructions:</strong> {po.header.deliveryInfo.instructions}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {canTransitionToInvoiced ? (
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            {/* Invoice information section */}
            <div className="mb-4">
              <h5>Invoice Information</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <Form.Group controlId="invoiceNumber">
                    <Form.Label>Invoice Number *</Form.Label>
                    <Form.Control
                      type="text"
                      name="invoiceNumber"
                      value={invoiceData.invoiceNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter invoice number"
                    />
                    <Form.Control.Feedback type="invalid">
                      Invoice number is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                
                <div className="col-md-6">
                  <Form.Group controlId="invoiceDate">
                    <Form.Label>Invoice Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="invoiceDate"
                      value={invoiceData.invoiceDate.toISOString().split('T')[0]}
                      onChange={(e) => handleDateChange('invoiceDate', e.target.value ? new Date(e.target.value) : null)}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Invoice date is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                
                <div className="col-md-6">
                  <Form.Group controlId="amount">
                    <Form.Label>Invoice Amount *</Form.Label>
                    <Form.Control
                      type="number"
                      name="amount"
                      value={invoiceData.amount}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                    />
                    <Form.Control.Feedback type="invalid">
                      Invoice amount is required and must be greater than 0
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                
                <div className="col-md-6">
                  <Form.Group controlId="dueDate">
                    <Form.Label>Due Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="dueDate"
                      value={invoiceData.dueDate.toISOString().split('T')[0]}
                      onChange={(e) => handleDateChange('dueDate', e.target.value ? new Date(e.target.value) : null)}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Due date is required
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
              </div>
            </div>
            
            {/* Shipping documents section */}
            <div className="mb-4">
              <h5>Shipping Documents</h5>
              <FileUploader
                onFileUpload={handleFileUpload}
                acceptedFileTypes=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                maxFileSize={5}
                multiple={true}
              />
              
              {shippingDocuments.length > 0 && (
                <div className="mt-3">
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
            </div>
            
            {/* Notes section */}
            <div className="mb-4">
              <Form.Group controlId="notes">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  name="notes"
                  value={invoiceData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Add any notes about this invoice"
                />
              </Form.Group>
            </div>
            
            {/* Action buttons */}
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="outline-secondary"
                type="button"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>Create Invoice & Update Status</>
                )}
              </Button>
            </div>
          </Form>
        ) : (
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Transitioning to INVOICED status is not currently available.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default ShippedStatusPanel;