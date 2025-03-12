/**
 * Environment utility to centralize access to environment variables
 * This helps abstract away the differences between Vite's import.meta.env and Node's process.env
 */

// Helper for checking development mode
export const isDevelopment = (): boolean => {
  // Use import.meta.env for Vite
  return import.meta.env.VITE_NODE_ENV === 'development' || 
         import.meta.env.DEV === true ||
         import.meta.env.MODE === 'development';
};

// Helper for checking production mode
export const isProduction = (): boolean => {
  return !isDevelopment();
};

// API URL with fallbacks
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || '/api/po';
};

// Get any environment variable with a fallback
export const getEnv = (key: string, fallback: string): string => {
  const value = (import.meta.env as Record<string, any>)[key];
  return value !== undefined ? String(value) : fallback;
};

// For direct NODE_ENV access (compatibility layer)
export const getNodeEnv = (): string => {
  return isDevelopment() ? 'development' : 'production';
};

// For build configuration
export const useEsbuild = (): boolean => {
  return getEnv('VITE_USE_ESBUILD', 'false') === 'true';
};

// Export a default object for convenience
export default {
  isDevelopment,
  isProduction,
  getApiBaseUrl,
  getEnv,
  getNodeEnv,
  useEsbuild
};