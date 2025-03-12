import { isDevelopment, isProduction } from './env';

/**
 * Logger Utility
 * 
 * Environment-aware logging utility to replace direct console calls.
 * In production, logs will be suppressed or sent to a monitoring service.
 * In development, logs will be output to the console with enhanced formatting.
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Minimum log level for current environment
// In production, we only want to see warnings and errors
const MIN_LOG_LEVEL = isProduction() 
  ? LogLevel.WARN
  : LogLevel.DEBUG;

// Color codes for console output in development
const COLORS = {
  DEBUG: '#7B7B7B', // gray
  INFO: '#0976DB',  // blue
  WARN: '#F5A623',  // orange
  ERROR: '#D0021B', // red
  RESET: ''
};

/**
 * Log a message at the specified level
 * @param level The log level
 * @param message The message to log
 * @param data Additional data to log
 */
function log(level: LogLevel, message: string, ...data: any[]): void {
  // Skip logging if level is below minimum
  if (level < MIN_LOG_LEVEL) {
    return;
  }
  
  // Get level name for display
  const levelName = LogLevel[level];
  
  // In production, logs could be sent to a monitoring service
  if (isProduction()) {
    // For now, just use console methods based on level
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.info(`[${levelName}] ${message}`, ...data);
        break;
      case LogLevel.WARN:
        console.warn(`[${levelName}] ${message}`, ...data);
        break;
      case LogLevel.ERROR:
        console.error(`[${levelName}] ${message}`, ...data);
        break;
    }
    
    // In a real app, we might send logs to a service like Sentry
    // Example:
    // if (level >= LogLevel.ERROR) {
    //   Sentry.captureException(new Error(message), {
    //     extra: { data }
    //   });
    // }
    
    return;
  }
  
  // In development, use formatted console logs
  // Use type assertion to ensure TypeScript knows levelName is a valid key
  const color = COLORS[levelName as keyof typeof COLORS] || COLORS.RESET;
  // Format the output
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  const prefix = `%c[${levelName}]%c ${timestamp}:`;
  
  // Log with styling
  switch (level) {
    case LogLevel.DEBUG:
    case LogLevel.INFO:
      console.log(prefix, `color: ${color}; font-weight: bold`, '', message, ...data);
      break;
    case LogLevel.WARN:
      console.warn(prefix, `color: ${color}; font-weight: bold`, '', message, ...data);
      break;
    case LogLevel.ERROR:
      console.error(prefix, `color: ${color}; font-weight: bold`, '', message, ...data);
      break;
  }
}

// Convenience methods for each log level
export const Logger = {
  debug: (message: string, ...data: any[]) => log(LogLevel.DEBUG, message, ...data),
  info: (message: string, ...data: any[]) => log(LogLevel.INFO, message, ...data),
  warn: (message: string, ...data: any[]) => log(LogLevel.WARN, message, ...data),
  error: (message: string, ...data: any[]) => log(LogLevel.ERROR, message, ...data),
  
  // Group methods for related logs
  groupStart: (name: string, collapsed = false) => {
    if (isDevelopment()) {
      collapsed ? console.groupCollapsed(name) : console.group(name);
    }
  },
  groupEnd: () => {
    if (isDevelopment()) {
      console.groupEnd();
    }
  },
  
  // Performance logging
  time: (label: string) => {
    if (isDevelopment()) {
      console.time(label);
    }
  },
  timeEnd: (label: string) => {
    if (isDevelopment()) {
      console.timeEnd(label);
    }
  }
};

export default Logger;