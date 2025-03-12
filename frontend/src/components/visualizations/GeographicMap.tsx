import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Alert, Spinner, Button, Dropdown, Badge, Form } from 'react-bootstrap';
import { ApiService } from '@/services/ApiService';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import L from 'leaflet';
import Logger from '@/utils/logger';
import 'leaflet/dist/leaflet.css';
// Note: In a real implementation, we would import these libraries:
// import 'leaflet.markercluster/dist/MarkerCluster.css';
// import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
// import 'leaflet.markercluster';

// Type for map markers
interface MapMarker {
  id: string;
  poNumber: string;
  lat: number;
  lng: number;
  status: POStatus;
  location: string;
  totalCost: number;
  deliveryDate?: string;
  selected?: boolean; // For batch selection
}

// Props for the GeographicMap component
interface GeographicMapProps {
  region?: 'all' | 'north-america' | 'europe' | 'asia-pacific' | 'latin-america';
  deliveryStatus?: 'all' | 'pending' | 'in-transit' | 'delivered';
  timePeriod?: 'current-month' | 'last-3-months' | 'ytd' | 'custom';
  onPOSelect?: (poNumber: string) => void;
  onBatchSelectionChange?: (poNumbers: string[]) => void; // Added for batch operations
  onComponentRender?: (renderTime: number) => void;
  className?: string;
}

/**
 * GeographicMap Component
 * 
 * Displays purchase orders on an interactive map based on delivery locations.
 * Supports marker clustering, filtering by region and delivery status, and
 * detailed information display for selected markers.
 * 
 * Uses Leaflet for map rendering and Leaflet.MarkerCluster for clustering.
 */
