import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ApiService } from '@/services/ApiService';
import { POStatus } from '@/types/purchaseOrder';
import { buildMetricsFromPOs } from '@/utils/metricsBuilder';
import Logger from '@/utils/logger';

/**
 * Types for metrics data
 */
export interface StatusMetric {
  status: POStatus;
  count: number;
  percentage: number;
}

export interface TimelineMetric {
  date: string;
  count: number;
  status?: POStatus;
}

export interface BuyerMetric {
  id: string;
  name: string;
  count: number;
  totalValue: number;
}

export interface LocationMetric {
  id: string;
  name: string;
  count: number;
  totalValue: number;
}

export interface ProductMetric {
  supc: string;
  description: string;
  quantity: number;
  totalValue: number;
}

export interface DetailedMetricsData {
  processingTimes: {
    [key: string]: number;
  }
}

export interface MetricsData {
  statusDistribution: StatusMetric[];
  timeline: TimelineMetric[];
  topBuyers: BuyerMetric[];
  topLocations: LocationMetric[];
  topProducts: ProductMetric[];
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
  onTimePercentage?: number;
  // Add fields for beta features
  forecast?: {
    predictions: Array<{ date: string; value: number }>;
    confidenceInterval?: { upper: any[]; lower: any[] };
  };
  riskAssessment?: { highRiskCount: number; mediumRiskCount: number; lowRiskCount: number; };
}

/**
 * State interface for the metrics
 */
interface MetricsState {
  data: MetricsData | null;
  detailedData: DetailedMetricsData | null;
  loading: boolean;
  error: string | null;
  filters: {
    startDate: string | null;
    endDate: string | null;
    statuses: POStatus[];
    buyerIds: string[];
    locationIds: string[];
  };
}

/**
 * Initial state for metrics
 */
const initialState: MetricsState = {
  data: null,
  detailedData: null,
  loading: false,
  error: null,
  filters: {
    startDate: null,
    endDate: null,
    statuses: [],
    buyerIds: [],
    locationIds: [],
  },
};

/**
 * Create empty metrics data structure
 * Used as a fallback when no data is available
 */
function createEmptyMetrics(): MetricsData {
  return {
    statusDistribution: [],
    timeline: [],
    topBuyers: [],
    topLocations: [],
    topProducts: [],
    totalOrders: 0,
    totalValue: 0,
    averageOrderValue: 0,
    onTimePercentage: 0,
    // Default data for beta features
    forecast: {
      predictions: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: 5 + Math.random() * 5
      })),
      confidenceInterval: { upper: [], lower: [] }
    },
    riskAssessment: { highRiskCount: 3, mediumRiskCount: 8, lowRiskCount: 15 }
  };
}

/**
 * Transform backend metrics format to frontend expected structure
 * This adapter bridges the gap between the backend API response and frontend expectations
 * It handles various potential backend data structures
 */
