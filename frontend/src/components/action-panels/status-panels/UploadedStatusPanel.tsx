import React, { useState } from 'react';
import { 
  PurchaseOrder, 
  POStatus, 
  StatusDefinition, 
  StatusRequirement, 
  ValidationResult 
} from '@/types/purchaseOrder';
import { Form, Button, Card, Alert, ListGroup } from 'react-bootstrap';
import { FileUploader, UploadedFile } from '@/components/common/FileUploader';
import { format } from 'date-fns';

/**
 * Props for the UploadedStatusPanel component
 */
interface UploadedStatusPanelProps {
  po: PurchaseOrder;
  statusDefinition: StatusDefinition;
  requirements: Record<string, StatusRequirement>;
  validationResult: ValidationResult | null;
  onUpdate: (updateData: Partial<PurchaseOrder>) => Promise<void>;
  onStatusChange: (newStatus: POStatus, notes?: string) => Promise<void>;
}

/**
 * UploadedStatusPanel Component
 * 
 * This panel is displayed when a PO is in the UPLOADED status.
 * It allows users to review and confirm the purchase order details,
 * add any missing information, and transition to the CONFIRMED status.
 */
const UploadedStatusPanel: React.FC<UploadedStatusPanelProps> = ({
  po,
  statusDefinition,
  // Removed unused props from destructuring
  validationResult,
  onUpdate,
  onStatusChange
}) => {
  // Check if we can transition to CONFIRMED status
  const canTransitionToConfirmed = statusDefinition.allowedTransitions.includes(POStatus.CONFIRMED);
  
  // State for notes
  const [confirmationNotes, setConfirmationNotes] = useState<string>('');
  
  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Additional documents
  const [supportingDocuments, setSupportingDocuments] = useState<UploadedFile[]>([]);
  
  // PO edits (simple for this example)
  const [poEdits, setPOEdits] = useState<{
    buyerName?: string;
    buyerEmail?: string;
    deliveryInstructions?: string;
  }>({});
  
  /**
   * Handle file uploads
   */
  const handleFileUpload = (files: UploadedFile[]) => {
    setSupportingDocuments(prev => [...prev, ...files]);
  };
  
  /**
   * Remove an uploaded file
   */
  const handleRemoveFile = (fileId: string) => {
    setSupportingDocuments(prev => prev.filter(file => file.id !== fileId));
  };
  
  /**
   * Handle input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'notes') {
      setConfirmationNotes(value);
    } else {
      setPOEdits(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  /**
   * Handle form submission to confirm the PO
   */
  const handleConfirmPO = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Prepare update data if there are any edits
      if (Object.keys(poEdits).length > 0 || supportingDocuments.length > 0) {
        const updateData: Partial<PurchaseOrder> = {};
        
        // Apply buyer info edits if any
        if (poEdits.buyerName || poEdits.buyerEmail) {
          const [firstName, lastName] = (poEdits.buyerName || `${po.header.buyerInfo.firstName} ${po.header.buyerInfo.lastName}`).split(' ');
          
          updateData.header = {
            ...po.header,
            buyerInfo: {
              ...po.header.buyerInfo,
              firstName: firstName || po.header.buyerInfo.firstName,
              lastName: lastName || po.header.buyerInfo.lastName,
              email: poEdits.buyerEmail || po.header.buyerInfo.email
            }
          };
        }
        
        // Apply delivery instructions if provided
        if (poEdits.deliveryInstructions) {
          updateData.header = updateData.header || { ...po.header };
          updateData.header.deliveryInfo = {
            ...po.header.deliveryInfo,
            instructions: poEdits.deliveryInstructions
          };
        }
        
        // Add supporting documents if any
        if (supportingDocuments.length > 0) {
          updateData.documents = [
            ...(po.documents || []),
            ...supportingDocuments.map(doc => ({
              id: doc.id,
              url: doc.url,
              name: doc.name,
              type: 'supporting',
              uploadedAt: new Date().toISOString()
            }))
          ];
        }
        
        // Update PO with the changes
        await onUpdate(updateData);
      }
      
      // Transition to CONFIRMED status
      await onStatusChange(POStatus.CONFIRMED, confirmationNotes);
      
      setSuccess('Purchase order confirmed successfully');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm purchase order');
      setIsSubmitting(false);
    }
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
   * Format a currency value
   */
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  return (
    <div className="uploaded-status-panel">
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
      
      {/* PO Review Section */}
      <Card className="mb-4">
        <Card.Header className="bg-status-uploaded-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>
            Purchase Order Review
          </h5>
          <div className="text-muted small">
            Uploaded: {formatDate(po.createdAt)}
          </div>
        </Card.Header>
        
        <Card.Body>
          {/* PO Header Information */}
          <div className="row mb-4">
            <div className="col-md-6">
              <h6>Purchase Order Details</h6>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>PO Number:</strong> {po.header.poNumber}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Order Date:</strong> {formatDate(po.header.orderDate)}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Total Cost:</strong> {formatCurrency(po.totalCost)}
                </ListGroup.Item>
              </ListGroup>
            </div>
            
            <div className="col-md-6">
              <h6>Buyer Information</h6>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Name:</strong> {po.header.buyerInfo.firstName} {po.header.buyerInfo.lastName}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Email:</strong> {po.header.buyerInfo.email}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Location:</strong> {po.header.syscoLocation.name}
                </ListGroup.Item>
              </ListGroup>
            </div>
          </div>
          
          {/* Product Summary */}
          <h6>Products ({po.products.length})</h6>
          <div className="table-responsive mb-3">
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>SUPC</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>FOB Cost</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {po.products.map((product, index) => (
                  <tr key={index}>
                    <td>{product.supc}</td>
                    <td>{product.description || 'N/A'}</td>
                    <td>{product.quantity}</td>
                    <td>{formatCurrency(product.fobCost)}</td>
                    <td>{formatCurrency(product.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={4} className="text-end">Total:</th>
                  <th>{formatCurrency(po.totalCost)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* PO Notes */}
          {po.notes && (
            <div className="mb-3">
              <h6>Purchase Order Notes</h6>
              <div className="border p-3 rounded bg-light">
                {po.notes}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Confirmation Form */}
      {canTransitionToConfirmed ? (
        <Form onSubmit={handleConfirmPO}>
          <Card className="mb-4">
            <Card.Header className="bg-status-uploaded-light">
              <h5 className="mb-0">
                <i className="bi bi-pencil me-2"></i>
                Additional Information & Edits
              </h5>
            </Card.Header>
            <Card.Body>
              {/* Buyer Information Edits */}
              <h6 className="mb-3">Update Buyer Information (Optional)</h6>
              <div className="row mb-4">
                <div className="col-md-6">
                  <Form.Group className="mb-3" controlId="buyerName">
                    <Form.Label>Buyer Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="buyerName"
                      placeholder={`${po.header.buyerInfo.firstName} ${po.header.buyerInfo.lastName}`}
                      value={poEdits.buyerName || ''}
                      onChange={handleInputChange}
                    />
                    <Form.Text className="text-muted">
                      Format as "First Last"
                    </Form.Text>
                  </Form.Group>
                </div>
                
                <div className="col-md-6">
                  <Form.Group className="mb-3" controlId="buyerEmail">
                    <Form.Label>Buyer Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="buyerEmail"
                      placeholder={po.header.buyerInfo.email}
                      value={poEdits.buyerEmail || ''}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </div>
              </div>
              
              {/* Delivery Instructions */}
              <h6 className="mb-3">Delivery Instructions (Optional)</h6>
              <Form.Group className="mb-4" controlId="deliveryInstructions">
                <Form.Control
                  as="textarea"
                  name="deliveryInstructions"
                  rows={3}
                  placeholder="Add any special delivery instructions here"
                  value={poEdits.deliveryInstructions || ''}
                  onChange={handleInputChange}
                />
              </Form.Group>
              
              {/* Supporting Documents */}
              <h6 className="mb-3">Upload Supporting Documents (Optional)</h6>
              <FileUploader
                onFileUpload={handleFileUpload}
                acceptedFileTypes=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                maxFileSize={5}
                multiple={true}
                className="mb-3"
              />
              
              {supportingDocuments.length > 0 && (
                <div className="mb-4">
                  <h6>Uploaded Documents</h6>
                  <ListGroup>
                    {supportingDocuments.map((file) => (
                      <ListGroup.Item key={file.id} className="d-flex justify-content-between align-items-center">
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
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
              
              {/* Confirmation Notes */}
              <h6 className="mb-3">Confirmation Notes</h6>
              <Form.Group className="mb-3" controlId="notes">
                <Form.Control
                  as="textarea"
                  name="notes"
                  rows={3}
                  placeholder="Add notes about the confirmation process here"
                  value={confirmationNotes}
                  onChange={handleInputChange}
                />
                <Form.Text className="text-muted">
                  These notes will be included in the purchase order history.
                </Form.Text>
              </Form.Group>
            </Card.Body>
            <Card.Footer className="d-flex justify-content-end">
              <Button variant="primary" type="submit" disabled={isSubmitting || !validationResult?.isValid}>
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Confirm Purchase Order
                  </>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </Form>
      ) : (
        <Alert variant="warning">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          This purchase order cannot be confirmed at this time.
        </Alert>
      )}
    </div>
  );
};

export default UploadedStatusPanel;