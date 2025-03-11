/**
 * Purchase Order Model Types
 * 
 * These types define the structure of Purchase Orders and related data
 * They are based on the backend schema but adapted for frontend usage
 */

/**
 * Purchase Order Status Enum
 * Represents all possible states in the PO lifecycle
 */
export enum POStatus {
  UPLOADED = 'UPLOADED',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  INVOICED = 'INVOICED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

/**
 * Purchase Order Header
 * Contains primary metadata about the PO
 */
export interface POHeader {
  poNumber: string;
  ocNumber?: string;
  orderDate: string;
  status: POStatus;
  
  buyerInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  
  syscoLocation: {
    name: string;
    address?: string;
    region?: string;
  };
  
  deliveryInfo?: {
    date?: string;
    instructions?: string;
  };
}

/**
 * Purchase Order Product
 * Represents a product line item in the PO
 */
export interface POProduct {
  supc: string;
  itemCode?: string;
  description?: string;
  packSize?: string;
  quantity: number;
  fobCost: number;
  total: number;
}

/**
 * Purchase Order History Entry
 * Records a historical change to the PO
 */
export interface POHistoryEntry {
  timestamp: string;
  status: POStatus;
  user?: string;
  notes?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

/**
 * Purchase Order Weights
 * Contains weight information for the PO
 */
export interface POWeights {
  grossWeight: number;
  netWeight: number;
}

/**
 * Purchase Order Document
 * Represents a file attached to a PO
 */
export interface PODocument {
  id: string;
  url: string;
  name: string;
  type: string;
  uploadedAt: string;
}

/**
 * Purchase Order Invoice
 * Contains invoice information for a PO
 */
export interface POInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

/**
 * Purchase Order Shipping
 * Contains shipping information for a PO
 */
export interface POShipping {
  carrier: string;
  trackingNumber: string;
  shippingDate: string;
  estimatedDeliveryDate: string;
  actualDeliveryDate?: string;
  status?: 'in-transit' | 'delivered' | 'delayed' | 'returned';
}

/**
 * Purchase Order Delivery
 * Contains delivery confirmation information
 */
export interface PODelivery {
  deliveryDate: string;
  receivedBy: string;
  condition: 'good' | 'damaged' | 'partial';
  notes?: string;
  signatureUrl?: string;
}

/**
 * Complete Purchase Order
 * The main PO data structure
 */
export interface PurchaseOrder {
  header: POHeader;
  products: POProduct[];
  weights: POWeights;
  totalCost: number;
  revision: number;
  revisionInfo?: string;
  notes?: string;
  history?: POHistoryEntry[];
  documents?: PODocument[];
  invoice?: POInvoice;
  shipping?: POShipping;
  delivery?: PODelivery;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Status Requirement
 * Describes a validation requirement for a specific status
 */
export interface StatusRequirement {
  level: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
  validate: (data: any) => boolean;
  message: string;
}

/**
 * Status Requirements Map
 * Maps requirement keys to their definitions
 */
export interface StatusRequirements {
  [key: string]: StatusRequirement;
}

/**
 * Status Definition
 * Defines a status and its properties
 */
export interface StatusDefinition {
  name: string;
  label: string;
  description: string;
  color: string;
  allowedTransitions: POStatus[];
  requirements: StatusRequirements;
  metadata: {
    editable: boolean;
    requiresNotes: boolean;
    isInitial?: boolean;
    isTerminal?: boolean;
  };
}

/**
 * Validation Result
 * Result of validating PO data against requirements
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

/**
 * Validation Error
 * Describes a validation issue
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * PO Search Parameters
 * Parameters for searching and filtering POs
 */
export interface POSearchParams {
  page?: number;
  limit?: number;
  query?: string;
  status?: POStatus;
  startDate?: string;
  endDate?: string;
  buyerIds?: string[];
  locationIds?: string[];
}

/**
 * PO Search Result
 * Result of a PO search operation
 */
export interface POSearchResult {
  data: PurchaseOrder[];
  metadata?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

/**
 * Status Transition
 * Represents a transition between statuses
 */
export interface StatusTransition {
  from: POStatus;
  to: POStatus;
  notes?: string;
  options?: Record<string, any>;
}