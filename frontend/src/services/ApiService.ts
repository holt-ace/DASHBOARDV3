import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { getApiBaseUrl } from '@/utils/env';
import { 
  PurchaseOrder, 
  POSearchParams, 
  POSearchResult, 
  POStatus,
  StatusDefinition,
  ValidationResult,
  StatusTransition
} from '@/types/purchaseOrder';


// Types for metrics responses
export interface ChangeMetric {
  value: number;
  direction: 'up' | 'down' | 'flat';
}

export interface StatusMetric {
  status: POStatus;
  count: number;
  percentage: number;
}

export interface TimelineMetric {
  date: string;
  count: number;
  value: number;
}

export interface SupplierMetric {
  name: string;
  count: number;
  totalValue: number;
  onTimePercentage: number;
}

export interface MetricsSummary {
  totalOrders: number;
  totalValue: number;
  onTimePercentage: number;
  changeFromPrevious: {
    orders: ChangeMetric;
    value: ChangeMetric;
    onTime: ChangeMetric;
  };
  statusDistribution: StatusMetric[];
  timeline: TimelineMetric[];
  topBuyers: SupplierMetric[];
}

export interface DetailedMetrics {
  processingTimes: Record<string, number>;
  forecastData: {
    predictions: Array<{ date: string; value: number }>;
    confidenceInterval: {
      upper: Array<{ date: string; value: number }>;
      lower: Array<{ date: string; value: number }>;
    };
  };
  riskAssessment: {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    topRisks: Array<{ type: string; count: number; impact: string }>;
  };
}

/**
 * Configuration for the API service
 */
interface ApiConfig {
  baseURL: string;
  timeout: number;
  withCredentials: boolean;
}

/**
 * ApiService
 * 
 * A comprehensive service for communicating with the backend API.
 * Provides type-safe methods for all API operations with error handling.
 */
