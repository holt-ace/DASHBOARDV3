import React, { useState, useEffect, useRef } from 'react';
import { Card, Alert, Spinner, Button, Dropdown } from 'react-bootstrap';
import { format, addDays, differenceInDays } from 'date-fns';
import { ApiService } from '@/services/ApiService';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';

// Props for the TimelineView component
interface TimelineViewProps {
  timeRange?: 'month' | 'quarter' | '6months' | 'year' | 'custom';
  groupBy?: 'none' | 'supplier' | 'status' | 'location';
  onTimeRangeChange?: (timeRange: 'month' | 'quarter' | '6months' | 'year' | 'custom') => void;
  milestoneType?: 'all' | 'status' | 'delivery' | 'payment';
  onPOSelect?: (poNumber: string) => void;
  className?: string;
}

// Interface for timeline events
interface TimelineEvent {
  id: string;
  poNumber: string;
  label: string;
  startDate: Date;
  endDate: Date | null;
  status: POStatus;
  milestoneType: 'status' | 'delivery' | 'payment';
  details?: string;
}

// Interface for timeline rows
interface TimelineRow {
  id: string;
  label: string;
  events: TimelineEvent[];
  isExpanded?: boolean;
}

/**
 * TimelineView Component
 * 
 * Displays purchase orders on a Gantt-style timeline with status milestones.
 * Purchase orders are shown as bars spanning their lifecycle with markers for status changes.
 * Supports zooming, filtering, and grouping options.
 */
