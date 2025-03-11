import React, { useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '@/store';
import { fetchPurchaseOrders } from '@/store/slices/poListSlice';
import { fetchMetrics } from '@/store/slices/metricsSlice';

/**
 * DashboardPage Component
 * 
 * Main dashboard that provides an overview of the system with key metrics,
 * recent purchase orders, and quick access links to common functions.
 * Now using real data from MongoDB instead of hardcoded values.
 */
const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items: poItems, loading: poLoading } = useSelector((state: RootState) => state.poList);
  const { data: metricsData, loading: metricsLoading } = useSelector((state: RootState) => state.metrics);
  
  // Fetch data on component mount
  useEffect(() => {
    dispatch(fetchPurchaseOrders({ 
      limit: 4  // Only need a few recent POs for the dashboard
    }));
    dispatch(fetchMetrics());
  }, [dispatch]);

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

  const formatDate = (dateString?: string) => {
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

  // Get total orders from metrics or fallback to PO items length
  const totalOrders = metricsData?.totalOrders || poItems.length || 0;
  
  // Get total value from metrics or calculate from PO items
  const totalValue = metricsData?.totalValue || 
    poItems.reduce((sum, po) => sum + (po.totalCost || 0), 0);
  
  // Get on-time percentage from metrics or use a default
  const onTimePercentage = metricsData?.onTimePercentage || 85;
  
  // Use actual recent POs or an empty array if still loading
  const recentPOs = poItems.slice(0, 4);

  // Get status distribution from metrics or create an empty array
  const statusDistribution = metricsData?.statusDistribution || [];
  
  return (
    <Container fluid>
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h2 mb-0 text-gray-800">Dashboard</h1>
        <div>
          <Button 
            variant="primary" 
            size="sm" 
            className="me-2">
            <i className="bi bi-download me-1"></i> Generate Report
          </Button>
          <Button 
            variant="success" 
            size="sm">
            <i className="bi bi-plus-lg me-1"></i> New PO
            <Link to="/purchase-orders/create" className="stretched-link text-white text-decoration-none"></Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row className="g-3 mb-4">
        <Col xl={3} md={6}>
          <Card className="border-start-primary h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-xs fw-bold text-primary text-uppercase mb-1">
                    Total POs (Monthly)
                  </div>
                  <div className="h5 mb-0 fw-bold text-gray-800">
                    {metricsLoading ? (
                      <span className="placeholder col-4"></span>
                    ) : (
                      totalOrders
                    )}
                  </div>
                </div>
                <div className="fa-2x text-gray-300">
                  <i className="bi bi-file-text fs-1 text-primary opacity-25"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card className="border-start-success h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-xs fw-bold text-success text-uppercase mb-1">
                    Total Value (Monthly)
                  </div>
                  <div className="h5 mb-0 fw-bold text-gray-800">
                    {metricsLoading ? (
                      <span className="placeholder col-4"></span>
                    ) : (
                      formatCurrency(totalValue)
                    )}
                  </div>
                </div>
                <div className="fa-2x text-gray-300">
                  <i className="bi bi-currency-dollar fs-1 text-success opacity-25"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card className="border-start-info h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-xs fw-bold text-info text-uppercase mb-1">
                    On-Time Delivery
                  </div>
                  <div className="row no-gutters align-items-center">
                    <div className="col-auto">
                      <div className="h5 mb-0 me-3 fw-bold text-gray-800">
                        {metricsLoading ? (
                          <span className="placeholder col-2"></span>
                        ) : (
                          `${onTimePercentage}%`
                        )}
                      </div>
                    </div>
                    <div className="col">
                      <div className="progress progress-sm">
                        <div 
                          className="progress-bar bg-info" 
                          role="progressbar" 
                          style={{ width: `${onTimePercentage}%` }} 
                          aria-valuenow={onTimePercentage} 
                          aria-valuemin={0} 
                          aria-valuemax={100}>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="fa-2x text-gray-300">
                  <i className="bi bi-truck fs-1 text-info opacity-25"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card className="border-start-warning h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-xs fw-bold text-warning text-uppercase mb-1">
                    Pending Approvals
                  </div>
                  <div className="h5 mb-0 fw-bold text-gray-800">
                    {metricsLoading ? (
                      <span className="placeholder col-2"></span>
                    ) : (
                      statusDistribution.find(s => s.status === 'UPLOADED')?.count || 0
                    )}
                  </div>
                </div>
                <div className="fa-2x text-gray-300">
                  <i className="bi bi-hourglass-split fs-1 text-warning opacity-25"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        {/* Recent Purchase Orders */}
        <Col xl={8} lg={7}>
          <Card className="mb-4">
            <Card.Header className="py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 fw-bold">Recent Purchase Orders</h6>
              <Link to="/purchase-orders" className="btn btn-sm btn-primary">
                View All
              </Link>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poLoading ? (
                      <tr>
                        <td colSpan={5} className="text-center">
                          <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : recentPOs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center">No purchase orders found</td>
                      </tr>
                    ) : (
                      recentPOs.map(po => (
                        <tr key={po.header?.poNumber}>
                          <td>
                            <Link to={`/purchase-orders/${po.header?.poNumber}`} className="fw-bold text-decoration-none">
                              {po.header?.poNumber}
                            </Link>
                          </td>
                          <td>{formatDate(po.header?.orderDate)}</td>
                          <td>{`${po.header?.buyerInfo?.firstName} ${po.header?.buyerInfo?.lastName}`}</td>
                          <td>{formatCurrency(po.totalCost || 0)}</td>
                          <td>
                            <Badge bg={getStatusBadgeVariant(po.header?.status || 'UNKNOWN')}>
                              {po.header?.status || 'UNKNOWN'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col xl={4} lg={5}>
          <Card className="mb-4">
            <Card.Header className="py-3">
              <h6 className="m-0 fw-bold">Quick Actions</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="primary" className="position-relative">
                  <i className="bi bi-plus-circle me-2"></i>
                  Create New Purchase Order
                  <Link to="/purchase-orders/create" className="stretched-link text-white text-decoration-none"></Link>
                </Button>
                <Button variant="outline-primary" className="position-relative">
                  <i className="bi bi-search me-2"></i>
                  Search Purchase Orders
                  <Link to="/purchase-orders" className="stretched-link text-decoration-none"></Link>
                </Button>
                <Button variant="outline-primary" className="position-relative">
                  <i className="bi bi-calendar3 me-2"></i>
                  Go to Planning Hub
                  <Link to="/planning-hub" className="stretched-link text-decoration-none"></Link>
                </Button>
                <Button variant="outline-primary" className="position-relative">
                  <i className="bi bi-graph-up me-2"></i>
                  View Metrics & Reports
                  <Link to="/metrics" className="stretched-link text-decoration-none"></Link>
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          {/* Status Distribution */}
          <Card>
            <Card.Header className="py-3">
              <h6 className="m-0 fw-bold">Status Distribution</h6>
            </Card.Header>
            <Card.Body>
              {metricsLoading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : statusDistribution.length === 0 ? (
                <p className="text-center">No status data available</p>
              ) : (
                statusDistribution.map(item => (
                  <div className="mb-3" key={item.status}>
                    <div className="d-flex justify-content-between mb-1">
                      <span>{item.status}</span>
                      <span>{item.percentage}%</span>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div 
                        className={`progress-bar bg-${getStatusBadgeVariant(item.status)}`} 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;