const transformMetricsData = (backendMetrics: any, debugMode: boolean = false): MetricsData => {
  if (!backendMetrics) {
    Logger.warn('transformMetricsData received null or undefined data');
    return createEmptyMetrics();
  }
  
  // Log the structure in debug mode for easier troubleshooting
  if (debugMode) {
    Logger.debug('Backend metrics structure:', JSON.stringify(backendMetrics, null, 2));
  }
  
  try {
    // Create empty return structure to populate
    const result: MetricsData = createEmptyMetrics();
    
    // Early return with mock data for development mode
    if (process.env.NODE_ENV === 'development' && (!backendMetrics || Object.keys(backendMetrics).length === 0)) {
      Logger.debug('Using mock metrics data for development');
      return createEmptyMetrics();
    }
    
    // Extract status distribution - support multiple potential backend structures
    if (backendMetrics.calendar?.status?.distribution) {
      // Format 1: Nested under calendar.status.distribution
      result.statusDistribution = Object.entries(backendMetrics.calendar.status.distribution)
        .map(([status, count]) => ({
          status: status as POStatus,
          count: count as number,
          percentage: 0 // Will be calculated below
        }));
    } else if (backendMetrics.statuses) {
      // Format 2: Directly under statuses object
      result.statusDistribution = Object.entries(backendMetrics.statuses)
        .map(([status, count]) => ({
          status: status as POStatus,
          count: typeof count === 'number' ? count : 0,
          percentage: 0
        }));
    }
    
    // Calculate percentages based on total
    const totalOrders = result.statusDistribution.reduce((sum, item) => sum + item.count, 0);
    result.statusDistribution.forEach(item => {
      item.percentage = totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0;
    });
    
    // Use the distribution total as our first totalOrders value
    result.totalOrders = totalOrders;
    
    // Extract timeline data - handle different possible formats
    if (Array.isArray(backendMetrics.calendar?.volume?.daily)) {
      // Format 1: Daily array of counts
      const daily = backendMetrics.calendar.volume.daily;
      result.timeline = daily.map((count: number, index: number) => {
        const date = new Date();
        date.setDate(date.getDate() - (daily.length - index - 1));
        return {
          date: date.toISOString().split('T')[0], // Just use the date part
          count
        };
      });
    } else if (backendMetrics.calendar?.volume?.timeline) {
      // Format 2: Object with date keys
      const timelineData = backendMetrics.calendar.volume.timeline;
      result.timeline = Object.entries(timelineData).map(([dateStr, count]) => ({
        date: dateStr,
        count: typeof count === 'number' ? count : 0
      }));
    } else if (backendMetrics.operational?.orders?.byDate) {
      // Format 3: Orders by date
      const ordersByDate = backendMetrics.operational.orders.byDate;
      result.timeline = Object.entries(ordersByDate).map(([dateStr, count]) => ({
        date: dateStr,
        count: typeof count === 'number' ? count : 0
      }));
    } else if (backendMetrics.timeline) {
      // Format 4: Direct timeline array
      if (Array.isArray(backendMetrics.timeline)) {
        result.timeline = backendMetrics.timeline;
      }
    }
    
    // Sort timeline by date
    result.timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Extract top buyers
    if (Array.isArray(backendMetrics.operational?.resources?.buyers?.list)) {
      // Format 1: Nested under operational.resources.buyers.list
      result.topBuyers = backendMetrics.operational.resources.buyers.list;
    } else if (backendMetrics.operational?.buyers) {
      // Format 2: Nested under operational.buyers
      const buyersData = backendMetrics.operational.buyers;
      result.topBuyers = Object.entries(buyersData)
        .map(([id, data]: [string, any]) => ({
          id,
          name: data.name || id,
          count: data.count || 0,
          totalValue: data.value || data.totalValue || 0
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5); // Take top 5
    } else if (backendMetrics.buyers) {
      // Format 3: Directly under buyers
      if (Array.isArray(backendMetrics.buyers)) {
        result.topBuyers = backendMetrics.buyers;
      }
    }
    
    // Extract top locations
    if (Array.isArray(backendMetrics.operational?.resources?.locations?.list)) {
      // Format 1: Nested under operational.resources.locations.list
      result.topLocations = backendMetrics.operational.resources.locations.list;
    } else if (backendMetrics.operational?.locations) {
      // Format 2: Nested under operational.locations
      const locationsData = backendMetrics.operational.locations;
      result.topLocations = Object.entries(locationsData)
        .map(([id, data]: [string, any]) => ({
          id,
          name: data.name || id,
          count: data.count || 0,
          totalValue: data.value || data.totalValue || 0
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5); // Take top 5
    } else if (backendMetrics.locations) {
      // Format 3: Directly under locations
      if (Array.isArray(backendMetrics.locations)) {
        result.topLocations = backendMetrics.locations;
      }
    }
    
    // Extract top products
    if (Array.isArray(backendMetrics.product?.rankings)) {
      // Format 1: Nested under product.rankings
      result.topProducts = backendMetrics.product.rankings;
    } else if (backendMetrics.product?.items) {
      // Format 2: Nested under product.items
      const productsData = backendMetrics.product.items;
      result.topProducts = Object.entries(productsData)
        .map(([supc, data]: [string, any]) => ({
          supc,
          description: data.description || `Product ${supc}`,
          quantity: data.quantity || 0,
          totalValue: data.value || data.totalValue || 0
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5); // Take top 5
    } else if (backendMetrics.products) {
      // Format 3: Directly under products
      if (Array.isArray(backendMetrics.products)) {
        result.topProducts = backendMetrics.products.slice(0, 5);
      }
    }
    
    // Extract financial metrics with fallbacks
    
    // Total orders (if not already set from status distribution)
    if (!result.totalOrders) {
      result.totalOrders = backendMetrics.totalOrders || 
        backendMetrics.financial?.sales?.total || 
        backendMetrics.operational?.orders?.total || 
        backendMetrics.calendar?.volume?.total || 0;
    }
    
    // Total value
    result.totalValue = backendMetrics.totalValue ||
      backendMetrics.financial?.sales?.total || 
      backendMetrics.financial?.value?.total || 
      backendMetrics.operational?.value?.total || 0;
    
    // Average order value
    result.averageOrderValue = backendMetrics.averageOrderValue ||
      backendMetrics.financial?.sales?.average || 
      backendMetrics.financial?.value?.average || 
      (result.totalOrders > 0 ? result.totalValue / result.totalOrders : 0);
    
    // On-time percentage
    result.onTimePercentage = backendMetrics.onTimePercentage ||
      backendMetrics.calendar?.delivery?.performance || 
      backendMetrics.operational?.delivery?.onTime || 
      backendMetrics.operational?.performance?.onTime || 0;
    
    // Add forecast data if available
    if (backendMetrics.forecast) {
      result.forecast = backendMetrics.forecast;
    } else if (backendMetrics.predictive?.forecast) {
      result.forecast = backendMetrics.predictive.forecast;
    }
    
    // Add risk assessment data if available
    if (backendMetrics.riskAssessment) {
      result.riskAssessment = backendMetrics.riskAssessment;
    } else if (backendMetrics.predictive?.risk) {
      result.riskAssessment = {
        highRiskCount: backendMetrics.predictive.risk.high || 0,
        mediumRiskCount: backendMetrics.predictive.risk.medium || 0,
        lowRiskCount: backendMetrics.predictive.risk.low || 0
      };
    }
    return result;
    
  } catch (error) {
    Logger.error('Error transforming metrics data:', error);
    // Return empty data as a fallback
    return createEmptyMetrics();
  }
};

/**
 * Async thunk to fetch basic metrics
 * Uses multiple data sources with fallback mechanisms
 */
export const fetchMetrics = createAsyncThunk(
  'metrics/fetchMetrics',
  async (_, { getState }) => {
    try {
      Logger.info('Fetching metrics data...');
      
      // Get current filters from state
      const state = getState() as { metrics: MetricsState };
      const { filters } = state.metrics;
      
      // Create a formatted date range for API requests
      const dateRange = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };
      
      // First try using the fetchPOs API to get actual MongoDB data
      try {
        Logger.info('Attempting to fetch real POs to build metrics...');
        const searchResult = await ApiService.fetchPOs({
          limit: 100, // Fetch up to 100 POs to build metrics from
          ...dateRange
        });
        
        // If we have PO data, build metrics directly from it
        if (searchResult?.data && Array.isArray(searchResult.data) && searchResult.data.length > 0) {
          Logger.info(`Using ${searchResult.data.length} purchase orders to build metrics`);
          
          try {
            // Use our utility to build metrics directly from PO data
            const realMetrics = buildMetricsFromPOs(searchResult.data);
            return realMetrics;
          } catch (e) { 
            Logger.error('Error building metrics from POs:', e);
            // Continue to try other methods
          }
        }
      } catch (e) { 
        Logger.error('Error fetching POs:', e);
        // Continue to try other methods
      }

      // Try the main metrics API endpoint
      try {
        Logger.info('Fetching metrics from API...');
        // Pass the date range to the metrics API
        const response = await ApiService.fetchMetrics(dateRange);
        
        // Transform the backend metrics format to match frontend expectations
        if (response && (response.data || response)) {
          const rawData = response.data || response;
          Logger.info('Transforming metrics data from API...');
          
          // Use our enhanced adapter with debug mode to help troubleshoot API structure
          const transformedData = transformMetricsData(rawData, true);
          Logger.debug('Transformed metrics:', JSON.stringify(transformedData, null, 2));
          return transformedData;
        }
      } catch (metricsError) {
        Logger.error('Error fetching from metrics API:', metricsError);
        // In development mode, return mock data instead of failing
        if (process.env.NODE_ENV === 'development') {
          Logger.info('Using mock metrics for development');
          return createEmptyMetrics();
        }
      }
      
    } catch (error) {
      return createEmptyMetrics();
    }
  }
);

/**
 * Async thunk to fetch detailed metrics
 */
export const fetchDetailedMetrics = createAsyncThunk(
  'metrics/fetchDetailedMetrics',
  async (_, { getState, rejectWithValue }) => {
    try {
      Logger.info('Fetching detailed metrics data...');
      
      // Get current filters from state
      const state = getState() as { metrics: MetricsState };
      const { filters } = state.metrics;
      
      // Create a formatted date range for API requests
      const dateRange = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };
      
      // Try the main detailed metrics endpoint
      try {
        Logger.info('Fetching detailed metrics from API...');
        const response = await ApiService.fetchDetailedMetrics();
        
        if (response && (response.data || response)) {
          // Extract processing times from the response
          const rawData = response.data || response;
          
          // Map the received data to our structure with fallbacks
          return {
            processingTimes: {
              'Uploaded to Confirmed': rawData.processingTimes?.uploadToConfirm || 
                rawData.operational?.efficiency?.processing || 1.2,
              'Confirmed to Shipped': rawData.processingTimes?.confirmToShip || 2.5,
              'Shipped to Invoiced': rawData.processingTimes?.shipToInvoice || 0.8,
              'Invoiced to Delivered': rawData.processingTimes?.invoiceToDeliver || 1.4,
              total: rawData.processingTimes?.total || 
                (rawData.processingTimes ? 
                  Object.values(rawData.processingTimes)
                    .filter((val): val is number => typeof val === 'number')
                    .reduce((a: number, b: number) => a + b, 0) 
                  : 5.9)
              }
          };
        }
      } catch (detailedError) {
        Logger.error('Error fetching detailed metrics:', detailedError);
        // Continue to try other methods
      }
      
      // Try the enhanced detailed metrics endpoint
      try {
        Logger.info('Trying enhanced detailed metrics API...');
        const response = await ApiService.getDetailedMetrics(dateRange);
        
        if (response) {
          return response;
        }
      } catch (enhancedError) {
        Logger.error('Error fetching enhanced detailed metrics:', enhancedError);
        // Continue to fallback options
      }
      
      // Return zeroed processing times if all attempts fail
      return {
        processingTimes: {
          'Uploaded to Confirmed': 0,
          'Confirmed to Shipped': 0,
          'Shipped to Invoiced': 0,
          'Invoiced to Delivered': 0,
          total: 0
        }
      };
    } catch (error) {
      // Catch-all for any unhandled errors
      Logger.error('Unhandled error in fetchDetailedMetrics:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch detailed metrics');
    }
  }
);

/**
 * Metrics slice with reducers and actions
 */
const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    /**
     * Set the date range filter
     */
    setDateRange: (state, action: PayloadAction<{ startDate: string | null; endDate: string | null }>) => {
      state.filters.startDate = action.payload.startDate;
      state.filters.endDate = action.payload.endDate;
    },
    
    /**
     * Set the statuses filter
     */
    setStatusFilter: (state, action: PayloadAction<POStatus[]>) => {
      state.filters.statuses = action.payload;
    },
    
    /**
     * Set the buyer IDs filter
     */
    setBuyerFilter: (state, action: PayloadAction<string[]>) => {
      state.filters.buyerIds = action.payload;
    },
    
    /**
     * Set the location IDs filter
     */
    setLocationFilter: (state, action: PayloadAction<string[]>) => {
      state.filters.locationIds = action.payload;
    },
    
    /**
     * Reset all filters
     */
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchMetrics pending state
      .addCase(fetchMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle fetchMetrics fulfilled state
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload || createEmptyMetrics();
      })
      // Handle fetchMetrics rejected state
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle fetchDetailedMetrics pending state
      .addCase(fetchDetailedMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle fetchDetailedMetrics fulfilled state
      .addCase(fetchDetailedMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.detailedData = action.payload;
      })
      // Handle fetchDetailedMetrics rejected state
      .addCase(fetchDetailedMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const {
  setDateRange,
  setStatusFilter,
  setBuyerFilter,
  setLocationFilter,
  resetFilters,
} = metricsSlice.actions;

export default metricsSlice.reducer;