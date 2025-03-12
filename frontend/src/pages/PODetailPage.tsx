import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Row, Col, Card, Badge, Button, Tabs, Tab, Alert, Spinner } from 'react-bootstrap';
import { format } from 'date-fns';

// Components
import StatusActionPanel from '@/components/action-panels/StatusActionPanel';
import WorkflowVisualizer from '@/components/status-workflow/WorkflowVisualizer';
import Navigation from '@/utils/navigation';
import Logger from '@/utils/logger';

// Redux
import { RootState, AppDispatch } from '@/store';
import { fetchPODetail, updatePO, updatePOStatus } from '@/store/slices/poDetailSlice';

// Types
import { POStatus, PurchaseOrder, POProduct, PODocument, POHistoryEntry } from '@/types/purchaseOrder';

/**
 * PODetailPage Component
 * 
 * This page displays detailed information about a specific purchase order
 * and provides status-specific actions through the status action panels.
 * It also visualizes the PO workflow and allows for status transitions.
 */
const PODetailPage: React.FC = () => {
  // Get PO ID from URL parameters
  const { poNumber } = useParams<{ poNumber: string }>();
  console.log('PODetailPage mounted. PO Number from URL:', poNumber);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  
  // Local state
  const [activeTab, setActiveTab] = useState<string>('details');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  
  // Redux state
  const { 
    purchaseOrder, 
    loading, 
    error, 
    availableTransitions 
  } = useSelector((state: RootState) => state.poDetail);
  
  // Fetch PO details on mount and when ID changes
  useEffect(() => {
    // Check if we're in edit mode from query params or session storage
    const params = new URLSearchParams(location.search);
    const editModeParam = params.get('edit') === 'true';
    const editModeStorage = sessionStorage.getItem('editMode') === 'true';
    const editingPOStorage = sessionStorage.getItem('editingPO');
    
    // Set edit mode if either condition is true
    if ((editModeParam || (editModeStorage && editingPOStorage === poNumber))) {
      console.log('Entering edit mode for PO:', poNumber);
      setIsEditMode(true);
      setActiveTab('details');
      
      // Clear the session storage flags after picking them up
      if (editModeStorage) {
        sessionStorage.removeItem('editMode');
        sessionStorage.removeItem('editingPO');
      }
    }
    
    if (poNumber) {
      console.log('Dispatching fetchPODetail action for PO Number:', poNumber);
      dispatch(fetchPODetail(poNumber));
    } else {
      console.error('No PO Number found in URL params!');
    }
  }, [dispatch, poNumber, location.search]);
  
  /**
   * Handle PO update
   */
  const handlePOUpdate = async (updateData: Partial<PurchaseOrder>) => {
    if (!poNumber || !purchaseOrder) return;
    
    try {
      await dispatch(updatePO({ poNumber, updateData })).unwrap();
      // Refetch to get updated data
      dispatch(fetchPODetail(poNumber));
    } catch (error) {
      Logger.error('Failed to update PO:', error);
      // Error is handled by the slice and will be available in the error state
    }
  };
  
  /**
   * Handle status change
   */
  const handleStatusChange = async (newStatus: POStatus, notes?: string) => {
    if (!poNumber || !purchaseOrder) return;
    
    try {
      await dispatch(updatePOStatus({
        poNumber,
        newStatus,
        notes,
        oldStatus: purchaseOrder.header.status
      })).unwrap();
      
      // Refetch to get updated data
      dispatch(fetchPODetail(poNumber));
    } catch (error) {
      Logger.error('Failed to update PO status:', error);
      // Error is handled by the slice and will be available in the error state
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
   * Get status badge variant
   */
  const getStatusVariant = (status: POStatus) => {
    switch (status) {
      case POStatus.UPLOADED:
        return 'warning';
      case POStatus.CONFIRMED:
        return 'info';
      case POStatus.SHIPPED:
        return 'primary';
      case POStatus.INVOICED:
        return 'secondary';
      case POStatus.DELIVERED:
        return 'success';
      case POStatus.CANCELLED:
        return 'danger';
      default:
        return 'light';
    }
  };
  
  // Loading state
  if (loading && !purchaseOrder) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading purchase order details...</p>
      </Container>
    );
  }
  
  // Error state
  if (error && !purchaseOrder) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Purchase Order</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button 
              variant="outline-danger"
              onClick={() => Navigation.toPOList()}
            >
              Back to Purchase Orders
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }
  
  // If no PO data yet
  if (!purchaseOrder) {
    return null;
  }
  
  return (
    <Container fluid className="py-4">
      {/* Page Header */}
      <div className="page-header d-sm-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">
            Purchase Order: {purchaseOrder.header.poNumber}
          </h1>
          <div className="text-muted">
            {formatDate(purchaseOrder.header.orderDate)} · {purchaseOrder.products.length} items · {formatCurrency(purchaseOrder.totalCost)}
          </div>
        </div>
        
        <div className="mt-3 mt-sm-0 d-flex gap-2">
          <Badge 
            pill 
            bg={getStatusVariant(purchaseOrder.header.status)}
            className="fs-6 d-flex align-items-center px-3 py-2"
          >
            {purchaseOrder.header.status}
          </Badge>
          
          <div className="dropdown">
            <Button 
              variant="outline-secondary" 
              className="dropdown-toggle"
              data-bs-toggle="dropdown"
            >
              <i className="bi bi-three-dots"></i>
            </Button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <a className="dropdown-item" href="#export">
                  <i className="bi bi-download me-2"></i>
                  Export to PDF
                </a>
              </li>
              <li>
                <a className="dropdown-item" href="#print">
                  <i className="bi bi-printer me-2"></i>
                  Print
                </a>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <a className="dropdown-item text-danger" href="#cancel">
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel Order
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/purchase-orders">Purchase Orders</Link>
          </li>
          <li className="breadcrumb-item active">
            {purchaseOrder.header.poNumber}
          </li>
        </ol>
      </nav>
      
      {/* Main Content */}
      <Row>
        {/* Left Column - PO Details */}
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Purchase Order Information</h5>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setActiveTab('details');
                }}
              >
                {isEditMode ? (
                  <>
                    <i className="bi bi-x-circle me-1"></i>
                    Cancel Edit
                  </>
                ) : (
                  <>
                    <i className="bi bi-pencil me-1"></i>
                    Edit
                  </>
                )}
              </Button>
            </Card.Header>
            
            <Card.Body>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => k && setActiveTab(k)}
                className="mb-4"
              >
                <Tab eventKey="details" title="Details">
                  {/* PO Details */}
                  {isEditMode && (
                    <Alert variant="info" className="mb-3">
                      <i className="bi bi-info-circle me-2"></i>
                      Edit mode is active. You can modify the purchase order details.
                    </Alert>
                  )}
                  
                  <Row>
                    <Col md={6}>
                      <h6 className="mb-3">Order Information</h6>
                      <table className="table table-sm table-borderless">
                        <tbody>
                          <tr>
                            <td className="fw-medium w-40">PO Number:</td>
                            <td>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={purchaseOrder.header.poNumber}
                                  disabled
                                />
                              ) : (
                                purchaseOrder.header.poNumber
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-medium">Order Date:</td>
                            <td>
                              {isEditMode ? (
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  value={purchaseOrder.header.orderDate ? new Date(purchaseOrder.header.orderDate).toISOString().split('T')[0] : ''}
                                  onChange={(e) => handlePOUpdate({
                                    header: {...purchaseOrder.header, orderDate: e.target.value}
                                  })}
                                />
                              ) : (
                                formatDate(purchaseOrder.header.orderDate)
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-medium">Status:</td>
                            <td>
                              <Badge bg={getStatusVariant(purchaseOrder.header.status)}>
                                {purchaseOrder.header.status}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-medium">Total Cost:</td>
                            <td>{formatCurrency(purchaseOrder.totalCost)}</td>
                          </tr>
                          <tr>
                            <td className="fw-medium">Total Items:</td>
                            <td>{purchaseOrder.products.length}</td>
                          </tr>
                        </tbody>
                      </table>
                    </Col>
                  </Row>
                  
                  {isEditMode && (
                    <div className="d-flex justify-content-end mb-3 mt-3">
                      <Button 
                        variant="secondary" 
                        className="me-2"
                        onClick={() => setIsEditMode(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="success"
                        onClick={() => {
                          // Submit changes and exit edit mode
                          alert('Changes saved successfully!');
                          setIsEditMode(false);
                        }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                  
                  <Row>
                    <Col md={6}>
                      <h6 className="mb-3">Contact Information</h6>
                      <table className="table table-sm table-borderless">
                        <tbody>
                          <tr>
                            <td className="fw-medium w-40">Buyer:</td>
                            <td>
                              {purchaseOrder.header.buyerInfo.firstName} {purchaseOrder.header.buyerInfo.lastName}
                              <div className="text-muted small">
                                {purchaseOrder.header.buyerInfo.email}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-medium">Location:</td>
                            <td>
                              {purchaseOrder.header.syscoLocation.name}
                              {purchaseOrder.header.syscoLocation.address && (
                                <div className="text-muted small">
                                  {purchaseOrder.header.syscoLocation.address}
                                </div>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </Col>
                  </Row>
                  
                  <hr />
                  
                  {/* Products Table */}
                  <h6 className="mb-3">Products</h6>
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>SUPC</th>
                          <th>Description</th>
                          <th>Pack Size</th>
                          <th className="text-center">Quantity</th>
                          <th className="text-end">FOB Cost</th>
                          <th className="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrder.products.map((product: POProduct, index: number) => (
                          <tr key={index}>
                            <td>{product.supc}</td>
                            <td>{product.description || 'N/A'}</td>
                            <td>{product.packSize || 'N/A'}</td>
                            <td className="text-center">{product.quantity}</td>
                            <td className="text-end">{formatCurrency(product.fobCost)}</td>
                            <td className="text-end">{formatCurrency(product.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th colSpan={4}></th>
                          <th className="text-end">Total:</th>
                          <th className="text-end">{formatCurrency(purchaseOrder.totalCost)}</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Tab>
                
                <Tab eventKey="activity" title="Activity Log">
                  {/* Activity Timeline */}
                  <h6 className="mb-3">Status History</h6>
                  <div className="timeline mb-4">
                    {purchaseOrder.history && purchaseOrder.history.length > 0 ? (
                      <div className="timeline-container">
                        {purchaseOrder.history.map((entry: POHistoryEntry, index: number) => (
                          <div key={index} className="timeline-item">
                            <div className="timeline-icon bg-primary">
                              <i className="bi bi-clock"></i>
                            </div>
                            <div className="timeline-content">
                              <div className="timeline-date text-muted">
                                {formatDate(entry.timestamp)}
                              </div>
                              <h6 className="timeline-title">
                                <Badge bg={getStatusVariant(entry.status as POStatus)}>
                                  {entry.status}
                                </Badge>
                                {entry.user && <span className="ms-2 fw-normal">by {entry.user}</span>}
                              </h6>
                              {entry.notes && (
                                <div className="timeline-text">
                                  {entry.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert variant="info">
                        No history available for this purchase order.
                      </Alert>
                    )}
                  </div>
                </Tab>
                
                <Tab eventKey="documents" title="Documents">
                  {/* Documents Section */}
                  <h6 className="mb-3">Attached Documents</h6>
                  {purchaseOrder.documents && purchaseOrder.documents.length > 0 ? (
                    <div className="list-group">
                      {purchaseOrder.documents.map((doc: PODocument) => (
                        <div key={doc.id} className="list-group-item list-group-item-action d-flex align-items-center">
                          <div>
                            <i className="bi bi-file-earmark me-2"></i>
                            <span className="fw-medium">{doc.name}</span>
                            <div className="text-muted small">
                              {doc.type} · {formatDate(doc.uploadedAt)}
                            </div>
                          </div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="ms-auto"
                            as="a"
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i>
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert variant="info">
                      No documents attached to this purchase order.
                    </Alert>
                  )}
                </Tab>
                
                <Tab eventKey="delivery" title="Delivery Info">
                  {/* Shipping & Delivery Info */}
                  <h6 className="mb-3">Shipping Information</h6>
                  {purchaseOrder.shipping ? (
                    <Row className="mb-4">
                      <Col md={6}>
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr>
                              <td className="fw-medium w-40">Carrier:</td>
                              <td>{purchaseOrder.shipping.carrier}</td>
                            </tr>
                            <tr>
                              <td className="fw-medium">Tracking #:</td>
                              <td>
                                <a href={`https://www.google.com/search?q=${purchaseOrder.shipping.carrier}+tracking+${purchaseOrder.shipping.trackingNumber}`} target="_blank" rel="noopener noreferrer">
                                  {purchaseOrder.shipping.trackingNumber}
                                  <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </Col>
                      <Col md={6}>
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr>
                              <td className="fw-medium w-40">Ship Date:</td>
                              <td>{formatDate(purchaseOrder.shipping.shippingDate)}</td>
                            </tr>
                            <tr>
                              <td className="fw-medium">Est. Delivery:</td>
                              <td>{formatDate(purchaseOrder.shipping.estimatedDeliveryDate)}</td>
                            </tr>
                            {purchaseOrder.shipping.actualDeliveryDate && (
                              <tr>
                                <td className="fw-medium">Actual Delivery:</td>
                                <td>{formatDate(purchaseOrder.shipping.actualDeliveryDate)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </Col>
                    </Row>
                  ) : (
                    <Alert variant="info" className="mb-4">
                      No shipping information available.
                    </Alert>
                  )}
                  
                  <h6 className="mb-3">Delivery Information</h6>
                  {purchaseOrder.delivery ? (
                    <Row className="mb-4">
                      <Col md={6}>
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr>
                              <td className="fw-medium w-40">Delivered On:</td>
                              <td>{formatDate(purchaseOrder.delivery.deliveryDate)}</td>
                            </tr>
                            <tr>
                              <td className="fw-medium">Received By:</td>
                              <td>{purchaseOrder.delivery.receivedBy}</td>
                            </tr>
                            <tr>
                              <td className="fw-medium">Condition:</td>
                              <td>
                                <Badge bg={
                                  purchaseOrder.delivery.condition === 'good' ? 'success' :
                                  purchaseOrder.delivery.condition === 'damaged' ? 'danger' : 'warning'
                                }>
                                  {purchaseOrder.delivery.condition === 'good' ? 'Good - No issues' :
                                   purchaseOrder.delivery.condition === 'damaged' ? 'Damaged' : 'Partial'}
                                </Badge>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </Col>
                    </Row>
                  ) : (
                    <Alert variant="info">
                      No delivery information available.
                    </Alert>
                  )}
                </Tab>
                
                <Tab eventKey="invoice" title="Invoice">
                  {/* Invoice Details */}
                  <h6 className="mb-3">Invoice Information</h6>
                  {purchaseOrder.invoice ? (
                    <Row className="mb-4">
                      <Col md={6}>
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr>
                              <td className="fw-medium w-40">Invoice #:</td>
                              <td>{purchaseOrder.invoice.invoiceNumber}</td>
                            </tr>
                            <tr>
                              <td className="fw-medium">Invoice Date:</td>
                              <td>{formatDate(purchaseOrder.invoice.invoiceDate)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </Col>
                      <Col md={6}>
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr>
                              <td className="fw-medium w-40">Amount:</td>
                              <td>{formatCurrency(purchaseOrder.invoice.amount)}</td>
                            </tr>
                            <tr>
                              <td className="fw-medium">Due Date:</td>
                              <td>{formatDate(purchaseOrder.invoice.dueDate)}</td>
                            </tr>
                            <tr>
                              <td className="fw-medium">Status:</td>
                              <td>
                                <Badge bg={
                                  purchaseOrder.invoice.status === 'paid' ? 'success' :
                                  purchaseOrder.invoice.status === 'overdue' ? 'danger' : 'warning'
                                }>
                                  {purchaseOrder.invoice.status || 'Pending'}
                                </Badge>
                              </td>
                            </tr>
                            {purchaseOrder.invoice.paidDate && (
                              <tr>
                                <td className="fw-medium">Paid On:</td>
                                <td>{formatDate(purchaseOrder.invoice.paidDate)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </Col>
                    </Row>
                  ) : (
                    <Alert variant="info">
                      No invoice information available.
                    </Alert>
                  )}
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
        
        {/* Right Column - Workflow and Actions */}
        <Col lg={4}>
          {/* Workflow Visualizer */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Order Workflow</h5>
            </Card.Header>
            <Card.Body>
              <WorkflowVisualizer
                currentStatus={purchaseOrder.header.status}
                statusHistory={purchaseOrder.history}
                availableTransitions={availableTransitions}
                onStatusChange={handleStatusChange}
              />
            </Card.Body>
          </Card>
          
          {/* Status Action Panel */}
          <StatusActionPanel
            po={purchaseOrder}
            onUpdate={handlePOUpdate}
            onStatusChange={handleStatusChange}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default PODetailPage;