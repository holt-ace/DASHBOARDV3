import React from 'react';
import { POStatus } from '@/types/purchaseOrder';
import { Button } from 'react-bootstrap';

interface MapPopupProps {
  poNumber: string;
  status: POStatus;
  location: string;
  totalCost: number;
  deliveryDate?: string;
  selected: boolean;
  onViewDetails: () => void;
  onToggleSelection: () => void;
}

/**
 * MapPopup Component
 * 
 * React component for Leaflet popups used in the GeographicMap.
 * This replaces the string template HTML approach with proper React rendering
 * to prevent XSS vulnerabilities.
 */
const MapPopup: React.FC<MapPopupProps> = ({
  poNumber,
  status,
  location,
  totalCost,
  deliveryDate,
  selected,
  onViewDetails,
  onToggleSelection
}) => {
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get status color based on status
  const getStatusColor = (status: POStatus): string => {
    switch (status) {
      case POStatus.UPLOADED: return '#FF9800'; // Orange
      case POStatus.CONFIRMED: return '#2196F3'; // Blue
      case POStatus.SHIPPED: return '#673AB7'; // Purple
      case POStatus.INVOICED: return '#3F51B5'; // Indigo
      case POStatus.DELIVERED: return '#4CAF50'; // Green
      case POStatus.CANCELLED: return '#F44336'; // Red
      default: return '#9E9E9E'; // Grey
    }
  };

  // Create a static HTML string that will be inserted into the Leaflet popup
  // This is why we're careful to avoid any potential XSS vulnerabilities
  // by properly escaping content and using React's rendering
  return (
    <div className="marker-info-popup">
      <h6>{poNumber}</h6>
      <div className="mb-2">
        <span
          className="status-badge"
          style={{
            backgroundColor: getStatusColor(status),
            display: 'inline-block',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: 'white'
          }}
        >
          {status}
        </span>
      </div>
      <div className="mb-1"><strong>Location:</strong> {location}</div>
      <div className="mb-1"><strong>Total:</strong> {formatCurrency(totalCost)}</div>
      {deliveryDate && (
        <div className="mb-1"><strong>Delivery:</strong> {formatDate(deliveryDate)}</div>
      )}
      <div className="d-flex justify-content-between mt-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onToggleSelection}
          style={{
            padding: '2px 8px',
            fontSize: '0.75rem'
          }}
        >
          {selected ? 'Deselect' : 'Select'}
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onViewDetails}
          style={{
            padding: '2px 8px',
            fontSize: '0.75rem'
          }}
        >
          View Details
        </Button>
      </div>
    </div>
  );
};

export default MapPopup;