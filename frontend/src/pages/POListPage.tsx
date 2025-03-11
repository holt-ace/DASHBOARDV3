import React, { useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Pagination, Badge, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '@/store';
import { 
  fetchPurchaseOrders,
  setPage,
  setSearchQuery,
  setStatusFilter,
  setDateRange,
  resetFilters
} from '@/store/slices/poListSlice';
import { POStatus, POSearchParams } from '@/types/purchaseOrder';

/**
 * POListPage Component
 * 
 * Page that displays a searchable, sortable list of purchase orders
 * with filtering capabilities and batch operations.
 * Now using real data from MongoDB instead of mock data.
 */
const POListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { 
    items, 
    loading, 
    error, 
    pagination, 
    filters 
  } = useSelector((state: RootState) => state.poList);

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
          className="position-relative"
        >
          <i className="bi bi-plus-lg me-2"></i>
          Create New PO
          <Link 
            to="/purchase-orders/create" 
            className="stretched-link text-white text-decoration-none"
          />
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
                Showing {items.length} of {pagination.totalItems} entries
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
              
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <i className="bi bi-three-dots-vertical"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item><i className="bi bi-file-earmark-arrow-down me-2"></i> Export to CSV</Dropdown.Item>
                  <Dropdown.Item><i className="bi bi-file-earmark-pdf me-2"></i> Export to PDF</Dropdown.Item>
                  <Dropdown.Item><i className="bi bi-printer me-2"></i> Print</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item><i className="bi bi-trash me-2"></i> Delete selected</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
          
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead>
                <tr>
                  <th>
                    <Form.Check type="checkbox" />
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
                {loading ? (
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
                        <Form.Check type="checkbox" />
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
                          <Button variant="outline-primary" size="sm" className="me-1">
                            <i className="bi bi-eye"></i>
                            <Link 
                              to={`/purchase-orders/${poNumber}`}
                              className="stretched-link"
                            />
                          </Button>
                          <Dropdown>
                            <Dropdown.Toggle 
                              variant="outline-secondary" 
                              size="sm" 
                              id={`dropdown-${poNumber}`}
                            >
                              <i className="bi bi-three-dots-vertical"></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item><i className="bi bi-pencil me-2"></i> Edit</Dropdown.Item>
                              <Dropdown.Item><i className="bi bi-files me-2"></i> Duplicate</Dropdown.Item>
                              <Dropdown.Item><i className="bi bi-file-earmark-pdf me-2"></i> Export</Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item className="text-danger"><i className="bi bi-trash me-2"></i> Delete</Dropdown.Item>
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
    </Container>
  );
};

export default POListPage;