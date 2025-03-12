/**
 * Navigation Utility
 * 
 * Provides a consistent way to handle navigation in the application.
 * Instead of directly manipulating window.location, this utility uses
 * React Router methods when possible, falling back to direct manipulation
 * only when necessary.
 */

import { NavigateFunction, NavigateOptions, To } from 'react-router-dom';
import Logger from './logger';

// Store the navigate function from useNavigate hook
let navigateFunction: ((to: To, options?: NavigateOptions) => void) | null = null;

/**
 * Initialize the navigation utility with the navigate function from React Router
 * This should be called in the main App component or a high-level context provider
 */
export const initializeNavigation = (navigate: NavigateFunction): void => {
  navigateFunction = navigate;
  Logger.debug('[DEBUG] Navigation utility initialized with React Router navigate function');
};

/**
 * Navigate to a route using React Router
 * @param path The path to navigate to
 * @param options Navigation options
 */
export const navigate = (path: To, options?: NavigateOptions): void => {
  try {
    Logger.debug(`[NAVIGATION] Attempting to navigate to: ${path}`, options);
    
    // Check if we have a valid navigate function
    if (!navigateFunction) {
      Logger.warn('[NAVIGATION] React Router navigate function not available, falling back to window.location');
      
      // Fall back to window.location if React Router is not available
      if (options?.replace) {
        window.location.replace(path.toString());
      } else {
        window.location.href = path.toString();
      }
      return;
    }
    
    // React Router navigation
    try {
      navigateFunction(path, options);
      Logger.debug(`[NAVIGATION] Successfully navigated to: ${path}`);
    } catch (routerError) {
      Logger.error(`[NAVIGATION] React Router navigation failed:`, routerError);
      throw routerError; // Re-throw to allow caller to handle
    }
  }
  catch (error) {
    Logger.error(`[NAVIGATION] Critical error during navigation:`, error);
    // Try fallback navigation as last resort
    try {
      const pathStr = typeof path === 'string' ? path : JSON.stringify(path);
      Logger.warn(`[NAVIGATION] Attempting fallback navigation to ${pathStr}`);
      window.location.href = path.toString();
    } catch (fallbackError) {
      Logger.error(`[NAVIGATION] Fallback navigation failed:`, fallbackError);
    }
  }
};

/**
 * Navigate to a purchase order detail page
 * @param poNumber The purchase order number
 */
export const navigateToPODetail = (poNumber: string | number): void => {
  navigate(`/purchase-orders/${poNumber}`);
};

/**
 * Navigate to the purchase order creation page
 */
export const navigateToPOCreation = (options?: NavigateOptions): void => {
  navigate('/purchase-orders/create', options);
};

/**
 * Navigate to the purchase order list page
 */
export const navigateToPOList = (options?: NavigateOptions): void => {
  navigate('/purchase-orders', options);
};

/**
 * Navigate to the dashboard page
 */
export const navigateToDashboard = (options?: NavigateOptions): void => {
  navigate('/', options);
};

/**
 * Navigate to the metrics dashboard page
 */
export const navigateToMetrics = (options?: NavigateOptions): void => {
  navigate('/metrics', options);
};

/**
 * Navigate to the planning hub page
 */
export const navigateToPlanningHub = (options?: NavigateOptions): void => {
  navigate('/planning-hub', options);
};

/**
 * Navigate to an external URL
 * This always uses window.location to ensure correct behavior
 * @param url The external URL to navigate to
 * @param newTab Whether to open in a new tab
 */
export const navigateToExternal = (url: string, newTab = false): void => {
  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }
};

// Default export as an object with all navigation methods
const Navigation = {
  initialize: initializeNavigation,
  navigate,
  toPODetail: navigateToPODetail,
  toPOCreation: navigateToPOCreation,
  toPOList: navigateToPOList,
  toDashboard: navigateToDashboard,
  toMetrics: navigateToMetrics,
  toPlanningHub: navigateToPlanningHub,
  toExternal: navigateToExternal
};

export default Navigation;