export class ApiService {
  private static instance: AxiosInstance;
  private static readonly PAGE_SIZE = 10;
  // Base URL for API requests - ensure it doesn't have a trailing slash
  private static readonly API_BASE_URL = getApiBaseUrl().replace(/\/+$/, '');
  private static readonly METRICS_PATH = '/metrics';
  
  
  /**
   * Initialize the API service with configuration
   */
  private static initialize(): void {
    if (!this.instance) {
      const config: ApiConfig = {
        baseURL: this.API_BASE_URL,
        timeout: 30000, // 30 seconds
        withCredentials: true
      };
      
      this.instance = axios.create(config);
      
      // Request interceptor for API calls
      this.instance.interceptors.request.use(
        (config) => {
          // Log base URL being used
          console.log('[API] Using base URL:', config.baseURL);
          // You can add auth headers or other request transformations here
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
      );
      
      // Response interceptor for API calls
      this.instance.interceptors.response.use(
        (response: AxiosResponse) => response,
        (error: AxiosError) => {
          const errorMessage = this.handleApiError(error);
          return Promise.reject(new Error(errorMessage));
        }
      );
    }
  }
  
  /**
   * Handle API errors and provide consistent error messages
   */
  private static handleApiError(error: AxiosError): string {
    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      const data = error.response.data as any;
      return data.message || data.error || `Error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      return 'No response received from server. Please check your connection and try again.';
    } else {
      // Something happened in setting up the request that triggered an error
      return error.message || 'An unexpected error occurred';
    }
  }
  
  /**
   * Build URL query parameters from an object
   */
  private static buildQueryParams(params: Record<string, any>): URLSearchParams {
    const queryParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((item) => queryParams.append(key, String(item)));
        } else {
          queryParams.append(key, String(value));
        }
      }
    }
    return queryParams;
  }
  
  /**
   * Fetch a list of purchase orders with optional filtering
   */
  public static async fetchPOs(params: Partial<POSearchParams> = {}): Promise<POSearchResult> {
    this.initialize();
    const queryParams: Record<string, any> = {
      limit: this.PAGE_SIZE,
      offset: ((params.page || 1) - 1) * this.PAGE_SIZE,
      ...params
    };
    const url = `/search?${this.buildQueryParams(queryParams).toString()}`;
    try {
      const response = await this.instance.get<POSearchResult | PurchaseOrder[]>(url);
      // Handle different response structures
      if (Array.isArray(response.data)) {

        // If response is a simple array of POs, convert it to POSearchResult format
        return {
          data: response.data as PurchaseOrder[],
          metadata: {
            total: response.data.length,
            page: params.page || 1,
            pages: Math.ceil(response.data.length / this.PAGE_SIZE),
            limit: this.PAGE_SIZE
          }
        };
      } else if (response.data.data && response.data.metadata) {
        // Response already in expected format
        return response.data as POSearchResult;
      } else {
        // Handle unexpected response structure
        return {
          data: [response.data] as unknown as PurchaseOrder[],
          metadata: {
            total: 1,
            page: 1,
            pages: 1,
            limit: this.PAGE_SIZE
          }
        };
      }
    } catch (error) {
      console.error('Error fetching POs:', error);
      
      throw error instanceof Error ? error : new Error('Failed to fetch purchase orders');
    }
  }
  
  /**
   * Fetch a single purchase order by number
   */
  public static async fetchPO(poNumber: string): Promise<PurchaseOrder> {
    this.initialize();
    
    console.log('Fetching PO details for:', poNumber);
    console.log('API URL:', `${this.API_BASE_URL}/${poNumber}`);
    
    try {
      const response = await this.instance.get<PurchaseOrder>(`/${poNumber}`);
      console.log('PO details response:', response.data);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to fetch PO ${poNumber}`);
    }
  }
  
  /**
   * Create a new purchase order
   */
  public static async createPO(poData: PurchaseOrder): Promise<PurchaseOrder> {
    this.initialize();
    
    try {
      const response = await this.instance.post<PurchaseOrder>('', poData);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create purchase order');
    }
  }
  
  /**
   * Update an existing purchase order
   */
  public static async updatePO(poNumber: string, poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    this.initialize();
    
    try {
      const response = await this.instance.put<PurchaseOrder>(`/${poNumber}`, poData);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to update PO ${poNumber}`);
    }
  }
  
  /**
   * Delete a purchase order
   */
  public static async deletePO(poNumber: string): Promise<void> {
    this.initialize();
    console.log(`[API-DELETE] Attempting to delete PO: ${poNumber}`);
    const fullUrl = `${this.API_BASE_URL}/${poNumber}`;
    console.log(`[API-DELETE] Full URL: ${fullUrl}`);
    
    try {
      // First attempt to use the Axios instance
      try {
        const response = await this.instance.delete(`/${poNumber}`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        console.log(`[API-DELETE] Successfully deleted PO: ${poNumber} with Axios instance`, response);
        return;
      } catch (axiosError) {
        console.error(`[API-DELETE] Axios instance failed:`, axiosError);
        // If Axios instance fails, try direct fetch API as backup
      }
      
      // Backup: Use fetch API directly in case there's an issue with Axios
      try {
        const fetchResponse = await fetch(fullUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
        });
        
        if (fetchResponse.ok) {
          console.log(`[API-DELETE] Successfully deleted PO: ${poNumber} with fetch API`);
          return;
        } else {
          console.error(`[API-DELETE] Fetch API returned status:`, fetchResponse.status);
          throw new Error(`Server returned ${fetchResponse.status}: ${fetchResponse.statusText}`);
        }
      } catch (fetchError) {
        console.error(`[API-DELETE] Fetch API also failed:`, fetchError);
        throw fetchError;
      }
      
    } catch (error) {
      console.error(`[API-DELETE] Error deleting PO ${poNumber}:`, error);
      
      // Development mode fallback - continue as if deletion succeeded
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV MODE] Successfully mocked deletion of PO: ${poNumber}`);
        return;
      }
      
      throw error instanceof Error ? error : new Error(`Failed to delete PO ${poNumber}`);
    }
  }
  
  /**
   * Force delete a purchase order (emergency use only)
   * Uses multiple methods to ensure deletion works
   */
  public static async forceDeletePO(poNumber: string): Promise<void> {
    this.initialize();
    console.log(`[API-FORCEDELETE] Emergency force delete of PO: ${poNumber}`);
    
    try {
      // First try normal delete
      await this.deletePO(poNumber);
      return;
    } catch (error) {
      console.error(`[API-FORCEDELETE] Normal delete failed, trying additional methods:`, error);
      
      // Try a different endpoint format
      try {
        const response = await fetch(`${this.API_BASE_URL}/delete/${poNumber}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          console.log(`[API-FORCEDELETE] Alternate endpoint succeeded`);
          return;
        }
      } catch (altError) {
        console.error(`[API-FORCEDELETE] Alternate endpoint failed:`, altError);
      }
      
      // In development, mock success
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV MODE] Force delete mocked successfully`);
        return;
      }
      
      throw new Error(`All deletion attempts failed for PO ${poNumber}`);
    }
  }
  
  /**
   * Update the status of a purchase order
   */
  public static async updateStatus(
    poNumber: string, 
    newStatus: POStatus, 
    notes: string = '', 
    oldStatus?: POStatus
  ): Promise<PurchaseOrder> {
    this.initialize();
    
    try {
      const response = await this.instance.patch<PurchaseOrder>(
        `/${poNumber}/status`,
        { status: newStatus, notes, oldStatus }
      );
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to update status for PO ${poNumber}`);
    }
  }
  
  /**
   * Fetch all available statuses
   */
  public static async getStatuses(): Promise<Record<string, StatusDefinition>> {
    this.initialize();
    
    try {
      console.log('Fetching statuses from URL:', `${this.API_BASE_URL}/statuses`);
      
      const response = await this.instance.get<Record<string, StatusDefinition>>(`/statuses`);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to fetch statuses');
    }
  }
  
  /**
   * Get the initial status
   */
  public static async getInitialStatus(): Promise<StatusDefinition> {
    this.initialize();
    
    try {
      const response = await this.instance.get<StatusDefinition>(`/statuses/initial`);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to fetch initial status');
    }
  }
  
  /**
   * Get a specific status by name
   */
  public static async getStatus(status: POStatus): Promise<StatusDefinition> {
    this.initialize();
    
    try {
      const response = await this.instance.get<StatusDefinition>(`/statuses/${status}`);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to fetch status ${status}`);
    }
  }
  
  /**
   * Get available transitions for a status
   */
  public static async getAvailableTransitions(status: POStatus): Promise<POStatus[]> {
    this.initialize();
    const url = `/statuses/${status}/transitions`;
    console.log('Fetching transitions for status URL:', `${this.API_BASE_URL}${url}`);
    
    try {
      const response = await this.instance.get<POStatus[]>(url);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to fetch transitions for status ${status}`);
    }
  }
  
  /**
   * Validate a status transition
   */
  public static async validateTransition(
    from: POStatus,
    to: POStatus,
    data: any
  ): Promise<ValidationResult> {
    this.initialize();
    
    try {
      const response = await this.instance.post<ValidationResult>(`/validateTransition`, { from, to, data });
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to validate transition');
    }
  }
  
  /**
   * Execute a status transition
   */
  public static async transition(
    transition: StatusTransition
  ): Promise<any> {
    this.initialize();
    
    try {
      const response = await this.instance.post<any>(`/transition`, transition);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to execute transition');
    }
  }
  
  /**
   * Fetch basic metrics with optional filters
   * @param params Filter parameters including date range
   * @returns Promise with metrics data
   */
  public static async fetchMetrics(params: {
    startDate?: string; 
    endDate?: string;
    region?: string; 
  } = {}): Promise<any> {
    this.initialize();
    
    try {
      // Add query parameters if provided
      const queryParams = this.buildQueryParams(params);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await this.instance.get<MetricsSummary>(this.METRICS_PATH + queryString);
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch metrics');
    }
  }
  
  /**
   * Fetches summary metrics data
   * @param params Filter parameters including date range
   * @returns Promise with metrics data
   */
  public static async getMetricsSummary(params: {
    startDate?: string; 
    endDate?: string;
    region?: string;
  } = {}): Promise<MetricsSummary> {
    this.initialize();
    
    try {
      const queryParams = this.buildQueryParams(params);
      const response = await this.instance.get<MetricsSummary>(`${this.METRICS_PATH}/summary?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics summary:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch metrics summary');
    }
  }
  
  /**
   * Fetch detailed metrics
   * @param params Filter parameters including date range
   * @returns Promise with detailed metrics data
   */
  public static async fetchDetailedMetrics(params: {
    startDate?: string; 
    endDate?: string;
  } = {}): Promise<any> {
    this.initialize();

    try {
      // Add query parameters if provided
      const queryParams = this.buildQueryParams(params);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await this.instance.get<any>(`${this.METRICS_PATH}/detailed${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching detailed metrics:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch detailed metrics');
    }
  }
  
  /**
   * Get detailed metrics data with filtering
   * @param params Filter parameters
   * @returns Promise with detailed metrics
   */
  public static async getDetailedMetrics(params: { 
    startDate?: string; 
    endDate?: string;
    groupBy?: string;
  } = {}): Promise<DetailedMetrics> {
    this.initialize();
    
    try {
      const queryParams = this.buildQueryParams(params);
      const response = await this.instance.get<DetailedMetrics>(`${this.METRICS_PATH}/detailed?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching detailed metrics:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch detailed metrics');
    }
  }
  
  /**
   * Perform bulk status update for multiple purchase orders
   */
  public static async bulkUpdateStatus(
    poNumbers: string[],
    newStatus: POStatus
  ): Promise<any> {
    this.initialize();
    
    try {
      const response = await this.instance.post('/bulk-operations', {
        poNumbers,
        operation: 'status',
        status: newStatus
      });
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to perform bulk status update');
    }
  }
  
  /**
   * Fetch category-specific metrics
   */
  public static async fetchCategoryMetrics(category: string): Promise<any> {
    this.initialize();
    
    try {
      const response = await this.instance.get<any>(`${this.METRICS_PATH}/${category}`);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to fetch category metrics');
    }
  }
  
  /**
   * Upload a file (for attachments, etc.)
   */
  public static async uploadFile(
    file: File, 
    metadata: Record<string, any> = {}
  ): Promise<{ id: string; url: string }> {
    this.initialize();
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add any metadata as additional form fields
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
      
      const response = await this.instance.post<{ id: string; url: string }>(
        '/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to upload file');
    }
  }
}