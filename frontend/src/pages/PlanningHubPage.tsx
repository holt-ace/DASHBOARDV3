import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Nav, Tab, Form, Dropdown } from 'react-bootstrap';
import { ApiService } from '@/services/ApiService'; 
// Lazy load visualization components
const CalendarView = lazy(() => import('@/components/visualizations/CalendarView'));
const KanbanBoard = lazy(() => import('@/components/visualizations/KanbanBoard'));
const TimelineView = lazy(() => import('@/components/visualizations/TimelineView'));
const GeographicMap = lazy(() => import('@/components/visualizations/GeographicMap'));
import Logger from '@/utils/logger';
import DebugHelper from '@/utils/debugHelper';
import Navigation from '@/utils/navigation';
import ErrorBoundary from '@/components/common/ErrorBoundary';

/**
 * PlanningHubPage Component
 * 
 * A visualization hub for planning purchase orders across different views
 * including calendar, kanban, timeline, and geographic perspectives.
 */
const PlanningHubPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'calendar' | 'kanban' | 'timeline' | 'map'>('calendar');
  // Loading state for refreshes
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Calendar view specific state
  const [calendarDateField, setCalendarDateField] = useState<'orderDate' | 'deliveryDate' | 'shipDate' | 'invoiceDate'>('orderDate');
  const [calendarDateRange, setCalendarDateRange] = useState<'this-month' | 'next-month' | 'next-3-months' | 'custom'>('this-month');
  const [calendarRange, setCalendarRange] = useState<'month' | 'week' | 'day'>('month');

  // Kanban board specific state
  const [kanbanGroupBy, setKanbanGroupBy] = useState<'status' | 'supplier' | 'location' | 'buyer'>('status');
  const [kanbanSortBy, setKanbanSortBy] = useState<'orderDate' | 'amount' | 'dueDate' | 'priority'>('orderDate');
  const [kanbanFilterStatus, setKanbanFilterStatus] = useState<'all' | 'open' | 'completed' | 'custom'>('all');
  
  // Timeline view specific state
  const [timelineRange, setTimelineRange] = useState<'month' | 'quarter' | '6months' | 'year' | 'custom'>('month');
  const [timelineGroupBy, setTimelineGroupBy] = useState<'none' | 'supplier' | 'status' | 'location'>('none');
  
  // Timeline view milestone type
  const [timelineMilestoneType, setTimelineMilestoneType] = useState<'all' | 'status' | 'delivery' | 'payment'>('all');
  
  // Geographic map specific state
  const [mapRegion, setMapRegion] = useState<'all' | 'north-america' | 'europe' | 'asia-pacific' | 'latin-america'>('all');
  const [mapTimePeriod, setMapTimePeriod] = useState<'current-month' | 'last-3-months' | 'ytd' | 'custom'>('current-month');
  const [mapDeliveryStatus, setMapDeliveryStatus] = useState<'all' | 'pending' | 'in-transit' | 'delivered'>('all');
  
  // Selected items for batch operations
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  

  // Refresh data only when view mode changes
  useEffect(() => {
    DebugHelper.componentDidMount('PlanningHubPage', { viewMode });
    // Preload data for current view
    refreshCurrentView();
    
    return () => {
      DebugHelper.componentWillUnmount('PlanningHubPage');
    };
  }, [viewMode]);

  // Track total PO count
  const [totalPOCount, setTotalPOCount] = useState<number>(0);

  // Create loading placeholder to reduce layout shifts
  const loadingPlaceholder = useMemo(() => (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '600px' }}>
      <span className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} />
    </div>
  ), []);
  
  // Handle calendar view configuration changes
  const handleCalendarViewChange = (field: string, value: string) => {
    if (field === 'dateField') {
      setCalendarDateField(value as 'orderDate' | 'deliveryDate' | 'shipDate' | 'invoiceDate');  
    } else if (field === 'dateRange') {
      setCalendarDateRange(value as 'this-month' | 'next-month' | 'next-3-months' | 'custom');
    } else if (field === 'range') {
      setCalendarRange(value as 'month' | 'week' | 'day');  
    }
  };
  
  // Handle kanban board configuration changes
  const handleKanbanViewChange = (field: string, value: string) => {
    if (field === 'groupBy') {
      setKanbanGroupBy(value as 'status' | 'supplier' | 'location' | 'buyer');
    } else if (field === 'sortBy') {
      setKanbanSortBy(value as 'orderDate' | 'amount' | 'dueDate' | 'priority');
    } else if (field === 'filterStatus') {
      setKanbanFilterStatus(value as 'all' | 'open' | 'completed' | 'custom');
    }
  };
  
  // Handle timeline view configuration changes
  const handleTimelineViewChange = (field: string, value: string) => {
    if (field === 'timeRange') {
      setTimelineRange(value as 'month' | 'quarter' | '6months' | 'year' | 'custom');
    } else if (field === 'groupBy') {
      setTimelineGroupBy(value as 'none' | 'supplier' | 'status' | 'location');
    } else if (field === 'milestoneType') {
      setTimelineMilestoneType(value as 'all' | 'status' | 'delivery' | 'payment');
    }
  };
  
  // Handle map view configuration changes
  const handleMapViewChange = (field: string, value: string) => {
    if (field === 'region') {
      setMapRegion(value as 'all' | 'north-america' | 'europe' | 'asia-pacific' | 'latin-america');
    } else if (field === 'deliveryStatus') {
      setMapDeliveryStatus(value as 'all' | 'pending' | 'in-transit' | 'delivered');
    } else if (field === 'timePeriod') {
      setMapTimePeriod(value as 'current-month' | 'last-3-months' | 'ytd' | 'custom');
    }
  };
  
  // Refresh the current view data
  const handleTimeRangeChange = (newRange: 'month' | 'quarter' | '6months' | 'year' | 'custom') => {
    Logger.debug('PlanningHubPage.handleTimeRangeChange called with:', newRange);
    
    // Set the timeline range state
    if (newRange !== timelineRange) {
      setTimelineRange(newRange as 'month' | 'quarter' | '6months' | 'year' | 'custom');
      
      // If there's additional logic that should happen on time range change,
      // it can be added here. This provides a clean separation of concerns
      // without misusing the PO selection callback.
      refreshCurrentView();
    }
  };
  
  const refreshCurrentView = async () => {
    if (!isLoading) {
      setIsLoading(true);
      
      // Get date range based on current view
      const now = new Date();
      let startDate = new Date(now);
      let endDate = new Date(now);
      
      // Adjust date ranges based on view mode
      if (viewMode === 'calendar') {
        if (calendarDateRange === 'this-month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (calendarDateRange === 'next-month') {
          startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        } else if (calendarDateRange === 'next-3-months') {
          startDate = new Date();
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 3);
        }
      } else if (viewMode === 'timeline') {
        if (timelineRange === 'month') {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (timelineRange === 'quarter') {
          startDate.setMonth(startDate.getMonth() - 3);
        } else if (timelineRange === '6months') {
          startDate.setMonth(startDate.getMonth() - 6);
        } else if (timelineRange === 'year') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        }
      }
      
      try {
        // Fetch PO data from API with proper limit
        const response = await ApiService.fetchPOs({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 100, // Get more data for visualizations
          page: 1
        });
  
        // Store data and counts
        if (response && response.metadata) {
          setTotalPOCount(response.metadata.total);
        }
      } catch (err) {
        Logger.error('Error refreshing data:', err);
      } finally {
        // Add a small delay to prevent rapid re-requests if user clicks quickly
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }
    }
  };
  
  // Apply filters for the current view
  const handleApplyFilters = () => {
    Logger.debug('handleApplyFilters called');
    Logger.debug(`Filter button clicked - current view mode: ${viewMode}`);
    // For now we'll just refresh the data
    // In a more complex implementation, we would pass filter params to the components
    refreshCurrentView();
  };

  // Handle status change from kanban board drag drop
  const handleStatusChange = async (poNumber: string, newStatus: string) => {
    Logger.debug(`handleStatusChange called with: ${poNumber}, ${newStatus}`);
    
    try {
      setIsLoading(true);
      
      if (!poNumber || !newStatus) {
        Logger.error('Invalid arguments for status change');
        return;
      }
      
      // Call the actual API to update status
      await ApiService.updateStatus(poNumber, newStatus as any);
      Logger.info(`Successfully changed status of ${poNumber} to ${newStatus}`);
      
      // Refresh data to show the updated status
      refreshCurrentView();
    } finally {
    }
  };

  // Handle batch selection changes from visualization components
  // This function will be properly connected when the visualization
  const handleBatchSelectionChange = (items: string[]) => {
    // Set the selected items
    setSelectedItems(items);
    
    // Log selection changes
    Logger.debug(`Selection changed: ${items.length} items selected: ${items.join(', ')}`);
  };
  
  // Handle batch operation execution
  const handleBatchOperation = (operation: 'statusChange' | 'edit' | 'duplicate' | 'export' | 'delete', params?: Record<string, any>) => {
    Logger.debug('handleBatchOperation called with:', { operation, params });
    Logger.debug(`Executing batch operation: ${operation}`, { params });
    
    if (selectedItems.length === 0) return;
    
    setIsBatchProcessing(true);
    
    // Simulate API call with a timeout
    setTimeout(() => {
      // In a real implementation, this would call an API with the operation and selected items
      Logger.info(`Completed batch operation: ${operation}`, { selectedItems, params });
      
      setIsBatchProcessing(false);
      
      // After the operation completes, update selection
      handleBatchSelectionChange([]);
      setSelectedItems([]); // Clear selection after operation completes
    }, 1500);
  };
  
  // Handle PO selection in visualizations
  const handlePOSelect = (poNumber: string) => {
    Logger.debug('handlePOSelect called with:', { poNumber, type: typeof poNumber });
    
    try {
      if (typeof poNumber === 'string' && poNumber.startsWith('PO')) {
        // Navigate to the PO detail page
        Logger.info('[NAVIGATION] Navigating to PO detail page:', `/purchase-orders/${poNumber}`);
        
        // Wrap in try-catch to prevent unhandled exceptions from navigation
        try {
          Navigation.toPODetail(poNumber);
        } catch (navError) {
          Logger.error('[NAVIGATION ERROR] Failed to navigate:', navError);
        }
      } else {
        Logger.debug('[NAVIGATION] Non-PO selection detected:', poNumber);  // For non-PO selections like filter values
      }
    } catch (error) {
      Logger.error('[CRITICAL] Unexpected error in handlePOSelect:', error);
    }
  };
  
  // Error handler to catch rendering errors for visualization components
  const handleRenderError = (componentName: string, error: Error) => {
    Logger.error(`[CRITICAL] Error rendering ${componentName}:`, error);
    DebugHelper.renderError(componentName, error);
  };
  
  // Wrap component rendering with error handling
  const safeRender = (node: React.ReactNode, componentName: string): React.ReactNode => {
    try {
      Logger.debug(`[RENDER] About to render ${componentName}`);
      return node;
    } catch (error) {
      handleRenderError(componentName, error as Error);
      return (
        <div className="alert alert-danger m-3">
          Error rendering {componentName}. Please check the console for details.
        </div>
      );
    }
  };
  
  return (
    <Container fluid>
      {/* Page Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h2 mb-0 text-gray-800">Planning Hub</h1>
        
        {/* Total PO count indicator */}
        <div className="d-flex align-items-center me-3">
          <span className="badge bg-primary p-2 rounded-pill">
            {isLoading ? "Loading..." : `${totalPOCount} Purchase Orders`}
          </span> 
        </div>
        
        <div>
          <Button variant="primary" onClick={() => Navigation.toPOCreation()}>
            {/* Note: This button navigates to the purchase order creation page */}
            <i className="bi bi-plus-lg me-1"></i>
            New PO
          </Button>
        </div>
      </div>
      
      {/* Visualization Controls */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-light py-3">
          <Row className="align-items-center">
            <Col>
              <h5 className="m-0 fw-bold">Visualization Options</h5>
            </Col>
            <Col xs="auto">
              <Nav 
                variant="pills" 
                activeKey={viewMode} 
                onSelect={(key) => setViewMode(key as any)}
                className="nav-pills-toggle"
              >
                <Nav.Item>
                  <Nav.Link eventKey="calendar" title="Calendar View">
                    <i className="bi bi-calendar3 me-1"></i>
                    <span className="d-none d-md-inline">Calendar</span>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="kanban" title="Kanban Board">
                    <i className="bi bi-kanban me-1"></i>
                    <span className="d-none d-md-inline">Kanban</span>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="timeline" title="Timeline View">
                    <i className="bi bi-bar-chart-steps me-1"></i>
                    <span className="d-none d-md-inline">Timeline</span>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="map" title="Geographic Map">
                    <i className="bi bi-geo-alt me-1"></i>
                    <span className="d-none d-md-inline">Map</span>
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
          </Row>
        </Card.Header>
        
        <Card.Body>
          <Tab.Content>
            <Tab.Pane active={viewMode === 'calendar'}>
              <Row className="g-3">
                <Col md={4} lg={3}>
                  <Form.Group controlId="calendarDateRange">
                    <Form.Label>Date Range</Form.Label>
                    <Form.Select value={calendarDateRange} onChange={(e) => handleCalendarViewChange('dateRange', e.target.value)}>
                      <option value="this-month">This Month</option>
                      <option value="next-month">Next Month</option>
                      <option value="next-3-months">Next 3 Months</option>
                      <option>Custom Range</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4} lg={3}>
                  <Form.Group controlId="calendarViewType">
                    <Form.Label>View Type</Form.Label>
                    <Form.Select 
                      value={calendarRange} 
                      onChange={(e) => handleCalendarViewChange('range', e.target.value)}
                    >
                      <option value="month">Month View</option>
                      <option value="week">Week View</option>
                      <option value="day">Day View</option>
                      <option value="agenda">Agenda View</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4} lg={3}>
                  <Form.Group controlId="calendarDateField">
                    <Form.Label>Date Field</Form.Label>
                    <Form.Select 
                      value={calendarDateField} 
                      onChange={(e) => handleCalendarViewChange('dateField', e.target.value)}
                    >
                      <option value="orderDate">Order Date</option>
                      <option value="deliveryDate">Expected Delivery</option>
                      <option value="shipDate">Ship Date</option>
                      <option value="invoiceDate">Actual Delivery</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col lg={3} className="d-flex align-items-end">
                  <Button variant="primary" onClick={handleApplyFilters} disabled={isLoading}>{isLoading ? "Loading..." : "Apply Filters"}</Button>
                </Col>
              </Row>
            </Tab.Pane>
            
            <Tab.Pane active={viewMode === 'kanban'}>
              <Row className="g-3">
                <Col md={4} lg={3}>
                  <Form.Group controlId="kanbanGroupBy">
                    <Form.Label>Group By</Form.Label>
                    <Form.Select value={kanbanGroupBy} onChange={(e) => handleKanbanViewChange('groupBy', e.target.value)}>
                      <option>Status</option>
                      <option>Supplier</option>
                      <option>Location</option>
                      <option>Buyer</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4} lg={3}>
                  <Form.Group controlId="kanbanSortBy">
                    <Form.Label>Sort By</Form.Label>
                    <Form.Select value={kanbanSortBy} onChange={(e) => handleKanbanViewChange('sortBy', e.target.value)}>
                      <option>Order Date</option>
                      <option>Amount</option>
                      <option>Due Date</option>
                      <option>Priority</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4} lg={3}>
                  <Form.Group>
                    <Form.Label>Filter Status</Form.Label>
                    <Form.Select value={kanbanFilterStatus} onChange={(e) => handleKanbanViewChange('filterStatus', e.target.value)}>
                      <option value="all">All Statuses</option>
                      <option value="open">Open Orders Only</option>
                      <option value="completed">Completed Orders Only</option>
                      <option value="custom">Custom Selection</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col lg={3} className="d-flex align-items-end">
                  <Button variant="primary" onClick={handleApplyFilters} disabled={isLoading}>{isLoading ? "Loading..." : "Apply Layout"}</Button>
                </Col>
              </Row>
            </Tab.Pane>
            
            <Tab.Pane active={viewMode === 'timeline'}>
              <Row className="g-3">
                <Col md={4} lg={3}>
                  <Form.Group controlId="timelineTimeRange">
                    <Form.Label>Time Range</Form.Label>
                    <Form.Select value={timelineRange} onChange={(e) => handleTimelineViewChange('timeRange', e.target.value)}>
                      <option>Last 30 Days</option>
                      <option>Last 90 Days</option>
                      <option>Last 6 Months</option>
                      <option>Last Year</option>
                      <option>Custom Range</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4} lg={3}>
                  <Form.Group controlId="timelineGroupBy">
                    <Form.Label>Group By</Form.Label>
                    <Form.Select value={timelineGroupBy} onChange={(e) => handleTimelineViewChange('groupBy', e.target.value)}>
                      <option>None</option>
                      <option>Supplier</option>
                      <option>Status</option>
                      <option>Location</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4} lg={3}>
                  <Form.Group>
                    <Form.Label>Milestone Type</Form.Label>
                    <Form.Select value={timelineMilestoneType} onChange={(e) => handleTimelineViewChange('milestoneType', e.target.value)}>
                      <option value="all">All Events</option>
                      <option value="status">Status Changes Only</option>
                      <option value="delivery">Delivery Milestones</option>
                      <option value="payment">Payment Milestones</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col lg={3} className="d-flex align-items-end">
                  <Button variant="primary" onClick={handleApplyFilters} disabled={isLoading}>{isLoading ? "Loading..." : "Apply View"}</Button>
                </Col>
              </Row>
            </Tab.Pane>
            
            <Tab.Pane active={viewMode === 'map'}>
              <Row className="g-3">
                <Col md={4} lg={3}>
                  <Form.Group controlId="mapRegion">
                    <Form.Label>Region</Form.Label>
                    <Form.Select value={mapRegion} onChange={(e) => handleMapViewChange('region', e.target.value)}>
                      <option>All Regions</option>
                      <option>North America</option>
                      <option>Europe</option>
                      <option>Asia Pacific</option>
                      <option>Latin America</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4} lg={3}>
                  <Form.Group controlId="mapDeliveryStatus">
                    <Form.Label>Delivery Status</Form.Label>
                    <Form.Select value={mapDeliveryStatus} onChange={(e) => handleMapViewChange('deliveryStatus', e.target.value)}>
                      <option>All Orders</option>
                      <option>Pending Delivery</option>
                      <option>In Transit</option>
                      <option>Delivered</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4} lg={3}>
                  <Form.Group>
                    <Form.Label>Time Period</Form.Label>
                    <Form.Select value={mapTimePeriod} onChange={(e) => handleMapViewChange('timePeriod', e.target.value)}>
                      <option value="current-month">Current Month</option>
                      <option value="last-3-months">Last 3 Months</option>
                      <option value="ytd">YTD</option>
                      <option value="custom">Custom Range</option>
                    </Form.Select> 
                  </Form.Group>
                </Col>
                
                <Col lg={3} className="d-flex align-items-end">
                  <Button variant="primary" onClick={handleApplyFilters} disabled={isLoading}>{isLoading ? "Loading..." : "Update Map"}</Button>
                </Col>
              </Row>
            </Tab.Pane>
          </Tab.Content>
        </Card.Body>
      </Card>
      
      {/* Visualization content */}
      <Card className="mb-4 shadow-sm" style={{ minHeight: '600px' }}>
        <Card.Body className="p-0">
          <Suspense fallback={loadingPlaceholder}>
          {viewMode === 'calendar' && (
            <div className="calendar-container" style={{ height: '600px' }}>
              {safeRender(<CalendarView 
                dateField={calendarDateField} 
                range={calendarRange}
                onPOSelect={handlePOSelect} 
                className="h-100"
              />, 'CalendarView')}
            </div>
          )}
          
          {viewMode === 'kanban' && (
            <div className="kanban-container" style={{ height: '600px' }}>
              {safeRender(<KanbanBoard 
                groupBy={kanbanGroupBy} 
                sortBy={kanbanSortBy}
                filterStatus={kanbanFilterStatus}
                onPOSelect={handlePOSelect}
                onStatusChange={handleStatusChange}
                className="h-100"
              />, 'KanbanBoard')}
            </div>
          )}
          
          {viewMode === 'timeline' && (
            <div className="timeline-container" style={{ height: '600px' }}>
              {safeRender(
                <ErrorBoundary 
                  componentName="TimelineView" 
                  onRetry={() => refreshCurrentView()}
                >
                  <TimelineView 
                    timeRange={timelineRange} 
                    groupBy={timelineGroupBy}
                    onTimeRangeChange={handleTimeRangeChange}
                    onPOSelect={handlePOSelect}
                    milestoneType={timelineMilestoneType} 
                    className="h-100"
                  />
                </ErrorBoundary>,
                'TimelineView')}
            </div>
          )}
          
          {viewMode === 'map' && (
            <div className="map-container" style={{ height: '600px' }}>
              {safeRender(<GeographicMap 
                region={mapRegion}
                deliveryStatus={mapDeliveryStatus}
                timePeriod={mapTimePeriod}
                onBatchSelectionChange={handleBatchSelectionChange}
                onPOSelect={handlePOSelect} 
                className="h-100"
              />, 'GeographicMap')}
            </div>
          )}
          </Suspense>
        </Card.Body>
      </Card>
      
      {/* Operations Panel (batch actions) */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light py-3">
          <h5 className="mb-0 fw-bold">Batch Operations</h5>
        </Card.Header>
        <Card.Body>
          <p className="mb-3">
            Selected Items: <span className="fw-bold">{selectedItems.length}</span>
            {selectedItems.length > 0 && (
              <small className="ms-2 text-muted">({selectedItems.join(", ")})</small>
            )}
          </p>
          
          <div className="d-flex flex-wrap gap-2">
            <Dropdown>
              <Dropdown.Toggle variant="primary" disabled={selectedItems.length === 0 || isBatchProcessing}>
                <i className="bi bi-check-circle me-1"></i> Status Change
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => handleBatchOperation('statusChange', { status: 'CONFIRMED' })}>Mark as Confirmed</Dropdown.Item>
                <Dropdown.Item onClick={() => handleBatchOperation('statusChange', { status: 'SHIPPED' })}>Mark as Shipped</Dropdown.Item>
                <Dropdown.Item onClick={() => handleBatchOperation('statusChange', { status: 'DELIVERED' })}>Mark as Delivered</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item className="text-danger" onClick={() => handleBatchOperation('statusChange', { status: 'CANCELLED' })}>Mark as Cancelled</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Button variant="outline-primary" disabled={selectedItems.length === 0 || isBatchProcessing} onClick={() => handleBatchOperation('edit')}>
              <i className="bi bi-pencil me-1"></i> Edit Selected
            </Button>
            
            <Button variant="outline-primary" disabled={selectedItems.length === 0 || isBatchProcessing} onClick={() => handleBatchOperation('duplicate')}>
              <i className="bi bi-files me-1"></i> Duplicate
            </Button>
            
            <Button variant="outline-primary" disabled={selectedItems.length === 0 || isBatchProcessing} onClick={() => handleBatchOperation('export')}>
              <i className="bi bi-file-earmark-excel me-1"></i> Export
            </Button>
            
            <Button variant="outline-danger" disabled={selectedItems.length === 0 || isBatchProcessing} onClick={() => handleBatchOperation('delete')}>
              <i className="bi bi-trash me-1"></i> {isBatchProcessing ? "Processing..." : "Delete"}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PlanningHubPage;
