import { WORKFLOW, STATUSES, statusConfig } from './definitions.js';
import TransitionManager from './transitions.js';
import {
    StatusErrorType,
    TransitionType,
    createValidationResult,
    createHistoryEntry,
    createTransition,
    createStatusError
} from './types/status.js';

/**
 * Status management service
 * Provides unified interface for status operations
 */
export class StatusService {
    constructor() {
        this.workflow = WORKFLOW;
        this.statuses = STATUSES;
        this.transitionManager = new TransitionManager();
    }

    /**
     * Get all available statuses
     * @returns {Object} Status definitions
     */
    getStatuses() {
        return this.statuses;
    }

    /**
     * Get status definition
     * @param {string} status - Status to get
     * @returns {Object} Status definition
     */
    getStatus(status) {
        return this.statuses[status];
    }

    /**
     * Get initial status
     * @returns {string} Initial status
     */
    getInitialStatus() {
        return this.workflow.initial;
    }

    /**
     * Get available transitions for status
     * @param {string} status - Current status
     * @returns {string[]} Available transitions
     */
    getAvailableTransitions(status) {
        return this.transitionManager.getAvailableTransitions(status);
    }

    /**
     * Validate status transition
     * @param {string} from - Current status
     * @param {string} to - Target status
     * @param {Object} data - Status data
     * @returns {Promise<import('./types/status.js').StatusValidationResult>}
     */
    async validateTransition(from, to, data) {
        return this.transitionManager.validateTransition(from, to, data);
    }

    /**
     * Perform status transition
     * @param {string} from - Current status
     * @param {string} to - Target status
     * @param {Object} options - Transition options
     * @returns {Promise<Object>} Transition result
     */
    async transition(from, to, options) {
        return this.transitionManager.transition(from, to, options);
    }

    /**
     * Check if status is terminal
     * @param {string} status - Status to check
     * @returns {boolean} Whether status is terminal
     */
    isTerminalStatus(status) {
        return this.statuses[status]?.metadata?.isTerminal || false;
    }

    /**
     * Check if status requires notes
     * @param {string} status - Status to check
     * @returns {boolean} Whether status requires notes
     */
    requiresNotes(status) {
        return this.statuses[status]?.metadata?.requiresNotes || false;
    }

    /**
     * Check if status is editable
     * @param {string} status - Status to check
     * @returns {boolean} Whether status is editable
     */
    isEditable(status) {
        return this.statuses[status]?.metadata?.editable || false;
    }

    /**
     * Get status color
     * @param {string} status - Status to get color for
     * @returns {string} Status color
     */
    getStatusColor(status) {
        return this.statuses[status]?.color;
    }

    /**
     * Get status label
     * @param {string} status - Status to get label for
     * @returns {string} Status label
     */
    getStatusLabel(status) {
        return this.statuses[status]?.label || status;
    }

    /**
     * Get status description
     * @param {string} status - Status to get description for
     * @returns {string} Status description
     */
    getStatusDescription(status) {
        return this.statuses[status]?.description;
    }

    /**
     * Get status requirements
     * @param {string} status - Status to get requirements for
     * @returns {Object} Status requirements
     */
    getStatusRequirements(status) {
        return this.statuses[status]?.requirements || {};
    }

    /**
     * Check if status exists
     * @param {string} status - Status to check
     * @returns {boolean} Whether status exists
     */
    isValidStatus(status) {
        return this.transitionManager.isValidStatus(status);
    }
}

// Export singleton instance
// export const statusService = new StatusService();  <- No longer needed for frontend

// Export types and utilities
export {
    StatusErrorType,
    TransitionType,
    createValidationResult,
    createHistoryEntry,
    createTransition,
    createStatusError,
    statusConfig
};