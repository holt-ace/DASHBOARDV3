import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Alert, Spinner, Button, Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { format, addDays, differenceInDays } from 'date-fns';
import { ApiService } from '@/services/ApiService';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import Logger from '@/utils/logger';
import DebugHelper from '@/utils/debugHelper';

// Props for the TimelineView component
interface TimelineViewProps {
  timeRange?: 'month' | 'quarter' | '6months' | 'year' | 'custom';
  groupBy?: 'none' | 'supplier' | 'status' | 'location';
  onTimeRangeChange?: (timeRange: 'month' | 'quarter' | '6months' | 'year' | 'custom') => void;
  milestoneType?: 'all' | 'status' | 'delivery' | 'payment';
  onPOSelect?: (poNumber: string) => void;
  onComponentRender?: (renderTime: number) => void;
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
  onComponentRender,
  className = ''
}) => {
  // Performance metrics
  const renderStartTime = useRef<number>(0);
  
  // Log component mount for debugging
  useEffect(() => {
    DebugHelper.componentDidMount('TimelineView', { 
      timeRange, groupBy, milestoneType 
    });
    
    return () => {
      DebugHelper.componentWillUnmount('TimelineView');
    };
  }, [timeRange, groupBy, milestoneType]);

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
  
  // Initialize timeline data when component mounts or settings change
  useEffect(() => {
    try {
      // Start performance measurement
      renderStartTime.current = performance.now();
      Logger.debug('[TIMELINE] Settings changed, fetching new data', {
        timeRange: localTimeRange,
        groupBy: localGroupBy,
        milestoneType
      });
      
      fetchPurchaseOrders();
    } catch (err) {
      Logger.error('[TIMELINE] Error in settings change effect:', err);
    }
  }, [localTimeRange, localGroupBy, milestoneType]);

  // Fetch purchase orders from API
  const fetchPurchaseOrders = async () => {
    Logger.debug('[TIMELINE] Starting data fetch');
    DebugHelper.dataFetch('TimelineView', 'PurchaseOrders', 'start', {
      timeRange: localTimeRange,
      groupBy: localGroupBy
    });
    
    setLoading(true);
    
    // Set visible date range based on timeRange
    const now = new Date();
    let startDate = new Date();
    
    try {
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
        Logger.debug('[TIMELINE] Calling API to fetch POs', {
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        });
        
        const response = await ApiService.fetchPOs({
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          limit: 100
        });
        
        if (response && response.data && response.data.length > 0) {
          Logger.info(`[TIMELINE] Found ${response.data.length} POs for timeline`);
          
          // Add missing history data if needed
          const enrichedPOs = enrichPurchaseOrders(response.data);
          
          // Transform purchase orders into timeline data
          try {
            const timelineData = createTimelineData(enrichedPOs, localGroupBy, milestoneType);
            setRows(timelineData);
            
            // Report rendering performance if callback provided
            const renderTime = performance.now() - renderStartTime.current;
            if (onComponentRender) {
              onComponentRender(renderTime);
            }
            DebugHelper.visualizationRendered('TimelineView', timelineData.length, performance.now() - renderStartTime.current);
            DebugHelper.dataFetch('TimelineView', 'PurchaseOrders', 'success', {
              rowCount: timelineData.length,
              poCount: response.data.length
            });
            
            setError(null);
          } catch (dataError) {
            Logger.error('[TIMELINE] Error creating timeline data:', dataError);
            setError('Error processing timeline data: ' + String(dataError));
            
            DebugHelper.renderError('TimelineView-createData', dataError as Error);
          }
        } else {
          // Load mock data through separate async import to reduce initial bundle size
          // No longer using mock data to avoid confusion with real MongoDB data
          setRows([]);
          setError('No PO data found for the selected time range.');
          
          
          DebugHelper.dataFetch('TimelineView', 'PurchaseOrders', 'error', {
            error: 'No data found'
          });
        }
      } catch (apiError) {
        Logger.error('[TIMELINE] API error fetching purchase orders:', apiError);
        setError('Failed to load timeline data: ' + (apiError instanceof Error ? apiError.message : String(apiError)));
        
        // No longer using mock data
        setRows([]);
        if (process.env.NODE_ENV === 'development') {
        }
        
        DebugHelper.dataFetch('TimelineView', 'PurchaseOrders', 'error', {
          error: apiError instanceof Error ? apiError.message : String(apiError)
        });
      }
    } catch (error) {
      Logger.error('[TIMELINE] Unexpected error in fetchPurchaseOrders:', error);
      setError('Unexpected error: ' + String(error));
    } finally {
      setLoading(false);
    }
  };
  
  // Enrich POs with history data if missing
  const enrichPurchaseOrders = useCallback((purchaseOrders: PurchaseOrder[]): PurchaseOrder[] => {
    try {
      return purchaseOrders.map(po => {
        // If PO already has history, use it
        if (po.history && po.history.length > 0) {
          return po;
        }
        
        // Otherwise, generate history based on current status
        const history = generateHistoryFromStatus(po);
        return { ...po, history };
      });
    } catch (error) {
      Logger.error('[TIMELINE] Error enriching purchase orders:', error);
      return purchaseOrders; // Return original data on error
    }
  }, []);
  
  // Generate history based on PO status (for POs missing history)
  const generateHistoryFromStatus = useCallback((po: PurchaseOrder) => {
    if (!po.header || !po.header.orderDate) {
      Logger.warn('[TIMELINE] Cannot generate history for invalid PO:', po.header?.poNumber || 'unknown');
      return [];
    }
    
    try {
      const history = [];
      const orderDate = new Date(po.header.orderDate);
      
      // Always add the initial UPLOADED status
      history.push({
        status: POStatus.UPLOADED,
        timestamp: orderDate.toISOString(),
        user: po.header.buyerInfo ? `${po.header.buyerInfo.firstName} ${po.header.buyerInfo.lastName}` : 'System'
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
    } catch (error) {
      Logger.error('[TIMELINE] Error generating history for PO:', po.header?.poNumber || 'unknown', error);
      return [];
    }
  }, []);
  
  // Create timeline data based on purchase orders and settings
  const createTimelineData = useCallback((
    purchaseOrders: PurchaseOrder[],
    groupingMethod: string,
    eventType: string
  ): TimelineRow[] => {
    const startTime = performance.now();
    Logger.debug('[TIMELINE] Creating timeline data', { 
      poCount: purchaseOrders.length,
      groupBy: groupingMethod,
      eventType
    });
    
    // Transform POs into timeline events
    const allEvents: TimelineEvent[] = [];
    
    try {
      // Process each PO and extract events
      for (const po of purchaseOrders) {
        try {
          if (!po.history || po.history.length === 0) {
            Logger.warn(`[TIMELINE] PO ${po.header?.poNumber || 'unknown'} has no history data`);
            continue;
          }
          
          if (!po.header) {
            Logger.warn('[TIMELINE] PO missing header information', po);
            continue;
          }
          
          // Sort history entries by timestamp
          const sortedHistory = [...po.history].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        
          const firstEvent = sortedHistory[0];
          const lastEvent = sortedHistory[sortedHistory.length - 1];
          
          if (!firstEvent || !lastEvent) {
            Logger.warn('[TIMELINE] Invalid history data for PO', po.header.poNumber);
            continue;
          }
          
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
        } catch (poError) {
          Logger.error(`[TIMELINE] Error processing PO ${po.header?.poNumber || 'unknown'}:`, poError);
        }
      }

      // Group events into rows based on groupBy
      let rows: TimelineRow[] = [];
      
      try {
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
          const statuses: string[] = Object.values(POStatus);
          
          rows = statuses.map(status => {
            const events = allEvents.filter(event => {
              // For main PO bars, use their status
              // For milestones, use the PO they belong to
              if (event.endDate !== null) { // This is a PO bar
                return event.status === status as POStatus;
              } else {
                // Find the main PO bar for this milestone
                const mainPOEvent = allEvents.find(e => 
                  e.poNumber === event.poNumber && e.endDate !== null
                );
                return mainPOEvent && mainPOEvent.status === status as POStatus;
              }
            });
            
            return events.length > 0 ? {
              id: status,
              label: status as string,
              events,
              isExpanded: true
            } as TimelineRow : null;
          }).filter((row): row is TimelineRow => row !== null);
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
      } catch (groupingError) {
        Logger.error('[TIMELINE] Error grouping timeline data:', groupingError);
        
        // Fallback to ungrouped if grouping fails
        const poNumbers = [...new Set(allEvents.map(event => event.poNumber))];
        rows = poNumbers.map(poNumber => ({
          id: poNumber,
          label: poNumber,
          events: allEvents.filter(event => event.poNumber === poNumber),
          isExpanded: true
        }));
      }
      
      // Filter out empty rows
      const filteredRows = rows.filter(row => row.events && row.events.length > 0);
      
      const endTime = performance.now();
      Logger.debug('[TIMELINE] Timeline data creation complete', {
        executionTime: `${(endTime - startTime).toFixed(2)}ms`,
        eventCount: allEvents.length,
        rowCount: filteredRows.length
      });
      
      return filteredRows;
    } catch (processingError) {
      Logger.error('[TIMELINE] Critical error creating timeline data:', processingError);
      DebugHelper.renderError('TimelineView-createTimelineData', processingError as Error);
      return []; // Return empty array on error
    }
  }, []);
  
  // Calculate position and width for timeline bars
  const calculateTimelinePosition = (
    startDate: Date,
    endDate: Date | null,
    rangeStart: Date,
    rangeEnd: Date
  ) => {
    try {
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
    } catch (error) {
      Logger.error('[TIMELINE] Error calculating position:', error);
      return { left: '0%', width: 'auto' }; // Fallback position
    }
  };
  
  // Format date for display
  const formatDate = useCallback((date: Date) => {
    try {
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  }, []);
  
  // Change zoom level
  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev + 0.5 : prev - 0.5;
      return Math.max(0.5, Math.min(3, newZoom)); // Limit zoom between 0.5x and 3x
    });
  };
  
  // Handle time range change
  const handleTimeRangeChange = useCallback((newRange: 'month' | 'quarter' | '6months' | 'year'): void => {
    try {
      Logger.debug('[TIMELINE] Time range changing to:', newRange);
      setTimeRange(newRange);
      
      // Use the dedicated callback for time range changes if provided
      if (onTimeRangeChange) {
        Logger.debug('[TIMELINE] Calling parent onTimeRangeChange with:', newRange);
        onTimeRangeChange(newRange);
      }
    } catch (error) {
      Logger.error('[TIMELINE] Error changing time range:', error);
    }
  }, [onTimeRangeChange]);
  
  // Handle grouping change
  const handleGroupingChange = useCallback((newGrouping: 'none' | 'supplier' | 'status' | 'location') => {
    try {
      Logger.debug('[TIMELINE] Grouping changing to:', newGrouping);
      setLoading(true); // Show loading state
      
      if (localGroupBy !== newGrouping) {
        setGroupBy(newGrouping);
        // The effect will trigger a data refresh
        fetchPurchaseOrders();
      }
    } catch (error) {
      Logger.error('[TIMELINE] Error changing grouping:', error);
      setLoading(false);
    }
  }, [localGroupBy, fetchPurchaseOrders]);
  
  // Format milestone dot color based on status
  const getMilestoneColor = useCallback((status: POStatus, milestoneType: string): string => {
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
  }, []);
  
  // Handle clicking on a timeline event
  const handleEventClick = useCallback((poNumber: string) => {
    try {
      Logger.debug('[TIMELINE] Event click on PO:', poNumber);
      
      if (onPOSelect) {
        onPOSelect(poNumber);
      }
    } catch (error) {
      Logger.error('[TIMELINE] Error handling event click:', error);
    }
  }, [onPOSelect]);
  
  // Generate day markers for the timeline header
  const generateDayMarkers = useCallback(() => {
    try {
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
            style={{ left: `${position}%`, position: 'absolute' }}
          >
            {format(date, 'MMM d')}
          </div>
        );
      }
      
      return markers;
    } catch (error) {
      Logger.error('[TIMELINE] Error generating day markers:', error);
      return [];
    }
  }, [visibleRange.start, visibleRange.end]);
  
  // Toggle row expansion
  const toggleRowExpansion = useCallback((rowId: string) => {
    try {
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId
            ? { ...row, isExpanded: !row.isExpanded }
            : row
        )
      );
    } catch (error) {
      Logger.error('[TIMELINE] Error toggling row expansion:', error);
    }
  }, []);
  
  // Memoize components that don't need to rerender frequently
  const CardHeader = useMemo(() => (
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
  ), [localTimeRange, handleTimeRangeChange, localGroupBy, handleGroupingChange, zoomLevel, fetchPurchaseOrders]);
  
  // Memoize the timeline rows component
  const TimelineRows = useCallback(({ rows }: { rows: TimelineRow[] }) => (
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
              try {
                const position = calculateTimelinePosition(
                  event.startDate, 
                  event.endDate || addDays(event.startDate, 1),
                  visibleRange.start,
                  visibleRange.end
                );
                
                return (
                  <OverlayTrigger
                    key={event.id}
                    placement="top"
                    overlay={
                      <Tooltip>
                        {event.label}
                        <br/>From: {formatDate(event.startDate)}
                        <br/>To: {event.endDate ? formatDate(event.endDate) : 'N/A'}
                      </Tooltip>
                    }
                  >
                    <div
                      className="timeline-event position-absolute rounded"
                      style={{
                        ...position,
                        top: '5px',
                        height: '20px',
                        backgroundColor: getMilestoneColor(event.status, event.milestoneType),
                        cursor: 'pointer'
                      }}
                      onClick={() => handleEventClick(event.poNumber)}
                    >
                    </div>
                  </OverlayTrigger>
                );
              } catch (renderError) {
                // Skip rendering this event on error
                Logger.error('[TIMELINE] Error rendering event:', renderError);
                return null;
              }
            })}
            
            {/* Milestone markers */}
            {row.events.filter(event => event.endDate === null).map(event => {
              try {
                const position = calculateTimelinePosition(
                  event.startDate, 
                  null,
                  visibleRange.start,
                  visibleRange.end
                );
                
                return (
                  <OverlayTrigger
                    key={event.id}
                    placement="top"
                    overlay={
                      <Tooltip>
                        {event.label}
                        <br/>Date: {formatDate(event.startDate)}
                        {event.details ? <><br/>{event.details}</> : null}
                      </Tooltip>
                    }
                  >
                    <div
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
                    >
                    </div>
                  </OverlayTrigger>
                );
              } catch (renderError) {
                // Skip rendering this milestone on error
                Logger.error('[TIMELINE] Error rendering milestone:', renderError);
                return null;
              }
            })}
          </div>
        </div>
        
        {/* Expanded details */}
        {row.isExpanded && (
          <div className="timeline-row-details">
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
  ), [calculateTimelinePosition, visibleRange.start, visibleRange.end, formatDate, getMilestoneColor, handleEventClick, toggleRowExpansion, zoomLevel]);
  
  // Memoize the legend component
  const TimelineLegend = useMemo(() => (
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
  ), [getMilestoneColor]);

  // Render appropriate component based on loading/error state
  const renderContent = () => {
    if (loading) {
      return (
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '500px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Loading timeline data...</p>
          </div>
        </Card.Body>
      );
    }
    
    if (error && rows.length === 0) {
      return (
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Failed to load timeline</Alert.Heading>
            <p>{error}</p>
            <div className="d-flex justify-content-end">
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={fetchPurchaseOrders}
              >
                Retry
              </Button>
            </div>
          </Alert>
        </Card.Body>
      );
    }
    
    return (
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
              <TimelineRows rows={rows} />
            ) : (
              <div className="p-5 text-center">
                <p className="text-muted">No data to display in the selected time range.</p>
              </div>
            )}
          </div>
        </div>
        
        {TimelineLegend}
      </Card.Body>
    );
  };
  
  return (
    <div className={`timeline-view ${className}`}>
      <Card className="h-100 shadow-sm">
        {CardHeader}
        {renderContent()}
      </Card>
    </div>
  );
};

export default TimelineView;