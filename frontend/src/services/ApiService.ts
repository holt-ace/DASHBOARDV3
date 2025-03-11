import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
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
  // Base URL for API requests
  private static readonly API_BASE_URL = process.env.VITE_API_URL || (process.env.NODE_ENV === 'production'
    ? '/api/po'
    : 'http://localhost:8080/api/po');
  
  
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
          value.forEach(item => queryParams.append(key, String(item)));
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
      throw error instanceof Error ? error : new Error('Failed to fetch purchase orders');
    }
  }
  
  /**
   * Fetch a single purchase order by number
   */
  public static async fetchPO(poNumber: string): Promise<PurchaseOrder> {
    this.initialize();
    
    try {
      const response = await this.instance.get<PurchaseOrder>(`/${poNumber}`);
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
    
    try {
      await this.instance.delete(`/${poNumber}`);
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to delete PO ${poNumber}`);
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
      const response = await this.instance.get<Record<string, StatusDefinition>>('/statuses');
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
      const response = await this.instance.get<StatusDefinition>('/statuses/initial');
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
    
    try {
      const response = await this.instance.get<POStatus[]>(`/statuses/${status}/transitions`);
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
      const response = await this.instance.post<ValidationResult>('/validateTransition', { from, to, data });
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
      const response = await this.instance.post<any>('/transition', transition);
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
    
    // Store the current base URL to restore it later
    const originalBaseURL = this.instance.defaults.baseURL;
    
    try {
      // Temporarily modify the baseURL to point to the correct endpoint structure
      // This ensures we're using /api/po/metrics instead of trying to fetch a PO with ID "metrics"
      if (originalBaseURL) {
        this.instance.defaults.baseURL = originalBaseURL.toString().replace(/\/+$/, '');
      }

      // Add query parameters if provided
      const queryParams = this.buildQueryParams(params);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await this.instance.get<MetricsSummary>(`/metrics${queryString}`);

      // Restore the original baseURL
      this.instance.defaults.baseURL = originalBaseURL;

      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      
      // Restore the original baseURL in case of error
      this.instance.defaults.baseURL = originalBaseURL;
      
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
    
    // Store the current base URL to restore it later
    const originalBaseURL = this.instance.defaults.baseURL;
    
    try {
      // Temporarily modify the baseURL
      if (originalBaseURL) {
        this.instance.defaults.baseURL = originalBaseURL.toString().replace(/\/+$/, '');
      }
      
      const queryParams = this.buildQueryParams(params);
      const response = await this.instance.get<MetricsSummary>(`/metrics/summary?${queryParams.toString()}`);
      
      // Restore the original baseURL
      this.instance.defaults.baseURL = originalBaseURL;
      
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics summary:', error);
      
      // Restore the original baseURL in case of error
      this.instance.defaults.baseURL = originalBaseURL;
      
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

    // Store the current base URL to restore it later
    const originalBaseURL = this.instance.defaults.baseURL;
    
    try {
      // Temporarily modify the baseURL
      if (originalBaseURL) {
        this.instance.defaults.baseURL = originalBaseURL.toString().replace(/\/+$/, '');
      }

      // Add query parameters if provided
      const queryParams = this.buildQueryParams(params);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await this.instance.get<any>(`/metrics/detailed${queryString}`);

      // Restore the original baseURL
      this.instance.defaults.baseURL = originalBaseURL;

      return response.data;
    } catch (error) {
      console.error('Error fetching detailed metrics:', error);
      
      // Restore the original baseURL in case of error
      this.instance.defaults.baseURL = originalBaseURL;

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

    // Store the current base URL to restore it later
    const originalBaseURL = this.instance.defaults.baseURL;
    
    try {
      // Temporarily modify the baseURL
      if (originalBaseURL) {
        this.instance.defaults.baseURL = originalBaseURL.toString().replace(/\/+$/, '');
      }

      const queryParams = this.buildQueryParams(params);
      const response = await this.instance.get<DetailedMetrics>(`/metrics/detailed?${queryParams.toString()}`);

      // Restore the original baseURL
      this.instance.defaults.baseURL = originalBaseURL;

      return response.data;
    } catch (error) {
      console.error('Error fetching detailed metrics:', error);
      
      // Restore the original baseURL in case of error
      this.instance.defaults.baseURL = originalBaseURL;
      
      throw error instanceof Error ? error : new Error('Failed to fetch detailed metrics');
    }
  }
  
  
  /**
   * Fetch category-specific metrics
   */
  public static async fetchCategoryMetrics(category: string): Promise<any> {
    this.initialize();
    
    try {
      const response = await this.instance.get<any>(`/metrics/${category}`);
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