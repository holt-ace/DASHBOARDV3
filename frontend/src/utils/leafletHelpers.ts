import React from 'react';
import ReactDOMServer from 'react-dom/server';
import L from 'leaflet';
import Logger from './logger';

/**
 * Creates a Leaflet popup from a React component
 * 
 * This helper function safely converts a React component to HTML string for use in Leaflet popups.
 * It prevents XSS vulnerabilities that can happen with direct string concatenation.
 * 
 * @param component React component to render in the popup
 * @param options Leaflet popup options
 * @returns Leaflet Popup instance
 */
export function createPopupFromReact(
  component: React.ReactElement,
  options: L.PopupOptions = {}
): L.Popup {
  try {
    // Render the React component to an HTML string
    const html = ReactDOMServer.renderToString(component);
    
    // Create and return a Leaflet popup with the rendered HTML
    return L.popup({
      // Default options that can be overridden
      className: 'react-popup',
      closeButton: true,
      maxWidth: 300,
      minWidth: 200,
      ...options
    }).setContent(html);
  } catch (error) {
    Logger.error('Error rendering React component to popup:', error);
    // Fallback to simple error message if rendering fails
    return L.popup(options).setContent('Error displaying popup content');
  }
}

/**
 * Get a color for a marker based on PO status
 * 
 * @param status The purchase order status
 * @returns Hex color code
 */
export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'UPLOADED': return '#FF9800'; // Orange
    case 'CONFIRMED': return '#2196F3'; // Blue 
    case 'SHIPPED': return '#673AB7'; // Purple
    case 'INVOICED': return '#3F51B5'; // Indigo
    case 'DELIVERED': return '#4CAF50'; // Green
    case 'CANCELLED': return '#F44336'; // Red
    default: return '#9E9E9E'; // Grey
  }
}

/**
 * Format a date for display
 * 
 * @param dateString ISO date string
 * @returns Formatted date string or 'N/A' if invalid
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    Logger.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Format currency for display
 * 
 * @param amount Number to format as currency
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}