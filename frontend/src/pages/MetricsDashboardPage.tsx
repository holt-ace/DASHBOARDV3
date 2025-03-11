import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Dropdown, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { 
  fetchMetrics, 
  fetchDetailedMetrics,
  setDateRange,
  StatusMetric,
  TimelineMetric
} from '@/store/slices/metricsSlice';

// Import chart components
import LineChart from '@/components/charts/LineChart';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import ForecastChart from '@/components/charts/ForecastChart';
import { POStatus } from '@/types/purchaseOrder';

/**
 * MetricsDashboardPage Component
 * 
 * A comprehensive analytics dashboard that displays key metrics and insights
 * about purchase orders, with interactive visualizations and filtering options.
 */

// Define a supplier metric interface for top suppliers
// This is used for the suppliers table display
interface SupplierMetric {
  name: string;
  count: number;
  totalValue: number;
  onTimePercentage: number;
}

const MetricsDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, detailedData, loading, error } = 
    useSelector((state: RootState) => state.metrics);
  
  // Time range state
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  
  // Additional loading states for better UX
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Get current date filters from the Redux store
  const { startDate, endDate } = useSelector((state: RootState) => state.metrics.filters);
  
  // Load metrics data on component mount and when time range changes
  useEffect(() => {
    // Update date filters based on timeRange
    updateDateFilters();
  }, [timeRange]); // Only depend on timeRange changing
  
  // Fetch metrics when date filters are updated
  useEffect(() => {
    if (startDate && endDate) {
      loadMetricsData();
    }
  }, [startDate, endDate]);
  
  // Setup auto-refresh if interval is set
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (refreshInterval) {
      intervalId = window.setInterval(() => {
        refreshMetricsData();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [refreshInterval, startDate, endDate]);
  
  // Update date filters based on selected time range
  const updateDateFilters = useCallback(() => {
    const now = new Date();
    let startDate = new Date();
    
    // Calculate start date based on selected time range
    if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
    else if (timeRange === 'month') startDate.setDate(now.getDate() - 30);
    else if (timeRange === 'quarter') startDate.setDate(now.getDate() - 90);
    else if (timeRange === 'year') startDate.setDate(now.getDate() - 365);
    else return; // Don't update for custom range
    
    // Format dates as ISO strings
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = now.toISOString().split('T')[0];
    
    // Update Redux store with new date range
    dispatch(setDateRange({ startDate: formattedStartDate, endDate: formattedEndDate }));
  }, [dispatch, timeRange]);
  
  // Load metrics data from APIs
  const loadMetricsData = useCallback(() => {
    // Only show full loading state if we don't have any data yet
    if (!data) {
      setIsRefreshing(false); // This is not a refresh, it's an initial load
    } else {
      setIsRefreshing(true); // We're refreshing existing data
    }
    
    // Fetch basic metrics
    dispatch(fetchMetrics())
      .unwrap()
      .then(() => {
        // Update last updated timestamp on successful load
        setLastUpdated(new Date());
      })
      .catch((error) => {
        console.error('Error fetching metrics:', error);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
    
    // Fetch detailed metrics
    dispatch(fetchDetailedMetrics())
      .catch((error) => {
        console.error('Error fetching detailed metrics:', error);
      });
  }, [dispatch, data]);
  
  // Handle manual refresh
  const refreshMetricsData = useCallback(() => {
    setIsRefreshing(true);
    loadMetricsData();
  }, [loadMetricsData]);
  
  // Handle time range change
  const handleTimeRangeChange = (range: 'week' | 'month' | 'quarter' | 'year' | 'custom') => {
    setTimeRange(range);
  };
  
  // Handle refresh interval change
  const handleRefreshChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRefreshInterval(value ? parseInt(value) : null);
  };
  
  // Generate chart data for volume trends from real or mock data
  const getVolumeChartData = useMemo(() => {
    // Use real data if available, otherwise generate mock data
    if (data?.timeline && data.timeline.length > 0) {
      // Group timeline data by date and count orders
      const dateMap: Record<string, number> = {};
      data.timeline.forEach((item: TimelineMetric) => {
        // Extract just the date part (yyyy-mm-dd)
        const date = item.date.split('T')[0];
        dateMap[date] = (dateMap[date] || 0) + item.count;
      });
      
      // Sort dates
      const sortedDates = Object.keys(dateMap).sort();
      
      // Extract labels and data points
      const labels = sortedDates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      
      const values = sortedDates.map(date => dateMap[date]);
      
      return {
        labels,
        datasets: [
          {
            label: 'Orders',
            data: values,
            borderColor: '#4e73df',
            backgroundColor: 'rgba(78, 115, 223, 0.05)',
            tension: 0.3,
            fill: true
          }
        ]
      };
    } else {
      // Generate mock data if real data is not available
      const labels = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      // Generate random data for demonstration
      const currentYearData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100) + 80);
      const previousYearData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 90) + 70);
      
      return {
        labels,
        datasets: [
          {
            label: 'This Year',
            data: currentYearData,
            borderColor: '#4e73df',
            backgroundColor: 'rgba(78, 115, 223, 0.05)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Last Year',
            data: previousYearData,
            borderColor: '#858796',
            backgroundColor: 'rgba(133, 135, 150, 0.05)',
            tension: 0.3,
            borderDash: [5, 5],
            fill: false
          }
        ]
      };
    }
  }, [data]);
  
  // Generate status distribution chart data from real or mock data
  const getStatusChartData = useMemo(() => {
    // Get status colors mapping
    const statusColors: Record<string, string> = {
      [POStatus.UPLOADED]: '#4e73df',  // Blue
      [POStatus.CONFIRMED]: '#1cc88a', // Green
      [POStatus.SHIPPED]: '#36b9cc',   // Cyan
      [POStatus.INVOICED]: '#f6c23e',  // Yellow
      [POStatus.DELIVERED]: '#858796', // Gray
      [POStatus.CANCELLED]: '#e74a3b'  // Red
    };
    
    // Use real data if available, otherwise generate mock data
    if (data?.statusDistribution && data.statusDistribution.length > 0) {
      const statuses = data.statusDistribution.map((item: StatusMetric) => item.status);
      const percentages = data.statusDistribution.map((item: StatusMetric) => item.percentage);
      const colors = data.statusDistribution.map((item: StatusMetric) => 
        statusColors[item.status] || '#858796');
      
      return {
        labels: statuses,
        datasets: [
          {
            data: percentages,
            backgroundColor: colors,
            borderWidth: 1,
            hoverOffset: 5
          }
        ]
      };
    } else {
      // Generate mock data if real data is not available
      const statuses = [
        POStatus.UPLOADED,
        POStatus.CONFIRMED,
        POStatus.SHIPPED,
        POStatus.INVOICED,
        POStatus.DELIVERED,
        POStatus.CANCELLED
      ];
      
      // Distribution percentages should add up to 100%
      const percentages = [15, 25, 20, 15, 20, 5];
      
      // Colors for each status
      const colors = statuses.map(status => statusColors[status] || '#858796');
      
      return {
        labels: statuses,
        datasets: [
          {
            data: percentages,
            backgroundColor: colors,
            borderWidth: 1,
            hoverOffset: 5
          }
        ]
      };
    }
  }, [data]);
  
  // Generate processing time chart data from real or mock data
  const getProcessingTimeChartData = useMemo(() => {
    // Use real data if available, otherwise generate mock data
    if (detailedData?.processingTimes) {
      // Map processing time data from API
      const processingTimes = detailedData.processingTimes;
      const stages = Object.keys(processingTimes).filter(key => key !== 'total');
      const times = stages.map(stage => processingTimes[stage]);
      
      // Add total as the last item
      stages.push('Total Processing Time');
      times.push(processingTimes.total || 0);
      
      return {
        labels: stages.map(s => s.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())), // Format labels
        datasets: [
          {
            label: 'Days',
            data: times,
            backgroundColor: [
              '#4e73df', // Uploaded to Confirmed
              '#36b9cc', // Confirmed to Shipped
              '#1cc88a', // Shipped to Invoiced
              '#f6c23e', // Invoiced to Delivered
              '#858796'  // Total
            ],
            borderWidth: 1
          }
        ]
      };
    } else {
      // Generate mock data if real data is not available
      const stages = [
        'Uploaded to Confirmed',
        'Confirmed to Shipped',
        'Shipped to Invoiced',
        'Invoiced to Delivered',
        'Total Processing Time'
      ];
      
      const times = [1.2, 2.5, 0.8, 1.4, 5.9]; // in days
      
      return {
        labels: stages,
        datasets: [
          {
            label: 'Days',
            data: times,
            backgroundColor: [
              '#4e73df', // Uploaded to Confirmed
              '#36b9cc', // Confirmed to Shipped
              '#1cc88a', // Shipped to Invoiced
              '#f6c23e', // Invoiced to Delivered
              '#858796'  // Total
            ],
            borderWidth: 1
          }
        ]
      };
    }
  }, [detailedData]);
  
  // Generate forecast chart data using historical data if available
  const getForecastChartData = useMemo(() => {
    // Historical data - last 30 days
    const today = new Date();
    let historicalData: { date: Date; value: number }[] = [];
    
    // Use real timeline data if available, otherwise generate mock data
    if (data?.timeline && data.timeline.length > 0) {
      // Convert timeline data to forecast format
      historicalData = data.timeline
        .filter((item: TimelineMetric) => 
          new Date(item.date) >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000))
        .map((item: TimelineMetric) => ({
          date: new Date(item.date),
          value: item.count
        }));
    }
    
    // If no historical data or not enough data points, generate reasonable placeholder data
    // but only in development mode
    if ((!historicalData.length || historicalData.length < 10) && process.env.NODE_ENV === 'development') {
      console.log('Using placeholder data for forecast chart (development only)');
      historicalData = Array.from<unknown, { date: Date; value: number }>({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - (30 - i));
        return {
          date,
          value: 5 + Math.random() * 3 + (i / 10) // slight upward trend with noise
        };
      });
    }
    
    // Should ideally get real forecast data from the API
    // but using placeholder data in development mode
    let forecastData: Array<{ date: Date; value: number }> = [];
    let upperBound: Array<{ date: Date; value: number }> = [];
    let lowerBound: Array<{ date: Date; value: number }> = [];
    
    if (process.env.NODE_ENV === 'development') {
      // Forecast data - next 14 days
      forecastData = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() + i + 1);
        return {
          date,
          value: 8 + Math.random() * 2 + (i / 10) // continuing the trend with less noise
        };
      });
      
      // Confidence interval - upper and lower bounds
      upperBound = forecastData.map(point => ({
        date: point.date,
        value: point.value + 1.5 + (Math.random() * 0.5) // Add buffer for upper bound
      }));
      
      lowerBound = forecastData.map(point => ({
        date: point.date,
        value: Math.max(0, point.value - 1.5 - (Math.random() * 0.5)) // Ensure no negative values
      }));
    }
    
    return {
      historicalData,
      forecastData,
      confidenceInterval: {
        upper: upperBound,
        lower: lowerBound
      }
    };
  }, [data]);
  
  // Render initial loading state
  if (loading && !data) {
    return (
      <Container fluid className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading metrics data...</p>
        <p className="text-muted">This may take a moment while we connect to the metrics service.</p>
      </Container>
    );
  }
  
  // Format functions for displaying metrics
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };
  
  // Get metric values without fallbacks
  const totalOrders = data?.totalOrders || 0;
  const totalValue = data?.totalValue || 0;
  const onTimeDelivery = data?.onTimePercentage || 0;
  const avgProcessingTime = detailedData?.processingTimes?.total || 0;
  
  // Get trend indicators (these would come from API in real implementation)
  const ordersChange = { value: 12, direction: 'up' };  // 12% increase
  const valueChange = { value: 3.7, direction: 'up' };  // 3.7% increase
  const deliveryChange = { value: 2, direction: 'down' };  // 2% decrease
  const processingChange = { value: 1.3, direction: 'up' };  // 1.3 days improvement
  
  return (
    <Container fluid>
      {/* Page Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h2 mb-0 text-gray-800">Metrics & Analytics</h1>
        <div>
          <Dropdown className="d-inline-block me-2">
            <Dropdown.Toggle variant="outline-primary" id="dropdown-time-range">
              <i className="bi bi-calendar-range me-1"></i>
              {timeRange === 'week' && 'Last 7 Days'}
              {timeRange === 'month' && 'Last 30 Days'}
              {timeRange === 'quarter' && 'Last 90 Days'}
              {timeRange === 'year' && 'Last Year'}
              {timeRange === 'custom' && 'Custom Range'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => handleTimeRangeChange('week')}>Last 7 Days</Dropdown.Item>
              <Dropdown.Item onClick={() => handleTimeRangeChange('month')}>Last 30 Days</Dropdown.Item>
              <Dropdown.Item onClick={() => handleTimeRangeChange('quarter')}>Last 90 Days</Dropdown.Item>
              <Dropdown.Item onClick={() => handleTimeRangeChange('year')}>Last Year</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={() => handleTimeRangeChange('custom')}>Custom Range</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          
          <Button variant="primary" onClick={refreshMetricsData} disabled={isRefreshing}>
            <i className="bi bi-download me-1"></i>
            Export Report
          </Button>
        </div>
      </div>
      
      {/* Error alert */}
      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> 
          {error}
          <Button 
            variant="outline-danger" 
            size="sm" 
            className="ms-3"
            onClick={refreshMetricsData}
          >
            <i className="bi bi-arrow-repeat me-1"></i> Retry
          </Button>
        </Alert>
      )}
      
      {/* Refresh interval & Last updated */}
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <div className="me-3">
            <i className="bi bi-arrow-repeat me-1"></i> 
            Auto-refresh:
          </div>
          <Form.Select 
            className="w-auto" 
            value={refreshInterval?.toString() || ''} 
            onChange={handleRefreshChange}
          >
            <option value="">Off</option>
            <option value="30">Every 30 seconds</option>
            <option value="60">Every minute</option>
            <option value="300">Every 5 minutes</option>
            <option value="600">Every 10 minutes</option>
          </Form.Select>
          
          {isRefreshing && (
            <div className="ms-3 text-primary">
              <Spinner animation="border" size="sm" className="me-1" />
              Refreshing...
            </div>
          )}
        </div>
        
        {lastUpdated && (
          <div className="text-muted small">
            <i className="bi bi-clock me-1"></i>
            Last updated: {formatDate(lastUpdated)}
            <Button 
              variant="link" 
              className="p-0 ms-2" 
              onClick={refreshMetricsData}
              disabled={isRefreshing}
            >
              <i className="bi bi-arrow-repeat"></i>
            </Button>
          </div>
        )}
      </div>
      
      {/* Key Performance Indicators */}
      <Row className="g-3 mb-4">
        <Col xl={3} md={6}>
          <Card className="h-100 py-2 shadow-sm" style={{ borderLeft: '0.25rem solid #4e73df' }}>
            <Card.Body>
              <Row className="align-items-center">
                <div className="col">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total POs ({timeRange})
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{formatNumber(totalOrders)}</div>
                  <div className="text-muted mt-2 small">
                    <span className={`text-${ordersChange.direction === 'up' ? 'success' : 'danger'} me-1`}>
                      <i className={`bi bi-arrow-${ordersChange.direction}`}></i> {ordersChange.value}%
                    </span>
                    vs previous period
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-file-text-fill fa-2x text-primary opacity-25 fs-1"></i>
                </div>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={3} md={6}>
          <Card className="h-100 py-2 shadow-sm" style={{ borderLeft: '0.25rem solid #1cc88a' }}>
            <Card.Body>
              <Row className="align-items-center">
                <div className="col">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Total Value ({timeRange})
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{formatCurrency(totalValue)}</div>
                  <div className="text-muted mt-2 small">
                    <span className={`text-${valueChange.direction === 'up' ? 'success' : 'danger'} me-1`}>
                      <i className={`bi bi-arrow-${valueChange.direction}`}></i> {valueChange.value}%
                    </span>
                    vs previous period
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-currency-dollar fa-2x text-success opacity-25 fs-1"></i>
                </div>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={3} md={6}>
          <Card className="h-100 py-2 shadow-sm" style={{ borderLeft: '0.25rem solid #36b9cc' }}>
            <Card.Body>
              <Row className="align-items-center">
                <div className="col">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    On-Time Delivery
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{onTimeDelivery}%</div>
                  <div className="text-muted mt-2 small">
                    <span className={`text-${deliveryChange.direction === 'up' ? 'success' : 'danger'} me-1`}>
                      <i className={`bi bi-arrow-${deliveryChange.direction}`}></i> {deliveryChange.value}%
                    </span>
                    vs previous period
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-truck fa-2x text-info opacity-25 fs-1"></i>
                </div>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={3} md={6}>
          <Card className="h-100 py-2 shadow-sm" style={{ borderLeft: '0.25rem solid #f6c23e' }}>
            <Card.Body>
              <Row className="align-items-center">
                <div className="col">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Processing Time (Avg)
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{avgProcessingTime} days</div>
                  <div className="text-muted mt-2 small">
                    <span className={`text-${processingChange.direction === 'up' ? 'success' : 'danger'} me-1`}>
                      <i className={`bi bi-arrow-${processingChange.direction}`}></i> {processingChange.value} days
                    </span>
                    improvement
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-hourglass-split fa-2x text-warning opacity-25 fs-1"></i>
                </div>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Charts Row */}
      <Row className="g-3 mb-4">
        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold">Purchase Order Volume Trends</h6>
              <Dropdown>
                <Dropdown.Toggle variant="link" id="dropdown-trend-options" className="no-arrow">
                  <i className="bi bi-three-dots-vertical"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu align="end">
                  <Dropdown.Item><i className="bi bi-download me-2"></i> Export as Image</Dropdown.Item>
                  <Dropdown.Item><i className="bi bi-file-earmark-excel me-2"></i> Export Data</Dropdown.Item>
                  <Dropdown.Item onClick={refreshMetricsData}><i className="bi bi-arrow-repeat me-2"></i> Refresh</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card.Header>
            <Card.Body>
              <div className="chart-area" style={{ height: '320px' }}>
                <LineChart 
                  data={getVolumeChartData}
                  height={320}
                  width={100}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold">Status Distribution</h6>
              <Dropdown>
                <Dropdown.Toggle variant="link" id="dropdown-distribution-options" className="no-arrow">
                  <i className="bi bi-three-dots-vertical"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu align="end">
                  <Dropdown.Item><i className="bi bi-download me-2"></i> Export as Image</Dropdown.Item>
                  <Dropdown.Item><i className="bi bi-file-earmark-excel me-2"></i> Export Data</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card.Header>
            <Card.Body>
              <div className="chart-pie">
                <div style={{ height: '350px' }}>
                  <PieChart 
                    data={getStatusChartData}
                    height={350}
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Additional Metrics Row */}
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold">Top Suppliers by Volume</h6>
              <Dropdown>
                <Dropdown.Toggle variant="link" id="dropdown-suppliers-options" className="no-arrow">
                  <i className="bi bi-three-dots-vertical"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu align="end">
                  <Dropdown.Item><i className="bi bi-download me-2"></i> Export to Excel</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Supplier</th>
                      <th>POs</th>
                      <th>Value</th>
                      <th>On-Time %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((data?.topBuyers as unknown as SupplierMetric[]) || []).map((supplier: SupplierMetric, index: number) => (
                      <tr key={index}>
                        <td>{supplier.name}</td>
                        <td>{formatNumber(supplier.count)}</td>
                        <td>{formatCurrency(supplier.totalValue)}</td>
                        <td>{supplier.onTimePercentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold">Processing Time by Status</h6>
              <Dropdown>
                <Dropdown.Toggle variant="link" id="dropdown-time-options" className="no-arrow">
                  <i className="bi bi-three-dots-vertical"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu align="end">
                  <Dropdown.Item><i className="bi bi-download me-2"></i> Export to Excel</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <BarChart 
                  data={getProcessingTimeChartData}
                  horizontal={true}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Predictive Analytics Card */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-light py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold">Predictive Analytics</h6>
          <div className="badge bg-info">
            Beta Feature
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center p-4">
                  <div className="display-6 text-primary mb-3">
                    <i className="bi bi-calendar-check"></i>
                  </div>
                  <h5>Delivery Time Forecasting</h5>
                  <p className="text-muted">
                    Predict delivery times based on historical data, supplier performance, and seasonal patterns.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center p-4">
                  <div className="display-6 text-primary mb-3">
                    <i className="bi bi-people"></i>
                  </div>
                  <h5>Capacity Planning</h5>
                  <p className="text-muted">
                    Project future PO volumes and resource requirements based on historical trends and business factors.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center p-4">
                  <div className="display-6 text-primary mb-3">
                    <i className="bi bi-shield-check"></i>
                  </div>
                  <h5>Risk Assessment</h5>
                  <p className="text-muted">
                    Identify potential issues in the PO lifecycle and provide proactive alerts for at-risk orders.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Delivery Time Forecast Chart */}
          <Card className="mt-4 shadow-sm">
            <Card.Header className="py-3">
              <h6 className="m-0 fw-bold">Delivery Time Forecasting</h6>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">
                Based on historical data patterns, here's the predicted average delivery time for the next 14 days. 
                The shaded area represents the confidence interval of the predictions.
              </p>
              
              <div style={{ height: '400px' }}>
                <ForecastChart 
                  {...getForecastChartData}
                  xAxisLabel="Date"
                  yAxisLabel="Days to Deliver"
                />
              </div>
            </Card.Body>
          </Card>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default MetricsDashboardPage;