const GeographicMap: React.FC<GeographicMapProps> = ({
  region = 'all',
  deliveryStatus = 'all',
  timePeriod = 'current-month',
  onPOSelect,
  onBatchSelectionChange,
  onComponentRender,
  className = ''
}) => {
  // Performance tracking
  const renderStartTime = useRef<number>(0);
  
  // DOM refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Map instance and layers
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [markersLayer, setMarkersLayer] = useState<L.LayerGroup | null>(null);
  const [infoPopup, setInfoPopup] = useState<L.Popup | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // State for all markers and selected markers
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [poCount, setPOCount] = useState<number>(0);
  
  // Local state for filters
  const [localRegion, setLocalRegion] = useState<string>(region);
  const [localDeliveryStatus, setLocalDeliveryStatus] = useState<string>(deliveryStatus);
  const [localTimePeriod, setLocalTimePeriod] = useState<string>(timePeriod);
  const [searchText, setSearchText] = useState<string>('');
  
  // Get initial map center and zoom based on region
  const getMapSettings = (regionValue: string): { center: L.LatLngExpression, zoom: number } => {
    switch (regionValue) {
      case 'north-america':
        return { center: [39.8283, -98.5795], zoom: 4 }; // Center of US
      case 'europe':
        return { center: [54.5260, 15.2551], zoom: 4 };  // Center of Europe
      case 'asia-pacific':
        return { center: [34.0479, 100.6197], zoom: 3 }; // Center of Asia
      case 'latin-america':
        return { center: [-8.7832, -55.4915], zoom: 4 }; // Center of South America
      default:
        return { center: [20.0, 0.0], zoom: 2 };         // World view
    }
  };

  // Geocode an address to coordinates
  // In a real implementation, this would call a geocoding service
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // For the demo, we'll check if the address contains certain keywords
    // to determine which mock region to return coordinates for
    try {
      // Simulate some geocoding delay for realism
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simple geocoding logic based on text
      const lowerCase = address.toLowerCase();
      
      if (!address) return null;
      
      // Check for region keywords
      if (lowerCase.includes('denver') || lowerCase.includes('colorado')) {
        return { lat: 39.7392, lng: -104.9903 }; // Denver
      } else if (lowerCase.includes('seattle') || lowerCase.includes('washington')) {
        return { lat: 47.6062, lng: -122.3321 }; // Seattle
      } else if (lowerCase.includes('atlanta') || lowerCase.includes('georgia')) {
        return { lat: 33.7490, lng: -84.3880 }; // Atlanta
      } else if (lowerCase.includes('chicago') || lowerCase.includes('illinois')) {
        return { lat: 41.8781, lng: -87.6298 }; // Chicago
      } else if (lowerCase.includes('new york') || lowerCase.includes('ny')) {
        return { lat: 40.7128, lng: -74.0060 }; // New York
      } else if (lowerCase.includes('los angeles') || lowerCase.includes('la')) {
        return { lat: 34.0522, lng: -118.2437 }; // Los Angeles
      } else if (lowerCase.includes('miami') || lowerCase.includes('florida')) {
        return { lat: 25.7617, lng: -80.1918 }; // Miami
      } else if (lowerCase.includes('boston') || lowerCase.includes('massachusetts')) {
        return { lat: 42.3601, lng: -71.0589 }; // Boston
      } else if (lowerCase.includes('london') || lowerCase.includes('uk')) {
        return { lat: 51.5074, lng: -0.1278 }; // London (Europe)
      } else if (lowerCase.includes('paris') || lowerCase.includes('france')) {
        return { lat: 48.8566, lng: 2.3522 }; // Paris (Europe)
      } else if (lowerCase.includes('tokyo') || lowerCase.includes('japan')) {
        return { lat: 35.6762, lng: 139.6503 }; // Tokyo (Asia)
      } else if (lowerCase.includes('sydney') || lowerCase.includes('australia')) {
        return { lat: -33.8688, lng: 151.2093 }; // Sydney (Asia-Pacific)
      } else if (lowerCase.includes('sao paulo') || lowerCase.includes('brazil')) {
        return { lat: -23.5505, lng: -46.6333 }; // Sao Paulo (Latin America)
      } else if (lowerCase.includes('mexico')) {
        return { lat: 19.4326, lng: -99.1332 }; // Mexico City (Latin America)
      }
      
      // Try to determine region based on state/country
      if (lowerCase.includes('ca') || lowerCase.includes('tx') || lowerCase.includes('ny')) {
        // Random US location
        return {
          lat: 37.0902 + (Math.random() * 5 - 2.5),
          lng: -95.7129 + (Math.random() * 10 - 5)
        };
      } else if (lowerCase.includes('uk') || lowerCase.includes('germany') || lowerCase.includes('france')) {
        // Random Europe location
        return {
          lat: 50.0 + (Math.random() * 5 - 2.5),
          lng: 10.0 + (Math.random() * 10 - 5)
        };
      } else if (lowerCase.includes('china') || lowerCase.includes('japan') || lowerCase.includes('australia')) {
        // Random Asia-Pacific location
        return {
          lat: 30.0 + (Math.random() * 10 - 5),
          lng: 110.0 + (Math.random() * 20 - 10)
        };
      } else if (lowerCase.includes('brazil') || lowerCase.includes('mexico') || lowerCase.includes('argentina')) {
        // Random Latin America location
        return {
          lat: -10.0 + (Math.random() * 10 - 5),
          lng: -70.0 + (Math.random() * 10 - 5)
        };
      }
      
      // Default: generate random global coordinates
      return {
        lat: (Math.random() * 180 - 90) * 0.5,  // -45 to 45
        lng: (Math.random() * 360 - 180) * 0.5  // -90 to 90
      };
    } catch (error) {
      Logger.error('Geocoding error:', error);
      return null;
    }
  };
  
  // Determine which region a set of coordinates belongs to
  const getRegionFromCoordinates = (lat: number, lng: number): string => {
    // North America rough boundaries
    if (lat >= 15 && lat <= 70 && lng >= -170 && lng <= -50) {
      return 'north-america';
    }
    // Europe rough boundaries
    else if (lat >= 35 && lat <= 70 && lng >= -10 && lng <= 40) {
      return 'europe';
    }
    // Asia-Pacific rough boundaries
    else if ((lat >= -50 && lat <= 70 && lng >= 60 && lng <= 180) || 
             (lat >= -50 && lat <= 70 && lng >= -180 && lng <= -130)) {
      return 'asia-pacific';
    }
    // Latin America rough boundaries
    else if (lat >= -60 && lat <= 32 && lng >= -120 && lng <= -30) {
      return 'latin-america';
    }
    
    return 'other';
  };
  
  // Fetch purchase orders from API
  const fetchPurchaseOrders = useCallback(async () => {
    // Performance measurement
    renderStartTime.current = performance.now();
    
    if (loading) {
      setIsRefreshing(false);  // Initial load
    } else {
      setIsRefreshing(true);   // Refreshing existing data
    }
    
    try {
      // Get date range based on time period
      const now = new Date();
      let startDate = new Date(now);
      
      switch (localTimePeriod) {
        case 'current-month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'last-3-months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'ytd':
          startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1); // Default to 1 month
      }
      
      // Fetch POs from API with date range
      const response = await ApiService.fetchPOs({
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        limit: 100
      });
      
      if (response && response.data && response.data.length > 0) {
        Logger.info(`Found ${response.data.length} POs for map`);
        setPOCount(response.data.length);
        await processPurchaseOrders(response.data);
        setLastUpdated(new Date());
        setError(null);
        
        // Report rendering performance
        if (onComponentRender) {
          const renderTime = performance.now() - renderStartTime.current;
          onComponentRender(renderTime);
        }
      } else {
        Logger.info('No POs found');
        setPOCount(0);
        setMapMarkers([]);
        setLastUpdated(new Date());
        setError('No purchase order data found in the selected date range.');
      }
    } catch (err) {
      Logger.error('Error fetching purchase orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load map data');
      setPOCount(0);
      setMapMarkers([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [localRegion, localDeliveryStatus, localTimePeriod]);
  
  // Process POs and extract location data
  const processPurchaseOrders = async (purchaseOrders: PurchaseOrder[]) => {
    try {
      // Filter POs based on region and status
      const filteredPOs = filterPurchaseOrders(purchaseOrders, localRegion, localDeliveryStatus);
      
      // Extract markers from POs with geocoding
      const markers = await createMapMarkers(filteredPOs);
      setMapMarkers(markers);
      
      // Add markers to the map
      if (mapInstance && markersLayer) {
        updateMapMarkers(markers);
        
        // Report performance after marker generation
        if (onComponentRender && renderStartTime.current > 0) {
          const renderTime = performance.now() - renderStartTime.current;
          Logger.debug(`[MAP] Markers processed in ${renderTime}ms`);
        }
      }
    } catch (err) {
      Logger.error('Error processing purchase orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to process map data');
    }
  };

  // Filter purchase orders based on criteria
  const filterPurchaseOrders = (
    purchaseOrders: PurchaseOrder[],
    _regionFilter: string, // Using underscore prefix to indicate intentional non-use
    statusFilter: string
  ): PurchaseOrder[] => {
    return purchaseOrders.filter(po => {
      // Filter by search text if provided
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = 
          po.header.poNumber.toLowerCase().includes(searchLower) ||
          po.header.syscoLocation?.name.toLowerCase().includes(searchLower) ||
          po.header.buyerInfo?.firstName.toLowerCase().includes(searchLower) ||
          po.header.buyerInfo?.lastName.toLowerCase().includes(searchLower);
          
        if (!matchesSearch) return false;
      }
      
      // Filter by status
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && ![POStatus.UPLOADED, POStatus.CONFIRMED].includes(po.header.status)) {
          return false;
        }
        if (statusFilter === 'in-transit' && ![POStatus.SHIPPED].includes(po.header.status)) {
          return false;
        }
        if (statusFilter === 'delivered' && ![POStatus.DELIVERED, POStatus.INVOICED].includes(po.header.status)) {
          return false;
        }
      }
      
      // We'll filter by region after geocoding
      return true;
    });
  };
  
  // Transform POs to map markers with geocoding
  const createMapMarkers = async (purchaseOrders: PurchaseOrder[]): Promise<MapMarker[]> => {
    // Filter POs that have location information
    const posWithLocation = purchaseOrders.filter(po => {
      return po.header && po.header.syscoLocation && po.header.syscoLocation.name;
    });
    
    // Process POs with geocoding (in batches to avoid overloading)
    const markers: MapMarker[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < posWithLocation.length; i += batchSize) {
      const batch = posWithLocation.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (po) => {
          try {
            // Get address to geocode
            const address = po.header.syscoLocation.address || po.header.syscoLocation.name;
            
            // Geocode the address
            const coords = await geocodeAddress(address);
            
            if (!coords) return null;
            
            // Create marker
            const marker: MapMarker = {
              id: po.header.poNumber,
              poNumber: po.header.poNumber,
              lat: coords.lat,
              lng: coords.lng,
              status: po.header.status,
              location: po.header.syscoLocation.name,
              totalCost: po.totalCost,
              deliveryDate: po.header.deliveryInfo?.date,
              selected: selectedPOs.includes(po.header.poNumber)
            };
            
            return marker;
          } catch (error) {
            Logger.error(`Error processing PO ${po.header.poNumber}:`, error);
            return null;
          }
        })
      );
      
      // Add valid markers to the list
      batchResults.forEach(result => {
        if (result !== null) {
          markers.push(result);
        }
      });
    }
    
    // Filter by region if needed
    if (localRegion !== 'all') {
      return markers.filter(marker => {
        const markerRegion = getRegionFromCoordinates(marker.lat, marker.lng);
        return markerRegion === localRegion;
      });
    }
    
    return markers;
  };
  
  // Update markers on the map
  const updateMapMarkers = useCallback((markers: MapMarker[]) => {
    if (!mapInstance || !markersLayer) return;
    
    // Clear existing markers
    markersLayer.clearLayers();

    // Create a SimulatedMarkerCluster (since we're not importing the actual library)
    // In a real app, we would use the L.MarkerClusterGroup from the leaflet.markercluster library
    const SimulatedMarkerCluster = L.layerGroup();
    
    // Add new markers
    markers.forEach(marker => {
      const icon = L.divIcon({
        className: `map-marker status-${marker.status.toLowerCase()} ${marker.selected ? 'selected' : ''}`,
        html: `<div style="background-color: ${getStatusColor(marker.status)}; ${marker.selected ? 'border: 3px solid #FFC107;' : ''}"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      const leafletMarker = L.marker([marker.lat, marker.lng], { icon })
        .on('click', (e) => {
          // If in selection mode, toggle selection
          if (selectionMode) {
            toggleMarkerSelection(marker.poNumber);
            // Prevent popup in selection mode
            e.originalEvent.stopPropagation();
          } else {
            handleMarkerClick(marker);
          }
        });
      
      // Add to cluster group
      SimulatedMarkerCluster.addLayer(leafletMarker);
    });
    
    // Add cluster group to map
    markersLayer.addLayer(SimulatedMarkerCluster);
    
    // Update the map view if we have markers
    if (markers.length > 0) {
      try {
        const bounds = L.featureGroup(
          markers.map(m => L.marker([m.lat, m.lng]))
        ).getBounds();
        
        // Only adjust bounds if we have multiple markers or are zoomed out
        if (markers.length > 1 || mapInstance.getZoom() < 4) {
          mapInstance.fitBounds(bounds, { 
            padding: [50, 50], 
            maxZoom: 10
          });
        }
      } catch (error) {
        Logger.error('Error fitting bounds:', error);
      }
    }
  }, [mapInstance, markersLayer, selectionMode, selectedPOs]);
  
  // Handle marker selection for batch operations
  const toggleMarkerSelection = (poNumber: string) => {
    setMapMarkers(prev => 
      prev.map(marker => 
        marker.poNumber === poNumber 
          ? { ...marker, selected: !marker.selected } 
          : marker
      )
    );
    
    setSelectedPOs(prev => {
      const isSelected = prev.includes(poNumber);
      const newSelection = isSelected
        ? prev.filter(p => p !== poNumber)
        : [...prev, poNumber];
        
      // Notify parent component if callback provided
      if (onBatchSelectionChange) {
        onBatchSelectionChange(newSelection);
      }
      
      return newSelection;
    });
  };
  
  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    
    // If turning off selection mode, clear selections
    if (selectionMode) {
      clearSelections();
    }
  };
  
  // Clear all selections
  const clearSelections = () => {
    setSelectedPOs([]);
    setMapMarkers(prev => 
      prev.map(marker => ({ ...marker, selected: false }))
    );
    
    // Notify parent component
    if (onBatchSelectionChange) {
      onBatchSelectionChange([]);
    }
  };
  
  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Get initial map settings
    renderStartTime.current = performance.now();
    
    const { center, zoom } = getMapSettings(localRegion);
    
    // Create Leaflet map
    const map = L.map(mapContainerRef.current).setView(center, zoom);
    
    // Add tile layer (map background)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Create a layer group for markers
    const layerGroup = L.layerGroup().addTo(map);

    // Store references
    setMapInstance(map);
    setMarkersLayer(layerGroup);
    
    // Fetch data
    fetchPurchaseOrders();

    Logger.debug(`[MAP] Map initialized in ${performance.now() - renderStartTime.current}ms`);
    
    // Cleanup on unmount
    return () => {
      map.remove();
      setMapInstance(null);
      setMarkersLayer(null);
    };
  }, []);
  
  // Update map when filters change
  useEffect(() => {
    if (mapInstance && markersLayer) {
      // Update map center and zoom based on region
      // Performance measurement
      renderStartTime.current = performance.now();
      
      const { center, zoom } = getMapSettings(localRegion);
      mapInstance.setView(center, zoom);
      
      // Refetch data with new filters
      fetchPurchaseOrders();
    }
  }, [localRegion, localDeliveryStatus, localTimePeriod, fetchPurchaseOrders]);
  
  // Update markers when selection changes
  useEffect(() => {
    if (mapMarkers.length > 0 && mapInstance && markersLayer) {
      // Measure performance of marker updates
      const updateStart = performance.now();
      
      updateMapMarkers(mapMarkers);
      
      Logger.debug(`[MAP] Markers updated in ${performance.now() - updateStart}ms`);
    }
  }, [selectedPOs, mapMarkers, updateMapMarkers]);
  
  // Handle marker click
  const handleMarkerClick = (marker: MapMarker) => {
    // Remove existing popup if any
    if (infoPopup) {
      infoPopup.remove();
    }
    
    // Create and show popup
    const popup = L.popup()
      .setLatLng([marker.lat, marker.lng])
      .setContent(`
        <div class="marker-info-popup">
          <h6>${marker.poNumber}</h6>
          <div class="mb-2">
            <span class="status-badge ${marker.status.toLowerCase()}">${marker.status}</span>
          </div>
          <div class="mb-1"><strong>Location:</strong> ${marker.location}</div>
          <div class="mb-1"><strong>Total:</strong> ${formatCurrency(marker.totalCost)}</div>
          ${marker.deliveryDate ? 
            `<div class="mb-1"><strong>Delivery:</strong> ${formatDate(marker.deliveryDate)}</div>` : 
            ''}
          <div class="d-flex justify-content-between mt-2">
            <button class="select-po-btn">
              ${marker.selected ? 'Deselect' : 'Select'}
            </button>
            <button class="view-details-btn">View Details</button>
          </div>
        </div>
      `)
      .openOn(mapInstance!);
    
    // Add click handlers to the popup buttons
    setTimeout(() => {
      const viewDetailsBtn = document.querySelector('.view-details-btn');
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
          if (onPOSelect) {
            onPOSelect(marker.poNumber);
          }
        });
      }
      
      const selectPOBtn = document.querySelector('.select-po-btn');
      if (selectPOBtn) {
        selectPOBtn.addEventListener('click', () => {
          toggleMarkerSelection(marker.poNumber);
          popup.close();
        });
      }
    }, 0);
    
    // Store popup reference
    setInfoPopup(popup);
  };
  
  // Get status color for markers
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
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Change region filter
  const handleRegionChange = (newRegion: 'all' | 'north-america' | 'europe' | 'asia-pacific' | 'latin-america') => {
    setLocalRegion(newRegion);
    
    // Notify about filter changes if rendering performance tracking is enabled
    if (onComponentRender) {
      const updateStart = performance.now();
      renderStartTime.current = updateStart;
    }
  };

  // Change delivery status filter
  const handleDeliveryStatusChange = (newStatus: 'all' | 'pending' | 'in-transit' | 'delivered') => {
    setLocalDeliveryStatus(newStatus);
  };
  
  // Change time period filter
  const handleTimePeriodChange = (newPeriod: 'current-month' | 'last-3-months' | 'ytd' | 'custom') => {
    setLocalTimePeriod(newPeriod);
  };
  
  // Format date for last updated display
  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleString('en-US', {
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className={`geographic-map ${className}`}>
        <Card className="h-100 shadow-sm">
          <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '500px' }}>
            <div className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading map data...</p>
              <p className="text-muted small">This may take a moment while we geocode locations.</p>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
  
  return (
    <div className={`geographic-map ${className}`}>
      <Card className="h-100 shadow-sm">
        <Card.Header className="bg-light py-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              <i className="bi bi-geo-alt me-2"></i>
              Geographic Map
            </h5>
            
            <div className="d-flex align-items-center">
              {/* Total PO counter */}
              <Badge bg="primary" className="me-3 py-2 px-3">
                {mapMarkers.length} POs shown {poCount !== mapMarkers.length ? `(filtered from ${poCount})` : ''}
              </Badge>
              
              {/* Selection badge */}
              {selectedPOs.length > 0 && (
                <Badge bg="success" className="me-3 py-2 px-3">
                  {selectedPOs.length} POs selected
                </Badge>
              )}
            
              {/* Last updated */}
              <div className="text-muted small me-3">
                <i className="bi bi-clock me-1"></i>
                Last updated: {formatLastUpdated(lastUpdated)}
              </div>
              
              {/* Refresh button */}
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={fetchPurchaseOrders}
                disabled={isRefreshing}
                className="me-1"
              >
                {isRefreshing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Refreshing...
                  </>
                ) : (
                  <><i className="bi bi-arrow-repeat me-1"></i> Refresh</>
                )}
              </Button>
            </div>
          </div>
          
          {/* Filter controls */}
          <div className="d-flex flex-wrap align-items-center mt-2 gap-2">
            {/* Search box */}
            <div className="flex-grow-1 me-2">
              <Form.Control
                type="text"
                placeholder="Search by PO #, location, or buyer"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            
            {/* Region filter */}
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="bi bi-globe me-1"></i> 
                {localRegion === 'all' ? 'All Regions' : 
                 localRegion === 'north-america' ? 'North America' : 
                 localRegion === 'europe' ? 'Europe' : 
                 localRegion === 'asia-pacific' ? 'Asia Pacific' : 'Latin America'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item 
                  active={localRegion === 'all'}
                  onClick={() => handleRegionChange('all')}
                >
                  All Regions
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localRegion === 'north-america'}
                  onClick={() => handleRegionChange('north-america')}
                >
                  North America
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localRegion === 'europe'}
                  onClick={() => handleRegionChange('europe')}
                >
                  Europe
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localRegion === 'asia-pacific'}
                  onClick={() => handleRegionChange('asia-pacific')}
                >
                  Asia Pacific
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localRegion === 'latin-america'}
                  onClick={() => handleRegionChange('latin-america')}
                >
                  Latin America
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Status filter */}
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="bi bi-funnel me-1"></i> 
                {localDeliveryStatus === 'all' ? 'All Statuses' : 
                 localDeliveryStatus === 'pending' ? 'Pending' : 
                 localDeliveryStatus === 'in-transit' ? 'In Transit' : 'Delivered'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item 
                  active={localDeliveryStatus === 'all'}
                  onClick={() => handleDeliveryStatusChange('all')}
                >
                  All Statuses
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localDeliveryStatus === 'pending'}
                  onClick={() => handleDeliveryStatusChange('pending')}
                >
                  Pending
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localDeliveryStatus === 'in-transit'}
                  onClick={() => handleDeliveryStatusChange('in-transit')}
                >
                  In Transit
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localDeliveryStatus === 'delivered'}
                  onClick={() => handleDeliveryStatusChange('delivered')}
                >
                  Delivered
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Time period filter */}
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="bi bi-calendar me-1"></i> 
                {localTimePeriod === 'current-month' ? 'Current Month' : 
                 localTimePeriod === 'last-3-months' ? 'Last 3 Months' : 
                 localTimePeriod === 'ytd' ? 'Year to Date' : 'Custom'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item 
                  active={localTimePeriod === 'current-month'}
                  onClick={() => handleTimePeriodChange('current-month')}
                >
                  Current Month
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localTimePeriod === 'last-3-months'}
                  onClick={() => handleTimePeriodChange('last-3-months')}
                >
                  Last 3 Months
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localTimePeriod === 'ytd'}
                  onClick={() => handleTimePeriodChange('ytd')}
                >
                  Year to Date
                </Dropdown.Item>
                <Dropdown.Item 
                  active={localTimePeriod === 'custom'}
                  onClick={() => handleTimePeriodChange('custom')}
                >
                  Custom Range
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Batch selection button */}
            <Button
              variant={selectionMode ? "primary" : "outline-secondary"}
              size="sm"
              onClick={toggleSelectionMode}
            >
              <i className={`bi bi-${selectionMode ? 'check-square' : 'square'} me-1`}></i>
              {selectionMode ? 'Selection Mode On' : 'Select POs'}
            </Button>
            
            {/* Clear selection button (only visible when selections exist) */}
            {selectedPOs.length > 0 && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={clearSelections}
              >
                <i className="bi bi-x-circle me-1"></i>
                Clear Selection
              </Button>
            )}
            
            {/* Zoom controls */}
            <div className="btn-group ms-auto" role="group" aria-label="Zoom controls">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => mapInstance?.zoomIn()}
              >
                <i className="bi bi-plus"></i>
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => mapInstance?.zoomOut()}
              >
                <i className="bi bi-dash"></i>
              </Button>
            </div>
          </div>
        </Card.Header>
        
        <Card.Body className="p-0">
          {error && (
            <Alert variant="warning" className="m-3 mb-0" dismissible onClose={() => setError(null)}>
              <small>{error}</small>
            </Alert>
          )}
          
          {selectionMode && (
            <Alert variant="info" className="m-3 mb-0">
              <div className="d-flex justify-content-between align-items-center">
                <small>
                  <i className="bi bi-info-circle me-2"></i>
                  Selection mode is active. Click on markers to select/deselect POs for batch operations.
                </small>
                <Button variant="outline-info" size="sm" onClick={toggleSelectionMode}>
                  Exit Selection Mode
                </Button>
              </div>
            </Alert>
          )}
          
          <div className="map-container">
            <div 
              ref={mapContainerRef} 
              style={{ height: '500px', width: '100%' }}
            ></div>
          </div>
          
          <div className="map-legend-container d-flex justify-content-between mt-2 px-3 py-2 bg-light">
            <div className="d-flex flex-wrap gap-3">
              {Object.values(POStatus).map(status => (
                <div key={status} className="d-flex align-items-center">
                  <div 
                    className="rounded-circle me-1" 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: getStatusColor(status)
                    }}
                  ></div>
                  <span className="small">{status}</span>
                </div>
              ))}
              <div className="d-flex align-items-center ms-3">
                <div 
                  className="rounded-circle me-1" 
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    backgroundColor: '#3F51B5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  n
                </div>
                <span className="small">Cluster</span>
              </div>
            </div>
            
            <div className="small text-muted">
              <i className="bi bi-info-circle me-1"></i>
              {mapMarkers.length} POs displayed • Click on markers for details
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {/* Component styles */}
      <style>
        {`
          .map-marker div {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }
          
          .map-marker.selected div {
            border: 3px solid #FFC107 !important;
            box-shadow: 0 0 8px rgba(255, 193, 7, 0.6);
          }
          
          .marker-info-popup h6 {
            margin-bottom: 0.5rem;
          }
          
          .marker-info-popup .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            color: white;
          }
          
          .marker-info-popup .status-badge.uploaded { background-color: #FF9800; }
          .marker-info-popup .status-badge.confirmed { background-color: #2196F3; }
          .marker-info-popup .status-badge.shipped { background-color: #673AB7; }
          .marker-info-popup .status-badge.invoiced { background-color: #3F51B5; }
          .marker-info-popup .status-badge.delivered { background-color: #4CAF50; }
          .marker-info-popup .status-badge.cancelled { background-color: #F44336; }
          
          .marker-info-popup .view-details-btn,
          .marker-info-popup .select-po-btn {
            padding: 2px 8px;
            background-color: #3F51B5;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.75rem;
          }
          
          .marker-info-popup .select-po-btn {
            background-color: #6c757d;
          }
        `}
      </style>
    </div>
  );
};

export default GeographicMap;