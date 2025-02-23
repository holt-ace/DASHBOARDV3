import { WORKFLOW } from './definitions.js';
import {
    StatusErrorType,
    TransitionType,
    createValidationResult,
    createHistoryEntry,
    createTransition,
    createStatusError
} from './types/status.js';

/**
 * Status transition manager
 * Handles status transitions and validation
 */
export default class TransitionManager {
    constructor(workflow = WORKFLOW) {
        this.workflow = workflow;
    }

    /**
     * Validate a status transition
     */
    async validateTransition(from, to, data = {}) {
        // Validate statuses exist
        if (!this.isValidStatus(from) || !this.isValidStatus(to)) {
            return createValidationResult(false, [
                createStatusError(
                    StatusErrorType.INVALID_STATUS,
                    `Invalid status: ${!this.isValidStatus(from) ? from : to}`
                )
            ]);
        }

        // Validate transition is allowed
        const allowedTransitions = this.workflow.statuses[from].allowedTransitions;
        if (!allowedTransitions.includes(to)) {
            return createValidationResult(
                false,
                [createStatusError(
                    StatusErrorType.INVALID_TRANSITION,
                    `Invalid transition: ${from} -> ${to}`
                )],
                { allowedTransitions }
            );
        }

        // Validate requirements for target status
        const requirements = this.workflow.statuses[to].requirements;
        const errors = [];

        for (const [name, requirement] of Object.entries(requirements)) {
            try {
                if (!requirement.validate(data)) {
                    errors.push(createStatusError(
                        StatusErrorType.REQUIREMENTS_NOT_MET,
                        requirement.message || `Requirement not met: ${name}`
                    ));
                }
            } catch (error) {
                errors.push(createStatusError(
                    StatusErrorType.VALIDATION_FAILED,
                    `Validation error for ${name}: ${error.message}`
                ));
            }
        }

        return createValidationResult(
            errors.length === 0,
            errors,
            {
                allowedTransitions,
                requirements: Object.keys(requirements)
            }
        );
    }

    /**
     * Perform status transition
     */
    async transition(from, to, options = {}) {
        const {
            reason = '',
            data = {},
            userId = 'system',
            skipValidation = false
        } = options;

        // Validate transition if required
        if (!skipValidation) {
            const validation = await this.validateTransition(from, to, data);
            if (!validation.valid) {
                throw new Error(
                    `Invalid transition: ${validation.errors.map(e => e.message).join(', ')}`
                );
            }
        }

        // Create history entry and transition result
        const historyEntry = createHistoryEntry(to, reason, data, userId);
        const transitionType = this.getTransitionType(from, to);

        return {
            success: true,
            transition: createTransition(from, to, reason, data, userId),
            historyEntry,
            type: transitionType,
            timestamp: new Date()
        };
    }

    /**
     * Get transition type
     */
    getTransitionType(from, to) {
        // Special cases
        if (to === this.workflow.initial || to === 'CANCELLED') {
            return TransitionType.RESET;
        }

        // Get status order from workflow
        const statusOrder = Object.keys(this.workflow.statuses);
        const fromIndex = statusOrder.indexOf(from);
        const toIndex = statusOrder.indexOf(to);

        return toIndex > fromIndex ? TransitionType.FORWARD : TransitionType.BACKWARD;
    }

    /**
     * Get available transitions
     */
    getAvailableTransitions(status) {
        return this.workflow.statuses[status]?.allowedTransitions || [];
    }

    /**
     * Check if status exists
     */
    isValidStatus(status) {
        return !!this.workflow.statuses[status];
    }

    /**
     * Get status metadata
     */
    getStatusMetadata(status) {
        return this.workflow.statuses[status]?.metadata || {};
    }
}

// Export types and utilities
export {
    StatusErrorType,
    TransitionType,
    createValidationResult,
    createHistoryEntry,
    createTransition,
    createStatusError
};