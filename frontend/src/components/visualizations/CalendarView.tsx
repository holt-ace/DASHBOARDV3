import React, { useState, useEffect, useRef } from 'react';
import { Card, Alert, Spinner, Button, Dropdown } from 'react-bootstrap';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ApiService } from '@/services/ApiService';
import Logger from '@/utils/logger';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';

// Define props for the CalendarView component
interface CalendarViewProps {
  dateField?: 'orderDate' | 'deliveryDate' | 'shipDate' | 'invoiceDate'; 
  range?: 'month' | 'week' | 'day';
  onPOSelect?: (poNumber: string) => void;
  onPODrop?: (poNumber: string, newDate: Date) => void;
  onComponentRender?: (renderTime: number) => void;
  className?: string;
}

/**
 * CalendarView Component
 *
 * Displays purchase orders in a calendar layout using FullCalendar.
 * Shows POs as events on specific dates, with color coding by status.
 * Supports month, week, and day views with drag-and-drop functionality.
 */
const CalendarView: React.FC<CalendarViewProps> = ({
  dateField = 'orderDate',
  range = 'month',
  onPOSelect,
  onPODrop,
  onComponentRender,
  className = ''
}) => {
  // Performance tracking
  const renderStartTime = useRef<number>(0);
  
  // DOM References
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Calendar instance reference
  const [calendarInstance, setCalendarInstance] = useState<Calendar | null>(null);
  
  // State for purchase orders data
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(dateField);

  // Mock data for demonstration and fallback purposes
  const mockPOs: PurchaseOrder[] = [
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
      revision: 1
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
      revision: 1
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
      revision: 1
    },
    {
      header: {
        poNumber: 'PO123459',
        status: POStatus.UPLOADED,
        orderDate: '2025-03-12T14:00:00',
        buyerInfo: {
          firstName: 'Susan',
          lastName: 'Miller',
          email: 'susan.miller@example.com'
        },
        syscoLocation: {
          name: 'Chicago Distribution',
          address: '101 Warehouse Blvd, Chicago, IL'
        },
        deliveryInfo: {
          date: '2025-03-25T10:00:00'
        }
      },
      totalCost: 6200,
      products: [{ supc: '101', description: 'Item 4', quantity: 40, fobCost: 155, total: 6200 }],
      weights: { grossWeight: 600, netWeight: 575 },
      revision: 1
    }
  ];
  
  // Fetch purchase orders from API
  const fetchPurchaseOrders = async () => {
    setLoading(true);
    renderStartTime.current = performance.now();
    
    // Get the current date range based on the calendar view
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() + 2);
    
    try {
      // Fetch real data from API
      const response = await ApiService.fetchPOs({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 100
      });
      
      if (response && response.data && response.data.length > 0) {
        Logger.info(`Found ${response.data.length} POs for calendar view`);
        setPurchaseOrders(response.data);
        setError(null);
        
        // Report performance if callback provided
        if (onComponentRender) {
          onComponentRender(performance.now() - renderStartTime.current);
        }
      } else {
        Logger.info('No POs found');
        
        // Only use mock data in development mode
        if (process.env.NODE_ENV === 'development') {
          Logger.info('Using mock data for development');
          setPurchaseOrders(mockPOs);
          setError('No PO data found. Using sample data for development purposes only.');
          
          // Report performance with mock data if callback provided
          if (onComponentRender) {
            onComponentRender(performance.now() - renderStartTime.current);
          }
        } else {
          setPurchaseOrders([]);
          setError('No purchase order data found in the selected date range.');
          if (onComponentRender) {
            onComponentRender(performance.now() - renderStartTime.current);
          }
        }
      }
    } catch (err) {
      Logger.error('Error fetching purchase orders:', err);
      
      // Only use mock data in development mode
      if (process.env.NODE_ENV === 'development') {
        Logger.info('Using mock data for development');
        setPurchaseOrders(mockPOs);
        setError('Failed to fetch data from API. Using sample data for development purposes only.');
        
        // Report performance with mock data if callback provided
        if (onComponentRender) {
          onComponentRender(performance.now() - renderStartTime.current);
        }
      } else {
        setPurchaseOrders([]);
        setError('Failed to fetch data from API. Please try again later.');
        if (onComponentRender) {
          onComponentRender(performance.now() - renderStartTime.current);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Initialize calendar when component mounts
  useEffect(() => {
    if (calendarRef.current) {
      renderStartTime.current = performance.now();
      // Fetch purchase orders
      fetchPurchaseOrders();
      
      // Create a new calendar instance
      const calendar = new Calendar(calendarRef.current, {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: getCalendarViewByRange(range),
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: true, // Enable drag-and-drop
        eventClick: handleEventClick,
        eventDrop: handleEventDrop,
        eventClassNames: handleEventClass,
        height: 'auto',
        aspectRatio: 1.5,
        themeSystem: 'bootstrap5',
        dayMaxEvents: true // When too many events, show the "+more" link
      });
      
      // Store the calendar instance
      setCalendarInstance(calendar);
      
      // Render the calendar
      calendar.render();
      
      Logger.debug(`[CALENDAR] Initialization completed in ${performance.now() - renderStartTime.current}ms`);
      
      // Clean up on unmount
      return () => {
        calendar.destroy();
        setCalendarInstance(null);
      };
    }
  }, [calendarRef, range]);
  
  // Update events when purchase orders change or date field changes
  useEffect(() => {
    if (calendarInstance && purchaseOrders.length > 0) {
      // Performance measurement
      const startTime = performance.now();
      
      // Remove all events
      calendarInstance.removeAllEvents();
      
      // Add events from purchase orders
      const events = purchaseOrders
        .filter(po => po && po.header) // Ensure we have valid POs
        .map(po => {
          // Determine which date field to use
          let eventDate = '';
          switch (dateFilter) {
            case 'orderDate':
              eventDate = po.header.orderDate;
              break;
            case 'deliveryDate':
              eventDate = po.header.deliveryInfo?.date || '';
              break;
            case 'shipDate':
              // In a real app, this would use the actual ship date
              eventDate = po.shipping?.shippingDate || '';
              break;
            case 'invoiceDate':
              // In a real app, this would use the actual invoice date
              eventDate = po.invoice?.invoiceDate || '';
              break;
            default:
              eventDate = po.header.orderDate;
          }
          
          // Skip events without a valid date
          if (!eventDate) return null;
          
          // Create calendar event
          return {
            id: po.header.poNumber,
            title: `${po.header.poNumber} - $${po.totalCost.toLocaleString()}`,
            start: eventDate,
            allDay: true,
            extendedProps: {
              status: po.header.status,
              poNumber: po.header.poNumber,
              supplier: po.header.syscoLocation.name,
              amount: po.totalCost
            }
          };
        })
        .filter(Boolean); // Remove null entries
      
      // Add events to calendar
      calendarInstance.addEventSource(events as any[]);
      
      // Report event rendering performance
      const renderTime = performance.now() - startTime;
      Logger.debug(`[CALENDAR] Events rendered in ${renderTime}ms`);
      // Don't call onComponentRender here as that would lead to multiple calls
      // The primary performance measurement is when the data is loaded
    }
  }, [calendarInstance, purchaseOrders, dateFilter]);
  
  // Handle event click (PO selection)
  const handleEventClick = (info: any) => {
    const poNumber = info.event.extendedProps.poNumber;
    Logger.debug('CalendarView.handleEventClick called with poNumber:', poNumber);
    
    if (onPOSelect) {
      onPOSelect(poNumber);
    } else {
      // Default behavior - could navigate to PO detail page
      Logger.info(`PO selected: ${poNumber}`);
    }
  };
  
  // Handle event drop (Date change)
  const handleEventDrop = (info: any) => {
    const poNumber = info.event.extendedProps.poNumber;
    const newDate = info.event.start;
    
    if (onPODrop) {
      onPODrop(poNumber, newDate);
    } else {
      // Default behavior - log the change
      Logger.info(`PO ${poNumber} moved to ${newDate.toISOString()}`);
    }
  };
  
  // Assign classes based on status
  const handleEventClass = (info: any) => {
    const status = info.event.extendedProps.status;
    return [`event-status-${status.toLowerCase()}`];
  };
  
  // Get the appropriate calendar view based on the range prop
  const getCalendarViewByRange = (viewRange: string): string => {
    switch (viewRange) {
      case 'month':
        return 'dayGridMonth';
      case 'week':
        return 'timeGridWeek';
      case 'day':
        return 'timeGridDay';
      default:
        return 'dayGridMonth';
    }
  };
  
  // Change view when range prop changes
  useEffect(() => {
    if (calendarInstance) {
      calendarInstance.changeView(getCalendarViewByRange(range));
    }
  }, [calendarInstance, range]);
  
  // Handle date field change
  const handleDateFieldChange = (field: 'orderDate' | 'deliveryDate' | 'shipDate' | 'invoiceDate') => {
    setDateFilter(field);
    
    if (onComponentRender) {
      onComponentRender(performance.now()); // Just log that this happened, not measuring performance here
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className={`calendar-view ${className}`}>
        <Card className="h-100 shadow-sm">
          <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '500px' }}>
            <div className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading calendar view...</p>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
  
  // Calendar legend items
  const legendItems = [
    { status: POStatus.UPLOADED, label: 'Uploaded' },
    { status: POStatus.CONFIRMED, label: 'Confirmed' },
    { status: POStatus.SHIPPED, label: 'Shipped' },
    { status: POStatus.INVOICED, label: 'Invoiced' },
    { status: POStatus.DELIVERED, label: 'Delivered' },
    { status: POStatus.CANCELLED, label: 'Cancelled' }
  ];
  
  // Get status color mapping for styling
  const getStatusColor = (status: POStatus): string => {
    switch (status) {
      case POStatus.UPLOADED: return '#FF9800';  // Orange
      case POStatus.CONFIRMED: return '#2196F3'; // Blue
      case POStatus.SHIPPED: return '#673AB7';   // Purple
      case POStatus.INVOICED: return '#3F51B5';  // Indigo
      case POStatus.DELIVERED: return '#4CAF50'; // Green
      case POStatus.CANCELLED: return '#F44336'; // Red
      default: return '#9E9E9E';                 // Grey
    }
  };
  
  return (
    <div className={`calendar-view ${className}`}>
      <Card className="h-100 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-calendar3 me-2"></i>
            Calendar View
          </h5>
          
          <div className="d-flex gap-2">
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="bi bi-funnel me-1"></i>
                {dateFilter === 'orderDate' ? 'Order Date' : 
                 dateFilter === 'deliveryDate' ? 'Delivery Date' : 
                 dateFilter === 'shipDate' ? 'Ship Date' : 'Invoice Date'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item 
                  active={dateFilter === 'orderDate'} 
                  onClick={() => handleDateFieldChange('orderDate')}
                >
                  Order Date
                </Dropdown.Item>
                <Dropdown.Item 
                  active={dateFilter === 'deliveryDate'} 
                  onClick={() => handleDateFieldChange('deliveryDate')}
                >
                  Delivery Date
                </Dropdown.Item>
                <Dropdown.Item 
                  active={dateFilter === 'shipDate'} 
                  onClick={() => handleDateFieldChange('shipDate')}
                >
                  Ship Date
                </Dropdown.Item>
                <Dropdown.Item 
                  active={dateFilter === 'invoiceDate'} 
                  onClick={() => handleDateFieldChange('invoiceDate')}
                >
                  Invoice Date
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => fetchPurchaseOrders()}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </Button>
          </div>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <Alert variant="warning" className="mb-3">
              <small>{error}</small>
            </Alert>
          )}
          
          <div className="calendar-container mb-3">
            <div ref={calendarRef} className="fc-calendar"></div>
          </div>
          
          <div className="calendar-legend d-flex flex-wrap gap-2 mt-4 justify-content-center">
            {legendItems.map(item => (
              <div key={item.status} className="d-flex align-items-center me-2">
                <div
                  className="me-1 rounded-circle"
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: getStatusColor(item.status),
                    display: 'inline-block'
                  }}
                />
                <span className="small">{item.label}</span>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CalendarView;