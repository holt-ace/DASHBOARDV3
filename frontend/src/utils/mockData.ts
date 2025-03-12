import { POStatus, PurchaseOrder } from '@/types/purchaseOrder';

// Mock purchase orders data with history
export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    header: {
      poNumber: '123456',
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
      poNumber: '123457',
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
      poNumber: '123458',
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

// Add more mock data sets as needed