const TimelineView: React.FC<TimelineViewProps> = ({
  timeRange = 'month',
  groupBy = 'none',
  onTimeRangeChange,
  milestoneType = 'all',
  onPOSelect,
  className = ''
}) => {
  // Ref for the timeline container
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // State for timeline data
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [visibleRange, setVisibleRange] = useState({
    start: new Date(),
    end: addDays(new Date(), 30)
  });
  
  // Display settings
  const [localTimeRange, setTimeRange] = useState<'month' | 'quarter' | '6months' | 'year' | 'custom'>(timeRange);
  const [localGroupBy, setGroupBy] = useState<'none' | 'supplier' | 'status' | 'location'>(groupBy);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = default, 2 = 2x zoom, etc.
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mock purchase orders data with history
  const mockPurchaseOrders: PurchaseOrder[] = [
    {
      header: {
        poNumber: 'PO123456',
        status: POStatus.CONFIRMED,
        orderDate: '2025-03-01T08:00:00',
        buyerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        },
        syscoLocation: {
          name: 'Denver Warehouse',
          address: '123 Supply Chain Dr, Denver, CO'
        },
        deliveryInfo: {
          date: '2025-03-15T08:00:00',
          instructions: 'Deliver to loading dock B'
        }
      },
      totalCost: 12500,
      products: [{ supc: '123', description: 'Item 1', quantity: 100, fobCost: 125, total: 12500 }],
      weights: { grossWeight: 1000, netWeight: 950 },
      revision: 1,
      history: [
        {
          status: POStatus.UPLOADED,
          timestamp: '2025-03-01T08:00:00',
          user: 'John Doe'
        },
        {
          status: POStatus.CONFIRMED,
          timestamp: '2025-03-03T10:30:00',
          user: 'Jane Smith',
          notes: 'Order confirmed with supplier'
        }
      ]
    },
    {
      header: {
        poNumber: 'PO123457',
        status: POStatus.SHIPPED,
        orderDate: '2025-03-05T10:30:00',
        buyerInfo: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com'
        },
        syscoLocation: {
          name: 'Seattle Distribution',
          address: '456 Logistics Ave, Seattle, WA'
        },
        deliveryInfo: {
          date: '2025-03-18T09:00:00',
          instructions: 'Call ahead 30 minutes before arrival'
        }
      },
      totalCost: 8750,
      products: [{ supc: '456', description: 'Item 2', quantity: 50, fobCost: 175, total: 8750 }],
      weights: { grossWeight: 800, netWeight: 750 },
      revision: 1,
      history: [
        {
          status: POStatus.UPLOADED,
          timestamp: '2025-03-05T10:30:00',
          user: 'Jane Smith'
        },
        {
          status: POStatus.CONFIRMED,
          timestamp: '2025-03-07T14:15:00',
          user: 'Michael Johnson'
        },
        {
          status: POStatus.SHIPPED,
          timestamp: '2025-03-10T09:45:00',
          user: 'Robert Williams',
          notes: 'Shipped via FedEx'
        }
      ]
    },
    {
      header: {
        poNumber: 'PO123458',
        status: POStatus.DELIVERED,
        orderDate: '2025-03-10T09:15:00',
        buyerInfo: {
          firstName: 'Robert',
          lastName: 'Johnson',
          email: 'robert.johnson@example.com'
        },
        syscoLocation: {
          name: 'Atlanta Hub',
          address: '789 Supply St, Atlanta, GA'
        },
        deliveryInfo: {
          date: '2025-03-22T08:30:00'
        }
      },
      totalCost: 4300,
      products: [{ supc: '789', description: 'Item 3', quantity: 20, fobCost: 215, total: 4300 }],
      weights: { grossWeight: 500, netWeight: 480 },
      revision: 1,
      history: [
        {
          status: POStatus.UPLOADED,
          timestamp: '2025-03-10T09:15:00',
          user: 'Robert Johnson'
        },
        {
          status: POStatus.CONFIRMED,
          timestamp: '2025-03-12T11:20:00',
          user: 'Sarah Davis'
        },
        {
          status: POStatus.SHIPPED,
          timestamp: '2025-03-15T14:30:00',
          user: 'Michael Brown'
        },
        {
          status: POStatus.INVOICED,
          timestamp: '2025-03-18T10:45:00',
          user: 'Emily Wilson'
        },
        {
          status: POStatus.DELIVERED,
          timestamp: '2025-03-22T08:30:00',
          user: 'David Thompson',
          notes: 'Delivered and signed for by warehouse manager'
        }
      ]
    }
  ];
  
  // Initialize timeline data when component mounts or settings change
  useEffect(() => {
    fetchPurchaseOrders();
  }, [localTimeRange, localGroupBy, milestoneType]);

  // Fetch purchase orders from API
  const fetchPurchaseOrders = async () => {
    setLoading(true);
    
    // Set visible date range based on timeRange
    const now = new Date();
    let startDate = new Date();
    
    switch (localTimeRange) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        // Custom range would be set elsewhere
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    
    // Update visible range
    setVisibleRange({ start: startDate, end: now });
    
    try {
      // Fetch POs from API within date range
      const response = await ApiService.fetchPOs({
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        limit: 100
      });
      
      if (response && response.data && response.data.length > 0) {
        console.log(`Found ${response.data.length} POs for timeline`);
        
        // Add missing history data if needed
        const enrichedPOs = enrichPurchaseOrders(response.data);
        
        // Transform purchase orders into timeline data
        const timelineData = createTimelineData(enrichedPOs, localGroupBy, milestoneType);
        setRows(timelineData);
        setLoading(false);
      } else {
        console.log('No POs found');
        
        // Only use mock data in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock data for development');
          const timelineData = createTimelineData(mockPurchaseOrders, localGroupBy, milestoneType);
          setRows(timelineData);
          setError('No PO data found. Using sample data for development purposes only.');
        } else {
          setRows([]);
          setError('No purchase order data found in the selected time range.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setError('Failed to load timeline data: ' + (err instanceof Error ? err.message : String(err)));
      
      // Only use mock data in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock data for development');
        const timelineData = createTimelineData(mockPurchaseOrders, localGroupBy, milestoneType);
        setRows(timelineData);
      } else {
        setRows([]);
      }
      setLoading(false);
    }
  };
  
  // Enrich POs with history data if missing
  const enrichPurchaseOrders = (purchaseOrders: PurchaseOrder[]): PurchaseOrder[] => {
    return purchaseOrders.map(po => {
      // If PO already has history, use it
      if (po.history && po.history.length > 0) {
        return po;
      }
      
      // Otherwise, generate history based on current status
      const history = generateHistoryFromStatus(po);
      return { ...po, history };
    });
  };
  
  // Generate history based on PO status (for POs missing history)
  const generateHistoryFromStatus = (po: PurchaseOrder) => {
    const history = [];
    const orderDate = new Date(po.header.orderDate);
    
    // Always add the initial UPLOADED status
    history.push({
      status: POStatus.UPLOADED,
      timestamp: orderDate.toISOString(),
      user: `${po.header.buyerInfo.firstName} ${po.header.buyerInfo.lastName}`
    });
    
    // Add status changes based on current status
    switch (po.header.status) {
      case POStatus.CONFIRMED:
        history.push({
          status: POStatus.CONFIRMED,
          timestamp: addDays(orderDate, 2).toISOString(),
          user: 'System'
        });
        break;
      case POStatus.SHIPPED:
        history.push({
          status: POStatus.CONFIRMED,
          timestamp: addDays(orderDate, 2).toISOString(),
          user: 'System'
        });
        history.push({
          status: POStatus.SHIPPED,
          timestamp: addDays(orderDate, 4).toISOString(),
          user: 'System'
        });
        break;
      case POStatus.DELIVERED:
      case POStatus.INVOICED:
        history.push({
          status: POStatus.CONFIRMED,
          timestamp: addDays(orderDate, 2).toISOString(),
          user: 'System'
        });
        history.push({
          status: POStatus.SHIPPED,
          timestamp: addDays(orderDate, 4).toISOString(),
          user: 'System'
        });
        history.push({
          status: POStatus.DELIVERED,
          timestamp: addDays(orderDate, 8).toISOString(),
          user: 'System'
        });
        if (po.header.status === POStatus.INVOICED) {
          history.push({
            status: POStatus.INVOICED,
            timestamp: addDays(orderDate, 10).toISOString(),
            user: 'System'
          });
        }
        break;
      case POStatus.CANCELLED:
        history.push({
          status: POStatus.CANCELLED,
          timestamp: addDays(orderDate, 1).toISOString(),
          user: 'System'
        });
        break;
    }
    
    return history;
  };
  
  // Create timeline data based on purchase orders and settings
  const createTimelineData = (
    purchaseOrders: PurchaseOrder[],
    groupingMethod: string,
    eventType: string
  ): TimelineRow[] => {
    // Transform POs into timeline events
    const allEvents: TimelineEvent[] = [];
    
    purchaseOrders.forEach(po => {
      if (!po.history || po.history.length === 0) {
        console.warn(`PO ${po.header.poNumber} has no history data`);
        return;
      }
      
      // Sort history entries by timestamp
      const sortedHistory = [...po.history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
     
      const firstEvent = sortedHistory[0];
      const lastEvent = sortedHistory[sortedHistory.length - 1];
      
      // Create main PO timeline bar
      const startDate = new Date(firstEvent.timestamp);
      const endDate = new Date(lastEvent.timestamp);
      
      // Only add events that match the milestone type filter
      if (eventType === 'all' || eventType === 'status') {
        // Main PO bar
        allEvents.push({
          id: `${po.header.poNumber}-main`,
          poNumber: po.header.poNumber,
          label: `${po.header.poNumber} (${po.header.status})`,
          startDate,
          endDate,
          status: po.header.status,
          milestoneType: 'status'
        });
        
        // Status milestone markers
        sortedHistory.forEach((historyEntry, index) => {
          if (index === 0) return; // Skip the first one, it's the start of the main bar
          
          allEvents.push({
            id: `${po.header.poNumber}-status-${index}`,
            poNumber: po.header.poNumber,
            label: historyEntry.status,
            startDate: new Date(historyEntry.timestamp),
            endDate: null, // Milestones don't have an end date
            status: historyEntry.status as POStatus,
            milestoneType: 'status',
            details: historyEntry.notes
          });
        });
      }
      
      // Add delivery milestones if requested
      if ((eventType === 'all' || eventType === 'delivery') && po.header.deliveryInfo?.date) {
        allEvents.push({
          id: `${po.header.poNumber}-delivery`,
          poNumber: po.header.poNumber,
          label: 'Expected Delivery',
          startDate: new Date(po.header.deliveryInfo.date),
          endDate: null,
          status: po.header.status,
          milestoneType: 'delivery'
        });
      }
      
      // Add payment milestones if requested
      if ((eventType === 'all' || eventType === 'payment') && po.invoice?.dueDate) {
        allEvents.push({
          id: `${po.header.poNumber}-payment`,
          poNumber: po.header.poNumber,
          label: 'Payment Due',
          startDate: new Date(po.invoice.dueDate),
          endDate: null,
          status: po.header.status,
          milestoneType: 'payment'
        });
      }
    });
    
    // Group events into rows based on groupBy
    let rows: TimelineRow[] = [];
    
    if (groupingMethod === 'none') {
      // Each PO gets its own row
      const poNumbers = [...new Set(allEvents.map(event => event.poNumber))];
      
      rows = poNumbers.map(poNumber => {
        const events = allEvents.filter(event => event.poNumber === poNumber);
        return {
          id: poNumber,
          label: poNumber,
          events,
          isExpanded: true
        };
      });
    } else if (groupingMethod === 'status') {
      // Group by status
      const statuses = Object.values(POStatus);
      
      rows = statuses.map(status => {
        const events = allEvents.filter(event => {
          // For main PO bars, use their status
          // For milestones, use the PO they belong to
          if (event.endDate !== null) { // This is a PO bar
            return event.status === status;
          } else {
            // Find the main PO bar for this milestone
            const mainPOEvent = allEvents.find(e => 
              e.poNumber === event.poNumber && e.endDate !== null
            );
            return mainPOEvent && mainPOEvent.status === status;
          }
        });
        
        return events.length > 0 ? {
          id: status,
          label: status,
          events,
          isExpanded: true
        } : null;
      }).filter(row => row && row.events.length > 0) as TimelineRow[];
    } else if (groupingMethod === 'supplier' || groupingMethod === 'location') {
      // For simplicity, we'll just use the same demo grouping for both
      const groups = ['Denver Warehouse', 'Seattle Distribution', 'Atlanta Hub', 'Chicago Distribution'];
      
      rows = groups.map(group => {
        // In a real implementation, you'd match POs to their actual supplier/location
        const events = allEvents.filter(event => 
          event.poNumber.includes(group.substring(0, 3))
        );
        
        return {
          id: group,
          label: group,
          events,
          isExpanded: true
        };
      });
    }
    
    // Filter out empty rows
    return rows.filter(row => row.events.length > 0);
  };
  
  // Calculate position and width for timeline bars
  const calculateTimelinePosition = (
    startDate: Date,
    endDate: Date | null,
    rangeStart: Date,
    rangeEnd: Date
  ) => {
    const totalDays = differenceInDays(rangeEnd, rangeStart) || 1;
    const startDayOffset = Math.max(0, differenceInDays(startDate, rangeStart));
    
    const leftPercent = (startDayOffset / totalDays) * 100;
    
    if (endDate) {
      // For bars (events with duration)
      let durationDays = differenceInDays(endDate, startDate);
      
      // Ensure minimum width
      if (durationDays === 0) durationDays = 0.5;
      
      const widthPercent = (durationDays / totalDays) * 100;
      
      return {
        left: `${leftPercent}%`,
        width: `${widthPercent}%`
      };
    } else {
      // For milestone markers (no duration)
      return {
        left: `${leftPercent}%`,
        width: 'auto'
      };
    }
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, 'MMM d, yyyy');
  };
  
  // Change zoom level
  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev + 0.5 : prev - 0.5;
      return Math.max(0.5, Math.min(3, newZoom)); // Limit zoom between 0.5x and 3x
    });
  };
  
  // Handle time range change
  const handleTimeRangeChange = (newRange: 'month' | 'quarter' | '6months' | 'year'): void => {
    setTimeRange(newRange);
    
    console.log('DEBUG - TimelineView.handleTimeRangeChange called with:', newRange);

    // Use the dedicated callback for time range changes if provided
    if (onTimeRangeChange) {
      console.log('DEBUG - Properly calling onTimeRangeChange with:', newRange);
      onTimeRangeChange(newRange);
    }
  };
  
  // Handle grouping change
  const handleGroupingChange = (newGrouping: 'none' | 'supplier' | 'status' | 'location') => {
    setLoading(true); // Show loading state
    
    if (localGroupBy !== newGrouping) {
      setGroupBy(newGrouping);
      // The effect will trigger a data refresh
      fetchPurchaseOrders();
    }
  };
  
  // Format milestone dot color based on status
  const getMilestoneColor = (status: POStatus, milestoneType: string): string => {
    if (milestoneType === 'delivery') return '#FF9800'; // Orange
    if (milestoneType === 'payment') return '#9C27B0'; // Purple
    
    // Status colors
    switch (status) {
      case POStatus.UPLOADED: return '#FF9800'; // Orange
      case POStatus.CONFIRMED: return '#2196F3'; // Blue
      case POStatus.SHIPPED: return '#673AB7'; // Purple
      case POStatus.INVOICED: return '#3F51B5'; // Indigo
      case POStatus.DELIVERED: return '#4CAF50'; // Green
      case POStatus.CANCELLED: return '#F44336'; // Red
      default: return '#9E9E9E'; // Grey
    }
  };
  
  // Handle clicking on a timeline event
  const handleEventClick = (poNumber: string) => {
    console.log('DEBUG - TimelineView.handleEventClick called with poNumber:', poNumber);
    
    if (onPOSelect) {
      onPOSelect(poNumber);
    }
  };
  
  // Generate day markers for the timeline header
  const generateDayMarkers = () => {
    const totalDays = differenceInDays(visibleRange.end, visibleRange.start) || 1;
    let markers = [];
    
    // Determine step size based on total days
    let step = 1;
    if (totalDays > 90) step = 7; // Weekly for long periods
    else if (totalDays > 30) step = 2; // Every other day for medium periods
    
    for (let i = 0; i <= totalDays; i += step) {
      const date = addDays(visibleRange.start, i);
      const position = (i / totalDays) * 100;
      
      markers.push(
        <div 
          key={`day-${i}`} 
          className="timeline-day-marker" 
          style={{ left: `${position}%` }}
        >
          {format(date, 'MMM d')}
        </div>
      );
    }
    
    return markers;
  };
  
  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === rowId
          ? { ...row, isExpanded: !row.isExpanded }
          : row
      )
    );
  };
  
  // Loading state
  if (loading) {
    return (
      <div className={`timeline-view ${className}`}>
        <Card className="h-100 shadow-sm">
          <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '500px' }}>
            <div className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading timeline data...</p>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`timeline-view ${className}`}>
        <Card className="h-100 shadow-sm">
          <Card.Body>
            <Alert variant="danger">
              <Alert.Heading>Failed to load timeline</Alert.Heading>
              <p>{error}</p>
            </Alert>
          </Card.Body>
        </Card>
      </div>
    );
  }
  
  return (
    <div className={`timeline-view ${className}`}>
      <Card className="h-100 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-bar-chart-steps me-2"></i>
            Timeline View
          </h5>
          
          <div className="d-flex gap-2">
            <div className="btn-group me-2" role="group" aria-label="Zoom controls">
              <Button 
                variant="outline-secondary" 
                title="Zoom In"
                size="sm" 
                onClick={() => handleZoom('in')}
                disabled={zoomLevel >= 3}
              >
                <i className="bi bi-zoom-in"></i>
              </Button>
              <Button 
                variant="outline-secondary" 
                title="Zoom Out"
                size="sm" 
                onClick={() => handleZoom('out')}
                disabled={zoomLevel <= 0.5}
              >
                <i className="bi bi-zoom-out"></i>
              </Button>
            </div>
            
            {/* Time range selector */}
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="bi bi-clock-history me-1"></i> 
                {localTimeRange === 'month' ? 'Last 30 Days' : 
                 localTimeRange === 'quarter' ? 'Last 90 Days' : 
                 localTimeRange === '6months' ? 'Last 6 Months' : 'Last Year'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item 
                  active={localTimeRange === 'month'} 
                  onClick={() => handleTimeRangeChange('month')}
                >
                  Last 30 Days
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localTimeRange === 'quarter'} 
                  onClick={() => handleTimeRangeChange('quarter')}
                >
                  Last 90 Days
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localTimeRange === '6months'} 
                  onClick={() => handleTimeRangeChange('6months')}
                >
                  Last 6 Months
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localTimeRange === 'year'} 
                  onClick={() => handleTimeRangeChange('year')}
                >
                  Last Year
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Group by selector */}
            <Dropdown className="me-2">
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="bi bi-collection me-1"></i> Group: {localGroupBy === 'none' ? 'None' : localGroupBy}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item active={localGroupBy === 'none'} onClick={() => handleGroupingChange('none')}>None</Dropdown.Item>
                <Dropdown.Item active={localGroupBy === 'status'} onClick={() => handleGroupingChange('status')}>By Status</Dropdown.Item>
                <Dropdown.Item active={localGroupBy === 'supplier'} onClick={() => handleGroupingChange('supplier')}>By Supplier</Dropdown.Item>
                <Dropdown.Item active={localGroupBy === 'location'} onClick={() => handleGroupingChange('location')}>By Location</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Button variant="outline-primary" size="sm" onClick={fetchPurchaseOrders}>
              <i className="bi bi-sliders me-1"></i> Filter
            </Button>
          </div>
        </Card.Header>
        
        <Card.Body className="p-0">
          <div className="timeline-container p-3">
            <div className="timeline-header px-4 py-2 border-bottom">
              <div className="timeline-row d-flex">
                <div className="timeline-legend me-3" style={{ minWidth: '150px' }}>
                  <strong>Timeline</strong>
                </div>
                <div className="timeline-grid position-relative flex-grow-1">
                  {/* Day markers */}
                  {generateDayMarkers()}
                </div>
              </div>
            </div>
            
            <div 
              className="timeline-body"
              ref={timelineRef}
              style={{ 
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: '600px'
              }}
            >
              {rows.length > 0 ? (
                // Timeline rows
                rows.map(row => (
                  <div key={row.id} className="timeline-row-container mb-2">
                    <div className="timeline-row d-flex py-2 border-bottom">
                      <div 
                        className="timeline-legend d-flex align-items-center me-3" 
                        style={{ minWidth: '150px' }}
                      >
                        <Button 
                          variant="link" 
                          className="p-0 me-2" 
                          onClick={() => toggleRowExpansion(row.id)}
                        >
                          <i className={`bi ${row.isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                        </Button>
                        <span className="fw-bold">{row.label}</span>
                      </div>
                      
                      <div 
                        className="timeline-grid position-relative flex-grow-1"
                        style={{ 
                          transform: `scaleX(${zoomLevel})`,
                          transformOrigin: 'left',
                          height: '30px'
                        }}
                      >
                        {/* Events */}
                        {row.events.filter(event => event.endDate !== null).map(event => {
                          const position = calculateTimelinePosition(
                            event.startDate, 
                            event.endDate || addDays(event.startDate, 1),
                            visibleRange.start,
                            visibleRange.end
                          );
                          
                          return (
                            <div
                              key={event.id}
                              className="timeline-event position-absolute rounded"
                              style={{
                                ...position,
                                top: '5px',
                                height: '20px',
                                backgroundColor: getMilestoneColor(event.status, event.milestoneType),
                                cursor: 'pointer'
                              }}
                              onClick={() => handleEventClick(event.poNumber)}
                              title={`${event.label}\nFrom: ${formatDate(event.startDate)}\nTo: ${event.endDate ? formatDate(event.endDate) : 'N/A'}`}
                            >
                            </div>
                          );
                        })}
                        
                        {/* Milestone markers */}
                        {row.events.filter(event => event.endDate === null).map(event => {
                          const position = calculateTimelinePosition(
                            event.startDate, 
                            null,
                            visibleRange.start,
                            visibleRange.end
                          );
                          
                          return (
                            <div
                              key={event.id}
                              className="timeline-milestone position-absolute"
                              style={{
                                ...position,
                                top: '10px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: getMilestoneColor(event.status, event.milestoneType),
                                cursor: 'pointer',
                                border: '1px solid white'
                              }}
                              onClick={() => handleEventClick(event.poNumber)}
                              title={`${event.label}\nDate: ${formatDate(event.startDate)}\n${event.details || ''}`}
                            >
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {row.isExpanded && (
                      <div className="timeline-row-details">
                        {/* This could show more detailed info about the events */}
                        {/* For now, we'll just add a simple placeholder */}
                        <div className="ps-5 pt-2 pb-3">
                          <div className="small text-muted">
                            Contains {row.events.filter(e => e.endDate !== null).length} PO bars and
                            {' '}{row.events.filter(e => e.endDate === null).length} milestones
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-5 text-center">
                  <p className="text-muted">No data to display in the selected time range.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="timeline-legend-container d-flex justify-content-center mt-3 mb-2 gap-4">
            {/* Legend for different event types */}
            <div className="d-flex align-items-center">
              <div 
                className="rounded me-2" 
                style={{ 
                  width: '20px', 
                  height: '10px', 
                  backgroundColor: getMilestoneColor(POStatus.CONFIRMED, 'status')
                }}
              ></div>
              <span className="small">PO Duration</span>
            </div>
            
            <div className="d-flex align-items-center">
              <div 
                className="rounded-circle me-2" 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: getMilestoneColor(POStatus.CONFIRMED, 'status')
                }}
              ></div>
              <span className="small">Status Change</span>
            </div>
            
            <div className="d-flex align-items-center">
              <div 
                className="rounded-circle me-2" 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: getMilestoneColor(POStatus.CONFIRMED, 'delivery')
                }}
              ></div>
              <span className="small">Delivery Milestone</span>
            </div>
            
            <div className="d-flex align-items-center">
              <div 
                className="rounded-circle me-2" 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: getMilestoneColor(POStatus.CONFIRMED, 'payment')
                }}
              ></div>
              <span className="small">Payment Milestone</span>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default TimelineView;