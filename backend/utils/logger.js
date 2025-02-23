/**
 * Enhanced logger with safe console access and bind
 */
const createLogger = () => {
    // Safely get console methods with fallbacks
    const getConsoleMethod = (method) => {
        if (typeof console !== 'undefined' && console[method]) {
            return console[method].bind(console);
        }
        // Fallback to a safe no-op function
        return () => {};
    };

    return {
        info: (message, context = {}) => {
            const log = getConsoleMethod('log');
            log(message, context);
        },

        error: (message, error = null, context = {}) => {
            const errorLog = getConsoleMethod('error');
            if (error instanceof Error) {
                errorLog(message, error.message, context);
            } else {
                errorLog(message, error, context);
            }
        },

        warn: (message, context = {}) => {
            const warn = getConsoleMethod('warn');
            warn(message, context);
        },

        debug: (message, context = {}) => {
            const debug = getConsoleMethod('debug');
            debug(message, context);
        }
    };
};

// Create and export singleton instance
const logger = createLogger();
export default logger;
