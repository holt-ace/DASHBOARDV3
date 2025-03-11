import React, { useState, useEffect } from 'react';
import { Card, Alert, Spinner, Badge, Button, Dropdown, Modal, Form, Col, Row } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { ApiService } from '@/services/ApiService';
import { format } from 'date-fns';

// Props for the KanbanBoard component
interface KanbanBoardProps {
  groupBy?: 'status' | 'supplier' | 'location' | 'buyer';
  sortBy?: 'orderDate' | 'amount' | 'dueDate' | 'priority';
  filterStatus?: 'all' | 'open' | 'completed' | 'custom';
  onPOSelect?: (poNumber: string) => void;
  onStatusChange?: (poNumber: string, newStatus: POStatus) => void;
  className?: string;
}

// Column interface for the Kanban board
interface KanbanColumn {
  id: string;
  title: string;
  items: PurchaseOrder[];
  color?: string;
}

/**
 * KanbanBoard Component
 * 
 * Displays purchase orders in a Kanban board layout with draggable cards.
 * Allows organizing POs by status, supplier, location, or buyer.
 * Supports drag-and-drop for status transitions and visual organization.
 */
const KanbanBoard: React.FC<KanbanBoardProps> = ({
  groupBy = 'status',
  sortBy = 'orderDate',
  filterStatus = 'all',
  onPOSelect,
  onStatusChange,
  className = ''
}) => {
  // State for columns and purchase orders
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [localGroupBy, setGroupBy] = useState<'status' | 'supplier' | 'location' | 'buyer'>(groupBy);
  const [localSortBy, setSortBy] = useState<'orderDate' | 'amount' | 'dueDate' | 'priority'>(sortBy);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  
  // Mock purchase orders data
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
    },
    {
      header: {
        poNumber: 'PO123460',
        status: POStatus.INVOICED,
        orderDate: '2025-03-08T11:45:00',
        buyerInfo: {
          firstName: 'Michael',
          lastName: 'Brown',
          email: 'michael.brown@example.com'
        },
        syscoLocation: {
          name: 'Boston Depot',
          address: '555 Northeast Blvd, Boston, MA'
        },
        deliveryInfo: {
          date: '2025-03-20T14:00:00'
        }
      },
      totalCost: 9300,
      products: [{ supc: '555', description: 'Item 5', quantity: 60, fobCost: 155, total: 9300 }],
      weights: { grossWeight: 850, netWeight: 800 },
      revision: 1
    },
    {
      header: {
        poNumber: 'PO123461',
        status: POStatus.CANCELLED,
        orderDate: '2025-03-03T09:30:00',
        buyerInfo: {
          firstName: 'Emily',
          lastName: 'Davis',
          email: 'emily.davis@example.com'
        },
        syscoLocation: {
          name: 'Miami Center',
          address: '888 Sunny Ave, Miami, FL'
        },
        deliveryInfo: {
          date: '2025-03-17T13:00:00'
        }
      },
      totalCost: 5400,
      products: [{ supc: '888', description: 'Item 6', quantity: 30, fobCost: 180, total: 5400 }],
      weights: { grossWeight: 450, netWeight: 425 },
      revision: 1
    }
  ];
  
  // Initialize board by grouping purchase orders into columns
  useEffect(() => {
    fetchData();
  }, [localGroupBy, localSortBy]);
  
  // Fetch purchase order data from API
  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Get current date and date from 30 days ago
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Fetch purchase orders from API
      const response = await ApiService.fetchPOs({
        startDate: thirtyDaysAgo.toISOString(),
        endDate: now.toISOString(),
        limit: 100
      });
      
      if (response && response.data && response.data.length > 0) {
        console.log(`Found ${response.data.length} POs for kanban board`);
        
        // Group and sort the purchase orders
        const groupedColumns = createGroupedColumns(response.data, localGroupBy, localSortBy);
        setColumns(groupedColumns);
        setLoading(false);
      } else {
        console.log('No POs found in API');
        
        // Only use mock data in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock data for development');
          const groupedColumns = createGroupedColumns(mockPurchaseOrders, localGroupBy, localSortBy);
          setColumns(groupedColumns);
          setError('No PO data found. Using sample data for development purposes only.');
        } else {
          setColumns([]);
          setError('No purchase order data found in the selected filters.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setError(`Failed to load kanban board data: ${err instanceof Error ? err.message : String(err)}`);
      
      // Only use mock data in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock data for development');
        const groupedColumns = createGroupedColumns(mockPurchaseOrders, localGroupBy, localSortBy);
        setColumns(groupedColumns);
      } else {
        setColumns([]);
      }
      setLoading(false);
    }
  };
  
  // Create columns based on the groupBy parameter
  const createGroupedColumns = (
    purchaseOrders: PurchaseOrder[], 
    grouping: string, 
    sorting: string
  ): KanbanColumn[] => {
    let groups: Record<string, PurchaseOrder[]> = {};
    let columnData: KanbanColumn[] = [];
    
    // Apply filter status if needed
    let filteredPOs = purchaseOrders;
    if (filterStatus !== 'all') {
      filteredPOs = purchaseOrders.filter(po => {
        if (filterStatus === 'open') {
          return [POStatus.UPLOADED, POStatus.CONFIRMED].includes(po.header.status);
        } else if (filterStatus === 'completed') {
          return [POStatus.DELIVERED, POStatus.INVOICED].includes(po.header.status);
        }
        return true; // 'custom' or other values
      });
    }
    
    // Group purchase orders
    if (grouping === 'status') {
      // Create a column for each status
      const statusOrder = [
        POStatus.UPLOADED,
        POStatus.CONFIRMED,
        POStatus.SHIPPED,
        POStatus.INVOICED,
        POStatus.DELIVERED,
        POStatus.CANCELLED
      ];
      
      // Initialize empty groups for each status
      statusOrder.forEach(status => {
        groups[status] = [];
      });
      
      // Group POs by status
      filteredPOs.forEach(po => {
        const status = po.header.status;
        if (!groups[status]) {
          groups[status] = [];
        }
        groups[status].push(po);
      });
      
      // Create columns in the specified order
      columnData = statusOrder.map(status => {
        return {
          id: status,
          title: status,
          items: sortPurchaseOrders(groups[status] || [], sorting),
          color: getStatusColor(status)
        };
      });
    } else if (grouping === 'supplier' || grouping === 'location') {
      // Group by supplier/location name
      filteredPOs.forEach(po => {
        const key = grouping === 'supplier' 
          ? po.header.syscoLocation.name 
          : po.header.syscoLocation.name;
          
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(po);
      });
      
      // Create a column for each unique supplier/location
      columnData = Object.keys(groups).map(key => ({
        id: key,
        title: key,
        items: sortPurchaseOrders(groups[key], sorting)
      }));
    } else if (grouping === 'buyer') {
      // Group by buyer
      filteredPOs.forEach(po => {
        const key = `${po.header.buyerInfo.firstName} ${po.header.buyerInfo.lastName}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(po);
      });
      
      // Create a column for each unique buyer
      columnData = Object.keys(groups).map(key => ({
        id: key,
        title: key,
        items: sortPurchaseOrders(groups[key], sorting)
      }));
    }
    
    return columnData;
  };
  
  // Sort purchase orders based on the sortBy parameter
  const sortPurchaseOrders = (purchaseOrders: PurchaseOrder[], sortCriteria: string): PurchaseOrder[] => {
    return [...purchaseOrders].sort((a, b) => {
      switch (sortCriteria) {
        case 'orderDate':
          return new Date(a.header.orderDate).getTime() - new Date(b.header.orderDate).getTime();
          
        case 'amount':
          return (b.totalCost || 0) - (a.totalCost || 0);
          
        case 'dueDate':
          const aDueDate = a.header.deliveryInfo?.date 
            ? new Date(a.header.deliveryInfo.date).getTime() 
            : Number.MAX_SAFE_INTEGER;
            
          const bDueDate = b.header.deliveryInfo?.date 
            ? new Date(b.header.deliveryInfo.date).getTime() 
            : Number.MAX_SAFE_INTEGER;
            
          return aDueDate - bDueDate;
          
        // Priority would typically come from the PO data
        case 'priority':
          // Mocked priority - in a real app this would use an actual priority field
          const priorityMap: Record<POStatus, number> = {
            [POStatus.UPLOADED]: 1,
            [POStatus.CONFIRMED]: 2,
            [POStatus.SHIPPED]: 3,
            [POStatus.INVOICED]: 4,
            [POStatus.DELIVERED]: 5,
            [POStatus.CANCELLED]: 6
          };
          
          return priorityMap[a.header.status] - priorityMap[b.header.status];
          
        default:
          return 0;
      }
    });
  };
  
  // Get appropriate color for a status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case POStatus.UPLOADED:
        return '#FF9800'; // Orange
      case POStatus.CONFIRMED:
        return '#2196F3'; // Blue
      case POStatus.SHIPPED:
        return '#673AB7'; // Purple
      case POStatus.INVOICED:
        return '#3F51B5'; // Indigo
      case POStatus.DELIVERED:
        return '#4CAF50'; // Green
      case POStatus.CANCELLED:
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
  // Format date for display
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch (e) {
      return dateStr;
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Handle sort change
  const handleSortChange = (newSort: 'orderDate' | 'amount' | 'dueDate' | 'priority') => {
    if (localSortBy !== newSort) {
      setSortBy(newSort);
    }
  };
  
  // Handle group change
  const handleGroupChange = (newGroup: 'status' | 'supplier' | 'location' | 'buyer') => {
    if (localGroupBy !== newGroup) {
      setGroupBy(newGroup);
    }
  };
  
  // Handle filter button click
  const handleFilterClick = () => {
    console.log('Opening filter modal');
    setShowFilterModal(true);
  };
  
  // Handle card selection
  const handleCardClick = (poNumber: string) => {
    console.log('DEBUG - KanbanBoard.handleCardClick called with poNumber:', poNumber);
    
    if (onPOSelect) {
      onPOSelect(poNumber);
    }
  };
  
  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    // Dropped outside a droppable area
    if (!destination) return;
    
    // Dropped in the same place
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    // Find source and destination columns
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);
    
    if (!sourceColumn || !destColumn) return;
    
    // Create new columns array
    const newColumns = [...columns];
    
    // Make a copy of the items
    const sourceItems = [...sourceColumn.items];
    const destItems = sourceColumn === destColumn ? sourceItems : [...destColumn.items];
    
    // Remove the item from the source
    const [removedItem] = sourceItems.splice(source.index, 1);
    
    // Check if this is a status change
    if (
      localGroupBy === 'status' && 
      source.droppableId !== destination.droppableId &&
      onStatusChange
    ) {
      // Update the status on the item
      const newStatus = destination.droppableId as POStatus;
      removedItem.header.status = newStatus;
      
      // Call the onStatusChange callback
      onStatusChange(removedItem.header.poNumber, newStatus);
    }
    
    // Add the item to the destination
    destItems.splice(destination.index, 0, removedItem);
    
    // Update the columns
    const sourceColIndex = newColumns.findIndex(col => col.id === source.droppableId);
    const destColIndex = newColumns.findIndex(col => col.id === destination.droppableId);
    
    newColumns[sourceColIndex] = {
      ...sourceColumn,
      items: sourceItems
    };
    
    if (sourceColIndex !== destColIndex) {
      newColumns[destColIndex] = {
        ...destColumn,
        items: destItems
      };
    }
    
    // Update state
    setColumns(newColumns);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className={`kanban-board ${className}`}>
        <Card className="h-100 shadow-sm">
          <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '500px' }}>
            <div className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading kanban board...</p>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`kanban-board ${className}`}>
        <Card className="h-100 shadow-sm">
          <Card.Body>
            <Alert variant="danger">
              <Alert.Heading>Failed to load kanban board</Alert.Heading>
              <p>{error}</p>
            </Alert>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Filter modal component
  const filterModal = (
    <Modal show={showFilterModal} onHide={() => setShowFilterModal(false)} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Filter Purchase Orders</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="filter-keyword">
                <Form.Label>Search Keyword</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter PO number, supplier, etc." 
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="filter-status">
                <Form.Label>Status</Form.Label>
                <Form.Select>
                  <option value="">All Statuses</option>
                  <option value={POStatus.UPLOADED}>Uploaded</option>
                  <option value={POStatus.CONFIRMED}>Confirmed</option>
                  <option value={POStatus.SHIPPED}>Shipped</option>
                  <option value={POStatus.INVOICED}>Invoiced</option>
                  <option value={POStatus.DELIVERED}>Delivered</option>
                  <option value={POStatus.CANCELLED}>Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="filter-date-from">
                <Form.Label>From Date</Form.Label>
                <Form.Control type="date" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="filter-date-to">
                <Form.Label>To Date</Form.Label>
                <Form.Control type="date" />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowFilterModal(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => {fetchData(); setShowFilterModal(false);}}>
          Apply Filters
        </Button>
      </Modal.Footer>
    </Modal>
  );
  
  return (
    <div className={`kanban-board ${className}`}>
      <Card className="h-100 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-kanban me-2"></i>
            Kanban Board
          </h5>
          
          <div className="d-flex gap-2">
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="bi bi-sort-down me-1"></i> Sort: {localSortBy === 'orderDate' ? 'Order Date' : 
                                                                 localSortBy === 'amount' ? 'Amount' : 
                                                                 localSortBy === 'dueDate' ? 'Due Date' : 'Priority'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item active={localSortBy === 'orderDate'} onClick={() => handleSortChange('orderDate')}>
                  Order Date</Dropdown.Item>
                <Dropdown.Item active={localSortBy === 'amount'} onClick={() => handleSortChange('amount')}>
                  Amount</Dropdown.Item>
                <Dropdown.Item active={localSortBy === 'dueDate'} onClick={() => handleSortChange('dueDate')}>
                  Due Date</Dropdown.Item>
                <Dropdown.Item active={localSortBy === 'priority'} onClick={() => handleSortChange('priority')}>Priority</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Button variant="outline-primary" size="sm" onClick={handleFilterClick}>
              <i className="bi bi-filter me-1"></i> Filter
            </Button>
          </div>

          <div className="ms-auto">
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="bi bi-layout-three-columns me-1"></i> Group By: {localGroupBy === 'status' ? 'Status' : 
                                                                 localGroupBy === 'supplier' ? 'Supplier' : 
                                                                 localGroupBy === 'location' ? 'Location' : 'Buyer'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item active={localGroupBy === 'status'} onClick={() => handleGroupChange('status')}>Status</Dropdown.Item>
                <Dropdown.Item active={localGroupBy === 'supplier'} onClick={() => handleGroupChange('supplier')}>Supplier</Dropdown.Item>
                <Dropdown.Item active={localGroupBy === 'location'} onClick={() => handleGroupChange('location')}>Location</Dropdown.Item>
                <Dropdown.Item active={localGroupBy === 'buyer'} onClick={() => handleGroupChange('buyer')}>Buyer</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Card.Header>
        
        <Card.Body className="p-0">
          <div className="kanban-container p-2">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="d-flex kanban-columns-container overflow-auto px-2 py-3" style={{ minHeight: '500px' }}>
                {columns.map((column) => (
                  <div className="kanban-column mx-2" key={column.id} style={{ minWidth: '300px' }}>
                    <div 
                      className="kanban-column-header p-2 rounded-top" 
                      style={{ 
                        backgroundColor: column.color || '#f8f9fa',
                        color: column.color ? '#fff' : '#212529'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">{column.title}</h6>
                        <Badge bg="light" text="dark">{column.items.length}</Badge>
                      </div>
                    </div>
                    
                    <Droppable droppableId={column.id}>
                      {(provided) => (
                        <div
                          className="kanban-column-content p-2 bg-light rounded-bottom"
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          style={{ minHeight: '200px' }}
                        >
                          {column.items.map((po, index) => (
                            <Draggable key={po.header.poNumber} draggableId={po.header.poNumber} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="kanban-card mb-2 p-3 bg-white rounded shadow-sm"
                                  onClick={() => handleCardClick(po.header.poNumber)}
                                >
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <h6 className="mb-0">{po.header.poNumber}</h6>
                                    <Badge 
                                      bg={getStatusColor(po.header.status).replace('#', '')} 
                                      style={{ backgroundColor: getStatusColor(po.header.status) }}
                                    >
                                      {po.header.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="small mb-2 fw-bold">
                                    {po.header.syscoLocation.name}
                                  </div>
                                  
                                  <div className="d-flex justify-content-between text-muted small">
                                    <div>
                                      <i className="bi bi-calendar3 me-1"></i>
                                      {formatDate(po.header.orderDate)}
                                    </div>
                                    <div>
                                      <i className="bi bi-cash me-1"></i>
                                      {formatCurrency(po.totalCost)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          </div>
        </Card.Body>

        {/* Render the filter modal */}
        {filterModal}
      </Card>
    </div>
  );
};

export default KanbanBoard;