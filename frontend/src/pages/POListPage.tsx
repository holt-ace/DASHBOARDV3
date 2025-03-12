import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Pagination, Badge, Dropdown, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '@/store';
import { 
  fetchPurchaseOrders,
  setPage,
  setSearchQuery,
  setStatusFilter,
  setDateRange,
  resetFilters,
  toggleItemSelection,
  selectAllItems,
  performBatchOperation,
  deletePurchaseOrder
} from '@/store/slices/poListSlice';
import { POStatus, POSearchParams, PurchaseOrder } from '@/types/purchaseOrder';


/**
 * POListPage Component
 * 
 * Page that displays a searchable, sortable list of purchase orders
 * with filtering capabilities and batch operations.
 * Now using real data from MongoDB instead of mock data.
 */
const POListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const { 
    items, 
    loading: poListLoading, 
    error, 
    pagination, 
    filters,
    selectedItems,
    batchOperations
  } = useSelector((state: RootState) => state.poList);
  
  // Local state for batch operation modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchOperation, setBatchOperation] = useState<string>('');
  const [batchStatus, setBatchStatus] = useState<POStatus | ''>('');
  const [actionLoading, setActionLoading] = useState<{
    delete: boolean;
    export: boolean;
    edit: boolean;
    deletePO?: string;
    exportPO?: string;
  }>({ delete: false, export: false, edit: false });
  
  // State for single-item operations
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPONumber, setCurrentPONumber] = useState<string>('');

  // Check if any items are selected
  const hasSelectedItems = selectedItems.length > 0;
  
  // Check if all visible items are selected
  const areAllSelected = items.length > 0 && 
    items.every(po => selectedItems.includes(po.header?.poNumber || ''));
  
  // Calculate total value of selected items
  const selectedTotalValue = items
    .filter(po => selectedItems.includes(po.header?.poNumber || ''))
    .reduce((sum, po) => sum + (po.totalCost || 0), 0);
  
  // Get selected POs for display
  const getSelectedPOs = (): PurchaseOrder[] => {
    return items.filter(po => 
      po.header?.poNumber && 
      selectedItems.includes(po.header.poNumber)
    );
  };

  // Fetch purchase orders on component mount and when filters change
  useEffect(() => {
    const params: Partial<POSearchParams> = {
      page: pagination.page,
      query: filters.query,
      // Convert string to POStatus enum if it's a valid status
      status: filters.status ? filters.status as POStatus : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    };
    
    dispatch(fetchPurchaseOrders(params));
  }, [dispatch, pagination.page]);

  // Handle toggling a single item selection
  const handleToggleSelection = (poNumber: string) => {
    dispatch(toggleItemSelection(poNumber));
  };

  // Handle toggling all items selection
  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(selectAllItems(e.target.checked));
  };

  // Handle opening batch operation modal
  const handleOpenBatchModal = (operation: string) => {
    setBatchOperation(operation);
    if (operation === 'status') {
      setBatchStatus('');
    }
    setShowBatchModal(true);
  };

  // Execute the batch operation
  const handleExecuteBatchOperation = async () => {
    if (batchOperation === 'status' && batchStatus) {
      await dispatch(performBatchOperation({ poNumbers: selectedItems, operation: 'status', params: { status: batchStatus } }));
    } else if (batchOperation === 'delete') {
      await dispatch(performBatchOperation({ poNumbers: selectedItems, operation: 'delete' }));
    }
    setShowBatchModal(false);
  };

  // Handle deleting a single purchase order
  const handleDeletePO = (poNumber: string) => {
    setCurrentPONumber(poNumber);
    console.log(`Preparing to delete PO: ${poNumber}`);
    setShowDeleteModal(true);
  };

  // Confirm deletion of a single purchase order
  const handleConfirmDelete = async () => {
    console.log(`Confirming deletion of PO: ${currentPONumber}`);
    setActionLoading({...actionLoading, delete: true, deletePO: currentPONumber});
    if (currentPONumber) {
      try {
        await dispatch(deletePurchaseOrder(currentPONumber));
        console.log(`Successfully dispatched delete for PO: ${currentPONumber}`);
        setShowDeleteModal(false);
        // Refresh the list after deletion
        dispatch(fetchPurchaseOrders({
          page: pagination.page,
          query: filters.query,
          status: filters.status ? filters.status as POStatus : undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined
        }));
      } catch (error) {
        console.error('Error deleting PO:', error);
        alert(`Failed to delete PO ${currentPONumber}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setActionLoading({...actionLoading, delete: false, deletePO: undefined});
      }
    }
  };

  // Handle editing a purchase order
  const handleEditPO = (poNumber: string) => {
    console.log(`Preparing to edit PO: ${poNumber}`);
    // Set a flag in sessionStorage to indicate edit mode
    sessionStorage.setItem('editMode', 'true');
    sessionStorage.setItem('editingPO', poNumber);
    
    // Navigate to the detail page
    try {
      navigate(`/purchase-orders/${poNumber}`);
      console.log(`Successfully navigated to edit page for PO: ${poNumber}`);
    } catch (error) {
      console.error('Error navigating to edit page:', error);
      alert(`Failed to navigate to edit page for PO ${poNumber}`);
    }
  };

  // Handle duplicating a purchase order
  const handleDuplicatePO = (poNumber: string) => {
    console.log(`Preparing to duplicate PO: ${poNumber}`);
    // Set a flag in sessionStorage to indicate duplication
    sessionStorage.setItem('duplicateMode', 'true');
    sessionStorage.setItem('duplicatingPO', poNumber);
    
    // Navigate to the create page
    try {
      navigate(`/purchase-orders/create`);
      console.log(`Successfully navigated to create page for duplicating PO: ${poNumber}`);
    } catch (error) {
      console.error('Error navigating to create page for duplication:', error);
      alert(`Failed to navigate to create page for duplicating PO ${poNumber}`);
    }
  };

  // Handle exporting a purchase order
  const handleExportPO = (poNumber: string) => {
    setActionLoading({...actionLoading, export: true, exportPO: poNumber});
    console.log(`Preparing to export PO: ${poNumber}`);
    
    // In a real implementation, this would call an API endpoint to generate and download a PDF/Excel file
    // For now, simulate the export with a timeout
    setTimeout(() => {
      try {
        // Create a dummy download to simulate export functionality
        const dummyLink = document.createElement('a');
        dummyLink.href = `data:text/plain;charset=utf-8,Purchase Order ${poNumber} Export Data`;
        dummyLink.download = `PO_${poNumber}_export.txt`;
        document.body.appendChild(dummyLink);
        dummyLink.click();
        document.body.removeChild(dummyLink);
      } finally {
        setActionLoading({...actionLoading, export: false, exportPO: undefined});
      }
    }, 1000);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'UPLOADED': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'SHIPPED': return 'primary';
      case 'INVOICED': return 'secondary';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'danger';
      default: return 'light';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Prevent default behavior for not-yet-implemented functionality
  const handleNotImplemented = (e: React.MouseEvent, feature: string) => {
    e.preventDefault();
    e.stopPropagation();
    alert(`${feature} functionality will be implemented in a future update.`);
  };
  

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    dispatch(setSearchQuery(searchValue));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setStatusFilter(e.target.value));
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = parseInt(e.target.value, 10);
    if (!isNaN(days)) {
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dispatch(setDateRange({ startDate: startDate.toISOString(), endDate }));
    }
  };

  const handlePageChange = (pageNumber: number) => {
    dispatch(setPage(pageNumber));
  };

  const handleApplyFilters = () => {
    const params: Partial<POSearchParams> = {
      page: pagination.page,
      query: filters.query,
      status: filters.status ? filters.status as POStatus : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    };
    
    dispatch(fetchPurchaseOrders(params));
  };

  const handleClearFilters = () => {
    dispatch(resetFilters());
    dispatch(fetchPurchaseOrders({ page: 1 }));
  };

  // Handle viewing a PO detail page
  const handleViewPO = (poNumber: string) => {
    navigate(`/purchase-orders/${poNumber}`);
  };


  // Handle cancelling batch operation
  const handleCancelBatchOperation = () => {
    setShowBatchModal(false);
  };

  // Pagination items
  const paginationItems = [];
  const totalPages = pagination.totalPages || 1;
  const currentPage = pagination.page;
  
  // Show at most 5 page links centered around current page
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    paginationItems.push(
      <Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>
        {i}
      </Pagination.Item>
    );
  }

  return (
    <Container fluid>
      {/* Page Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h2 mb-0 text-gray-800">Purchase Orders</h1>
        <Button 
          variant="primary" 
          onClick={() => navigate("/purchase-orders/create")}
          className="d-flex align-items-center"
        >
          <i className="bi bi-plus-lg me-2"></i>
          Create New PO          
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-light py-3">
          <h6 className="m-0 font-weight-bold">Filters & Search</h6>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6} lg={4}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="PO#, Supplier, etc."
                    value={filters.query}
                    onChange={handleSearch}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={6} lg={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={filters.status} onChange={handleStatusChange}>
                  <option value="">All Statuses</option>
                  {Object.values(POStatus).map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} lg={2}>
              <Form.Group>
                <Form.Label>Date Range</Form.Label>
                <Form.Select onChange={handleDateRangeChange}>
                  <option value="">Select Range</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} lg={3} className="d-flex align-items-end">
              <Button 
                variant="primary" 
                className="me-2"
                onClick={handleApplyFilters}
              >
                <i className="bi bi-funnel me-1"></i> Apply
              </Button>
              <Button 
                variant="outline-secondary"
                onClick={handleClearFilters}
              >
                <i className="bi bi-x-lg me-1"></i> Clear
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* PO Table */}
      <Card className="shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between mb-3">
            <div>
              <span className="text-muted">
                {hasSelectedItems ? (
                  <span className="text-primary fw-bold">
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                    {' '}({formatCurrency(selectedTotalValue)})
                    <Button size="sm" variant="link" className="p-0 ms-2" onClick={() => dispatch(selectAllItems(false))}>
                      Clear Selection
                    </Button>
                  </span>
                ) : (
                  `Showing ${items.length} of ${pagination.totalItems} entries`
                )}
              </span>
            </div>
            <div className="d-flex">
              <Dropdown className="me-2">
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <i className="bi bi-gear me-1"></i> Display Options
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item>Show 10 entries</Dropdown.Item>
                  <Dropdown.Item>Show 25 entries</Dropdown.Item>
                  <Dropdown.Item>Show 50 entries</Dropdown.Item>
                  <Dropdown.Item>Show all entries</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item>Customize columns</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* Batch Operations Dropdown */}
              <Dropdown className="ms-2">
                <Dropdown.Toggle 
                  variant={hasSelectedItems ? "primary" : "outline-secondary"}
                  size="sm"
                  disabled={!hasSelectedItems} 
                >
                  <i className="bi bi-list-check me-1"></i> Batch Actions
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleOpenBatchModal('status')}>
                    <i className="bi bi-arrow-repeat me-2"></i> Change Status
                  </Dropdown.Item>
                  <Dropdown.Item>
                    <i className="bi bi-file-earmark-arrow-down me-2"></i> Export Selected
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item className="text-danger" onClick={() => handleOpenBatchModal('delete')}>
                    <i className="bi bi-trash me-2"></i> Delete Selected
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* More Actions Dropdown */}
              <Dropdown className="ms-2">
                <Dropdown.Toggle variant="outline-secondary" size="sm" id="more-actions-dropdown">
                  <i className="bi bi-three-dots-vertical"></i> Actions
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={(e) => handleNotImplemented(e, "CSV Export")}>
                    <i className="bi bi-file-earmark-arrow-down me-2"></i> Export to CSV
                  </Dropdown.Item>
                  <Dropdown.Item onClick={(e) => handleNotImplemented(e, "PDF Export")}>
                    <i className="bi bi-file-earmark-pdf me-2"></i> Export to PDF
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => window.print()}>
                    <i className="bi bi-printer me-2"></i> Print
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
          
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead>
                <tr>
                  <th>
                    <Form.Check 
                      type="checkbox" 
                      checked={areAllSelected}
                      onChange={handleToggleSelectAll}
                      disabled={items.length === 0}
                    />
                  </th>
                  
                  <th>PO Number <i className="bi bi-arrow-down-up text-muted ms-1"></i></th>
                  <th>Date <i className="bi bi-arrow-down text-primary ms-1"></i></th>
                  <th>Supplier <i className="bi bi-arrow-down-up text-muted ms-1"></i></th>
                  <th>Items</th>
                  <th>Amount <i className="bi bi-arrow-down-up text-muted ms-1"></i></th>
                  <th>Status <i className="bi bi-arrow-down-up text-muted ms-1"></i></th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {poListLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-danger">
                      {error}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      No purchase orders found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : items.map(po => {
                  // Ensure poNumber is available for key
                  const poNumber = po.header?.poNumber || 'unknown';
                  return (
                    <tr key={poNumber}>
                      <td>
                        <Form.Check 
                          type="checkbox" 
                          id={`select-po-${poNumber}`}
                          checked={selectedItems.includes(poNumber)}
                          onChange={() => handleToggleSelection(poNumber)}
                          aria-label={`Select purchase order ${poNumber}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>
                        <Link 
                          to={`/purchase-orders/${poNumber}`} 
                          className="fw-bold text-decoration-none"
                        >
                          {poNumber}
                        </Link>
                      </td>
                      <td>{formatDate(po.header?.orderDate || '')}</td>
                      <td>{po.header?.buyerInfo?.firstName} {po.header?.buyerInfo?.lastName}</td>
                      <td>{po.products?.length || 0}</td>
                      <td>{formatCurrency(po.totalCost || 0)}</td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(po.header?.status || 'UNKNOWN')}>
                          {po.header?.status || 'UNKNOWN'}
                        </Badge>
                      </td>
                      <td>{po.header?.deliveryInfo?.date ? formatDate(po.header.deliveryInfo.date) : 'N/A'}</td>
                      <td>
                        <div className="d-flex">
                          <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleViewPO(poNumber)}>
                            <i className="bi bi-eye"></i>
                          </Button>
                          <Dropdown>
                            <Dropdown.Toggle 
                              variant="outline-secondary" 
                              title="Actions" 
                              size="sm" 
                              id={`dropdown-${poNumber}`}
                            >
                              <i className="bi bi-three-dots-vertical"></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item 
                                onClick={() => handleEditPO(poNumber)}
                                className="d-flex align-items-center"
                              >
                                <i className="bi bi-pencil me-2"></i>
                                <span>Edit</span>
                              </Dropdown.Item>
                              <Dropdown.Item 
                                onClick={() => handleDuplicatePO(poNumber)}
                                className="d-flex align-items-center"
                              >
                                <i className="bi bi-files me-2"></i>
                                <span>Duplicate</span>
                              </Dropdown.Item>
                              <Dropdown.Item 
                                onClick={() => handleExportPO(poNumber)}
                                disabled={actionLoading.export}
                                className="d-flex align-items-center"
                              >
                                {actionLoading.export && actionLoading.exportPO && actionLoading.exportPO === poNumber ? (
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-file-earmark-pdf me-2"></i>
                                )}
                                <span>Export</span>
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item 
                                className="text-danger d-flex align-items-center" 
                                onClick={() => handleDeletePO(poNumber)}
                                disabled={Boolean(actionLoading.delete && actionLoading.deletePO && actionLoading.deletePO === poNumber)}
                              > 
                                {actionLoading.delete && actionLoading.deletePO && actionLoading.deletePO === poNumber ? (
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-trash me-2"></i>
                                )}
                                <span>{actionLoading.delete && actionLoading.deletePO === poNumber ? 'Deleting...' : 'Delete'}</span>
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              <span className="text-muted">Page {pagination.page} of {pagination.totalPages}</span>
            </div>
            <Pagination className="mb-0">
              <Pagination.First 
                onClick={() => handlePageChange(1)} 
                disabled={pagination.page === 1} 
              />
              <Pagination.Prev 
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))} 
                disabled={pagination.page === 1}
              />
              {paginationItems}
              <Pagination.Next 
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))} 
                disabled={pagination.page === pagination.totalPages}
              />
              <Pagination.Last 
                onClick={() => handlePageChange(pagination.totalPages)} 
                disabled={pagination.page === pagination.totalPages}
              />
            </Pagination>
          </div>
        </Card.Body>
      </Card>

      {/* Batch Operation Modal */}
      <Modal 
        show={showBatchModal} 
        onHide={handleCancelBatchOperation}
        backdrop="static"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {batchOperation === 'status' && 'Change Status for Multiple POs'}
            {batchOperation === 'delete' && 'Delete Multiple Purchase Orders'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Status Change Operation */}
          {batchOperation === 'status' && (
            <>
              <p>
                You are about to change the status of <strong>{selectedItems.length}</strong> purchase order{selectedItems.length !== 1 ? 's' : ''}.
              </p>
              
              <Form.Group className="mb-3">
                <Form.Label>Select New Status</Form.Label>
                <Form.Select 
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value as POStatus)}
                  required
                >
                  <option value="">-- Select Status --</option>
                  {Object.values(POStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                This action will change the status for all selected purchase orders. 
                Please ensure the selected status is valid for all POs.
              </div>
            </>
          )}

          {/* Delete Operation */}
          {batchOperation === 'delete' && (
            <>
              <div className="alert alert-danger mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Warning:</strong> This action cannot be undone.
              </div>
              
              <p>You are about to delete the following purchase orders:</p>
              
              <div className="table-responsive mb-3">
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>PO Number</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSelectedPOs().map((po) => (
                      <tr key={po.header?.poNumber}>
                        <td>{po.header?.poNumber}</td>
                        <td>{formatDate(po.header?.orderDate || '')}</td>
                        <td>{po.header?.status}</td>
                        <td className="text-end">{formatCurrency(po.totalCost || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelBatchOperation}>
            Cancel
          </Button>
          <Button 
            variant={batchOperation === 'delete' ? 'danger' : 'primary'} 
            onClick={handleExecuteBatchOperation}
            disabled={(batchOperation === 'status' && !batchStatus) || batchOperations.processing}
          >
            {batchOperations.processing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : (
              <>
                {batchOperation === 'status' && 'Apply Status Change'}
                {batchOperation === 'delete' && 'Confirm Delete'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Single PO Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        backdrop="static"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Purchase Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Warning:</strong> This action cannot be undone.
          </div>
          
          <p>Are you sure you want to delete purchase order <strong>{currentPONumber}</strong>?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={actionLoading.delete}
          >
            {actionLoading.delete ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : (
              'Delete Purchase Order'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default POListPage;