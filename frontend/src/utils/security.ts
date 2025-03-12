/**
 * Security Utility
 * 
 * Provides helper functions for common security concerns including
 * XSS prevention, sanitization, and other security-related functionality.
 */

import Logger from './logger';

/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML entities
 * 
 * @param input The string to sanitize
 * @returns The sanitized string with HTML entities escaped
 */
export function sanitizeString(input: string): string {
  if (!input) {
    return '';
  }
  
  try {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  } catch (error) {
    Logger.error('Error sanitizing string:', error);
    // Fall back to basic string replacement if DOM manipulation fails
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Validates and sanitizes a URL to prevent security issues like open redirects
 * and javascript: protocol exploits
 * 
 * @param url The URL to validate and sanitize
 * @returns The sanitized URL or null if the URL is invalid or potentially dangerous
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) {
    return null;
  }
  
  try {
    // Check for javascript: protocol which could be used for XSS
    if (/^javascript:/i.test(url.trim())) {
      Logger.warn('Blocked potentially dangerous javascript: URL:', url);
      return null;
    }
    
    // For fully qualified URLs, validate with the URL constructor
    if (/^(https?|ftp):/i.test(url)) {
      new URL(url); // This will throw if the URL is invalid
      return url;
    }
    
    // For relative URLs, ensure they don't try to break out of expected paths
    if (url.includes('..') || url.includes('\\')) {
      Logger.warn('Blocked potentially dangerous path traversal in URL:', url);
      return null;
    }
    
    // Assume valid relative URL
    return url;
  } catch (error) {
    Logger.error('Error validating URL:', error);
    return null;
  }
}

/**
 * Validates data to ensure it's safe to use in React application
 * 
 * @param data Data to validate, typically from an API or user input
 * @param allowedKeys Optional array of keys to restrict validation to
 * @returns Sanitized data object
 */
export function sanitizeData(
  data: Record<string, any>,
  allowedKeys?: string[]
): Record<string, any> {
  const result: Record<string, any> = { ...data };
  
  // Process each key in the object
  Object.keys(result).forEach(key => {
    // Skip keys not in allowedKeys if specified
    if (allowedKeys && !allowedKeys.includes(key)) {
      delete result[key as keyof typeof result];
      return;
    }
    
    // Sanitize based on value type
    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key] as string);
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      // Recursively sanitize nested objects
      result[key] = Array.isArray(result[key]) 
        ? result[key].map((item: any) => 
            typeof item === 'object' && item !== null 
              ? sanitizeData(item) 
              : typeof item === 'string' 
                ? sanitizeString(item) 
                : item)
        : sanitizeData(result[key]);
    }
    // Numbers, booleans, and null/undefined are left as-is
  });
  
  return result;
}

/**
 * Validates if a string meets a valid SUPC format
 * 
 * @param supc The SUPC string to validate
 * @returns Boolean indicating if the SUPC is valid
 */
export function isValidSUPC(supc: string): boolean {
  // SUPCs are typically numeric and fixed length
  // Adjust this regex based on your actual SUPC format requirements
  const supcRegex = /^\d{6,12}$/;
  return supcRegex.test(supc);
}

/**
 * Validates if a string is a valid PO number
 * 
 * @param poNumber The PO number to validate
 * @returns Boolean indicating if the PO number is valid
 */
export function isValidPONumber(poNumber: string): boolean {
  // PO numbers typically start with "PO" followed by digits
  // Adjust this regex based on your actual PO number format requirements
  const poRegex = /^PO\d{6,10}$/;
  return poRegex.test(poNumber);
}

/**
 * Creates a Content Security Policy (CSP) nonce for inline scripts
 * to help prevent XSS attacks with a trusted inline script
 * 
 * @returns A random nonce value for use in CSP
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Default export as an object with all security methods
const Security = {
  sanitizeString,
  sanitizeUrl,
  sanitizeData,
  isValidSUPC,
  isValidPONumber,
  generateCSPNonce
};

export default Security;