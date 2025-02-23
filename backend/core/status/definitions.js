import { StatusColor, RequirementLevel } from './types/status.js';

/**
 * Status definitions and configuration
 * Reflects the business workflow of PO management from upload through delivery
 */

// Core status definitions
export const STATUSES = {
    UPLOADED: {
        name: 'UPLOADED',
        label: 'Uploaded',
        description: 'PO has been uploaded to dashboard',
        color: StatusColor.UPLOADED,
        allowedTransitions: ['CONFIRMED', 'CANCELLED'],
        requirements: {
            validData: {
                level: RequirementLevel.MANDATORY,
                validate: (data) => data.header && data.products && data.weights,
                message: 'Required PO data missing'
            },
            completeFields: {
                level: RequirementLevel.MANDATORY,
                validate: (data) => data.header.poNumber && data.header.buyerInfo,
                message: 'Required fields missing'
            }
        },
        metadata: {
            editable: true,
            requiresNotes: false,
            isInitial: true
        }
    },
    CONFIRMED: {
        name: 'CONFIRMED',
        label: 'Confirmed',
        description: 'PO data verified and accepted',
        color: StatusColor.CONFIRMED,
        allowedTransitions: ['SHIPPED', 'CANCELLED'],
        requirements: {
            dataVerified: {
                level: RequirementLevel.MANDATORY,
                validate: (data) => !data.validationErrors?.length,
                message: 'Data verification required'
            }
        },
        metadata: {
            editable: true,
            requiresNotes: false,
            isTerminal: false
        }
    },
    SHIPPED: {
        name: 'SHIPPED',
        label: 'Shipped',
        description: 'Order has been shipped',
        color: StatusColor.SHIPPED,
        allowedTransitions: ['INVOICED', 'CANCELLED'],
        requirements: {
            shippingDetails: {
                level: RequirementLevel.MANDATORY,
                validate: (data) => data.header.deliveryInfo?.date,
                message: 'Shipping date required'
            }
        },
        metadata: {
            editable: false,
            requiresNotes: true,
            isTerminal: false
        }
    },
    INVOICED: {
        name: 'INVOICED',
        label: 'Invoiced',
        description: 'Invoice has been sent',
        color: StatusColor.INVOICED,
        allowedTransitions: ['DELIVERED', 'CANCELLED'],
        requirements: {
            invoiceDetails: {
                level: RequirementLevel.MANDATORY,
                validate: (data) => data.invoiceDate && data.invoiceNumber,
                message: 'Invoice details required'
            }
        },
        metadata: {
            editable: false,
            requiresNotes: true,
            isTerminal: false
        }
    },
    DELIVERED: {
        name: 'DELIVERED',
        label: 'Delivered',
        description: 'Order successfully delivered',
        color: StatusColor.DELIVERED,
        allowedTransitions: [],
        requirements: {
            deliveryConfirmation: {
                level: RequirementLevel.MANDATORY,
                validate: (data) => data.deliveryDate && data.receivedBy,
                message: 'Delivery confirmation required'
            }
        },
        metadata: {
            editable: false,
            requiresNotes: true,
            isTerminal: true
        }
    },
    CANCELLED: {
        name: 'CANCELLED',
        label: 'Cancelled',
        description: 'Order has been cancelled',
        color: StatusColor.CANCELLED,
        allowedTransitions: [],
        requirements: {
            cancellationReason: {
                level: RequirementLevel.MANDATORY,
                validate: (data) => data.cancellationReason && data.cancellationDate,
                message: 'Cancellation reason required'
            }
        },
        metadata: {
            editable: false,
            requiresNotes: true,
            isTerminal: true
        }
    }
};

// Status workflow configuration
export const WORKFLOW = {
    initial: 'UPLOADED',
    statuses: STATUSES,
    metadata: {
        version: '1.0.0',
        description: 'Purchase Order workflow from upload through delivery',
        lastUpdated: '2025-02-05'
    }
};

import logger from '../../utils/logger.js';

// Status transition hooks
export const TRANSITION_HOOKS = {
    beforeTransition: async (transition) => {
        // Log transition start
        logger.info(`Starting transition from ${transition.from} to ${transition.to}`);
    },
    afterTransition: async (transition) => {
        // Update metrics or trigger notifications
        logger.info(`Completed transition from ${transition.from} to ${transition.to}`);
    },
    onError: async (error, transition) => {
        // Handle transition errors
        logger.error(`Error in transition from ${transition.from} to ${transition.to}:`, error);
    }
};

// Status requirement levels configuration
export const REQUIREMENT_LEVELS = {
    [RequirementLevel.MANDATORY]: {
        blocking: true,
        skipValidation: false,
        errorLevel: 'error'
    },
    [RequirementLevel.RECOMMENDED]: {
        blocking: false,
        skipValidation: false,
        errorLevel: 'warning'
    },
    [RequirementLevel.OPTIONAL]: {
        blocking: false,
        skipValidation: true,
        errorLevel: 'info'
    }
};

// Status validation configuration
export const VALIDATION_CONFIG = {
    validateRequirements: true,
    validateTransitions: true,
    validateMetadata: true,
    strictMode: true
};

// Export combined status configuration
export const statusConfig = {
    workflow: WORKFLOW,
    hooks: TRANSITION_HOOKS,
    requirementLevels: REQUIREMENT_LEVELS,
    validation: VALIDATION_CONFIG
};