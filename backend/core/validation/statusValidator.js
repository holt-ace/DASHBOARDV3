import { createStatusValidation, createValidationError, ValidationErrorType } from './types/validation.js';

// Define status workflow and requirements
const STATUS_WORKFLOW = {
    DRAFT: {
        next: ['REVIEW'],
        requirements: {
            validData: (data) => data.header && data.products && data.weights,
            completeFields: (data) => data.header.poNumber && data.header.buyerInfo
        }
    },
    REVIEW: {
        next: ['APPROVED', 'DRAFT'],
        requirements: {
            validationPassed: (data) => !data.validationErrors?.length
        }
    },
    APPROVED: {
        next: ['PROCESSING'],
        requirements: {
            businessApproval: (data) => data.approvedBy && data.approvalDate
        }
    },
    PROCESSING: {
        next: ['COMPLETED'],
        requirements: {
            processingComplete: (data) => data.processedDate && data.processedBy
        }
    },
    COMPLETED: {
        next: [],
        requirements: {}
    }
};

/**
 * Validates a status transition
 * @param {import('./types/validation.js').StatusTransition} transition - Status transition
 * @returns {import('./types/validation.js').StatusValidation}
 */
export const validateStatusTransition = (transition) => {
    const { current, next, data } = transition;

    // Validate current status exists
    if (!STATUS_WORKFLOW[current]) {
        return createStatusValidation(false, [
            createValidationError(
                ValidationErrorType.STATUS_ERROR,
                `Invalid current status: ${current}`
            )
        ]);
    }

    // Validate next status exists
    if (!STATUS_WORKFLOW[next]) {
        return createStatusValidation(false, [
            createValidationError(
                ValidationErrorType.STATUS_ERROR,
                `Invalid next status: ${next}`
            )
        ]);
    }

    // Validate transition is allowed
    if (!STATUS_WORKFLOW[current].next.includes(next)) {
        return createStatusValidation(
            false,
            [
                createValidationError(
                    ValidationErrorType.STATUS_ERROR,
                    `Invalid status transition: ${current} -> ${next}`
                )
            ],
            { currentStatus: current },
            STATUS_WORKFLOW[current].next
        );
    }

    // Validate requirements for next status
    const requirements = STATUS_WORKFLOW[next].requirements;
    const errors = [];

    Object.entries(requirements).forEach(([requirement, validator]) => {
        if (!validator(data)) {
            errors.push(createValidationError(
                ValidationErrorType.STATUS_ERROR,
                `Requirement not met: ${requirement}`
            ));
        }
    });

    if (errors.length > 0) {
        return createStatusValidation(
            false,
            errors,
            { currentStatus: current },
            STATUS_WORKFLOW[current].next
        );
    }

    return createStatusValidation(
        true,
        [],
        { currentStatus: current, nextStatus: next },
        STATUS_WORKFLOW[current].next
    );
};

/**
 * Gets available status transitions
 * @param {string} status - Current status
 * @returns {string[]} Available transitions
 */
export const getAvailableTransitions = (status) => {
    if (!STATUS_WORKFLOW[status]) {
        return [];
    }
    return STATUS_WORKFLOW[status].next;
};

/**
 * Gets status requirements
 * @param {string} status - Status to check
 * @returns {Object} Status requirements
 */
export const getStatusRequirements = (status) => {
    if (!STATUS_WORKFLOW[status]) {
        return {};
    }
    return STATUS_WORKFLOW[status].requirements;
};

/**
 * Validates status requirements
 * @param {string} status - Status to validate
 * @param {Object} data - Data to validate against requirements
 * @returns {import('./types/validation.js').StatusValidation}
 */
export const validateStatusRequirements = (status, data) => {
    if (!STATUS_WORKFLOW[status]) {
        return createStatusValidation(false, [
            createValidationError(
                ValidationErrorType.STATUS_ERROR,
                `Invalid status: ${status}`
            )
        ]);
    }

    const requirements = STATUS_WORKFLOW[status].requirements;
    const errors = [];

    Object.entries(requirements).forEach(([requirement, validator]) => {
        if (!validator(data)) {
            errors.push(createValidationError(
                ValidationErrorType.STATUS_ERROR,
                `Requirement not met: ${requirement}`
            ));
        }
    });

    return createStatusValidation(
        errors.length === 0,
        errors,
        { status, requirements: Object.keys(requirements) }
    );
};

/**
 * Gets status workflow definition
 * @returns {Object} Status workflow definition
 */
export const getStatusWorkflow = () => STATUS_WORKFLOW;

/**
 * Validates if a status exists
 * @param {string} status - Status to validate
 * @returns {boolean} Whether the status exists
 */
export const isValidStatus = (status) => {
    return Object.keys(STATUS_WORKFLOW).includes(status);
};