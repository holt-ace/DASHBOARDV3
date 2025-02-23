/**
 * Core schema definitions
 * Single source of truth for data structure
 */

// Schema version for tracking changes
export const SCHEMA_VERSION = '1.0.0';

// Core schema definition
export const schema = {
    header: {
        poNumber: String,
        ocNumber: String,
        orderDate: String,
        status: String,
        buyerInfo: {
            firstName: String,
            lastName: String,
            originalFormat: String,
            email: String
        },
        syscoLocation: {
            name: String,
            address: String,
            region: String
        },
        deliveryInfo: {
            date: String,
            instructions: String
        }
    },
    products: [{
        supc: String,
        itemCode: String,
        description: String,
        packSize: String,
        quantity: Number,
        fobCost: Number,
        total: Number
    }],
    weights: {
        grossWeight: Number,
        netWeight: Number
    },
    totalCost: Number,
    revision: Number,
    revisionInfo: String
};

// Required fields by section
export const REQUIRED_FIELDS = {
    header: [
        'poNumber',
        'buyerInfo.firstName',
        'buyerInfo.lastName',
        'buyerInfo.email',
        'syscoLocation.name'
    ],
    products: [
        'supc',
        'quantity',
        'fobCost',
        'total'
    ],
    weights: [
        'grossWeight',
        'netWeight'
    ],
    root: [
        'totalCost'
    ]
};

// Field format specifications
export const FIELD_FORMATS = {
    'header.orderDate': {
        format: 'YYYY-MM-DD',
        description: 'Order date in ISO format'
    },
    'header.deliveryInfo.date': {
        format: 'YYYY-MM-DD',
        description: 'Delivery date in ISO format'
    },
    'header.buyerInfo.email': {
        format: 'email',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        description: 'Valid email address'
    },
    'header.poNumber': {
        pattern: /^\d{6,10}$/,
        description: 'PO number (6-10 digits)'
    },
    'products[].supc': {
        pattern: /^\d{6,8}$/,
        description: 'SUPC (6-8 digits)'
    }
};

// Business validation rules
export const BUSINESS_RULES = {
    'weights': {
        validate: (weights) => weights.grossWeight > weights.netWeight,
        message: 'Gross weight must be greater than net weight'
    },
    'products[].total': {
        validate: (total, product) => total === product.quantity * product.fobCost,
        message: 'Product total must equal quantity * FOB cost'
    },
    'products[].quantity': {
        validate: (quantity) => quantity > 0,
        message: 'Product quantity must be greater than 0'
    },
    'products[].fobCost': {
        validate: (cost) => cost >= 0,
        message: 'FOB cost cannot be negative'
    },
    'totalCost': {
        validate: (total, data) => {
            const productTotal = data.products.reduce((sum, p) => sum + p.total, 0);
            return Math.abs(total - productTotal) < 0.01; // Account for floating point
        },
        message: 'Total cost must equal sum of product totals'
    }
};

// Default values for optional fields
export const DEFAULT_VALUES = {
    'revision': 1,
    'revisionInfo': 'Initial version',
    'header.status': 'UPLOADED'
};

// Field type definitions for documentation
export const FIELD_TYPES = {
    STRING: 'string',
    NUMBER: 'number',
    OBJECT: 'object',
    ARRAY: 'array',
    DATE: 'date'
};

// Schema metadata for documentation
export const SCHEMA_METADATA = {
    version: SCHEMA_VERSION,
    description: 'Purchase order management schema',
    lastUpdated: '2025-02-05',
    maintainer: 'DashboardV2 Team',
    repository: 'https://github.com/yourusername/DashboardV2'
};

// Export combined schema configuration
export const schemaConfig = {
    version: SCHEMA_VERSION,
    schema,
    requiredFields: REQUIRED_FIELDS,
    fieldFormats: FIELD_FORMATS,
    businessRules: BUSINESS_RULES,
    defaultValues: DEFAULT_VALUES,
    metadata: SCHEMA_METADATA
};