import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PurchaseOrder, POSearchParams, POSearchResult } from '@/types/purchaseOrder';
import { ApiService } from '@/services/ApiService';

/**
 * State interface for the PO list
 */
interface POListState {
  items: PurchaseOrder[];
  filteredItems: PurchaseOrder[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  filters: {
    query: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    buyerIds: string[];
    locationIds: string[];
  };
  selectedItems: string[]; // Store selected PO numbers for batch operations
  batchOperations: {
    processing: boolean;
  };
}

/**
 * Initial state for the PO list
 */
const initialState: POListState = {
  items: [],
  filteredItems: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  },
  filters: {
    query: '',
    status: '',
    startDate: null,
    endDate: null,
    buyerIds: [],
    locationIds: [],
  },
  selectedItems: [],
  batchOperations: {
    processing: false,
  }
};

/**
 * Async thunk to fetch purchase orders with search params
 */
export const fetchPurchaseOrders = createAsyncThunk(
  'poList/fetchPurchaseOrders',
  async (searchParams: Partial<POSearchParams>, { rejectWithValue }) => {
    console.log('Fetching purchase orders with direct database connection...');
    try {
      // First attempt to fetch from MongoDB database
      try {
        console.log('Attempting to fetch POs from MongoDB...');
        const result = await ApiService.fetchPOs({
          ...searchParams,
          limit: searchParams.limit || 100 // Ensure we get all available POs
        });
        
        if (result.data && result.data.length > 0) {
          console.log(`Successfully found ${result.data.length} purchase orders in database`);
          
          // Log sample PO numbers to verify data
          const poNumbers = result.data.slice(0, 5).map(po => po.header?.poNumber || 'unknown');
          console.log('Sample PO Numbers from database:', poNumbers);
          
          return result as POSearchResult;
        }
        return result as POSearchResult;
      } catch (dbError) {
        console.error('Error fetching from MongoDB:', dbError);
        // If MongoDB fetch fails, fall back to regular API
        console.log('Falling back to API endpoint...');
        const fallbackResult = await ApiService.fetchPOs(searchParams);
        return fallbackResult as POSearchResult;
      }
    } catch (error) {
      console.error('Error in fetchPurchaseOrders:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch purchase orders');
    }
  }
);

/**
 * Async thunk to delete a purchase order
 */
export const deletePurchaseOrder = createAsyncThunk(
  'poList/deletePurchaseOrder',
  async (poNumber: string, { rejectWithValue, dispatch }) => {
    try {
      console.log(`[Redux] Attempting to delete PO: ${poNumber}`);
      await ApiService.deletePO(poNumber);
      console.log(`[Redux] Successfully deleted PO: ${poNumber}`);
      // Refresh the list after deletion
      dispatch(fetchPurchaseOrders({}));
      return poNumber;
    } catch (error) {
      console.error(`[Redux] Error deleting PO: ${poNumber}`, error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete purchase order');
    }
  }
);

/**
 * Async thunk to perform batch operations on multiple purchase orders
 */
export const performBatchOperation = createAsyncThunk(
  'poList/performBatchOperation',
  async ({ 
    poNumbers, 
    operation, 
    params 
  }: { 
    poNumbers: string[]; 
    operation: string; 
    params?: Record<string, any> 
  }, { rejectWithValue, dispatch }) => {
    try {
      if (poNumbers.length === 0) {
        throw new Error('No purchase orders selected');
      }

      // Different operations require different API calls
      if (operation === 'status' && params?.status) {
        // Update status for multiple POs
        const result = await ApiService.bulkUpdateStatus(poNumbers, params.status);
        // Refresh the list after the batch operation
        dispatch(fetchPurchaseOrders({}));
        return result;
      } else if (operation === 'delete') {
        // Delete multiple POs
        const result = await Promise.all(
          poNumbers.map(poNumber => ApiService.deletePO(poNumber))
        );
        dispatch(fetchPurchaseOrders({}));
        return result;
      } else {
        throw new Error(`Operation ${operation} not implemented or missing required parameters`);
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to perform batch operation');
    }
  }
);

/**
 * PO list slice with reducers and actions
 */
const poListSlice = createSlice({
  name: 'poList',
  initialState,
  reducers: {
    /**
     * Set the current page for pagination
     */
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    
    /**
     * Set the search query filter
     */
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.query = action.payload;
      // Reset page when filter changes
      state.pagination.page = 1;
    },
    
    /**
     * Set the status filter
     */
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.filters.status = action.payload;
      // Reset page when filter changes
      state.pagination.page = 1;
    },
    
    /**
     * Set the date range filter
     */
    setDateRange: (state, action: PayloadAction<{ startDate: string | null; endDate: string | null }>) => {
      state.filters.startDate = action.payload.startDate;
      state.filters.endDate = action.payload.endDate;
      // Reset page when filter changes
      state.pagination.page = 1;
    },
    
    /**
     * Set the buyer IDs filter
     */
    setBuyerIds: (state, action: PayloadAction<string[]>) => {
      state.filters.buyerIds = action.payload;
      // Reset page when filter changes
      state.pagination.page = 1;
    },
    
    /**
     * Set the location IDs filter
     */
    setLocationIds: (state, action: PayloadAction<string[]>) => {
      state.filters.locationIds = action.payload;
      // Reset page when filter changes
      state.pagination.page = 1;
    },
    
    /**
     * Reset all filters to their initial values
     */
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },

    /**
     * Toggle selection of a purchase order for batch operations
     */
    toggleItemSelection: (state, action: PayloadAction<string>) => {
      const poNumber = action.payload;
      const index = state.selectedItems.indexOf(poNumber);
      
      if (index === -1) {
        state.selectedItems.push(poNumber);
      } else {
        state.selectedItems.splice(index, 1);
      }
    },

    /**
     * Set the selection state for all visible items
     */
    selectAllItems: (state, action: PayloadAction<boolean>) => {
      if (action.payload) {
        // Select all visible items
        state.selectedItems = state.items.map(po => po.header.poNumber);
      } else {
        // Deselect all
        state.selectedItems = [];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchPurchaseOrders pending state
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle fetchPurchaseOrders fulfilled state
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.loading = false;
        // Handle both array and object with data property responses
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
          state.filteredItems = action.payload;
          state.pagination.totalItems = action.payload.length;
          state.pagination.totalPages = Math.ceil(action.payload.length / state.pagination.itemsPerPage);
        } else {
          state.items = action.payload.data;
          state.filteredItems = action.payload.data;
          state.pagination.totalItems = action.payload.metadata?.total || action.payload.data.length;
          state.pagination.totalPages = action.payload.metadata?.pages || 
            Math.ceil((action.payload.metadata?.total || action.payload.data.length) / state.pagination.itemsPerPage);
          state.pagination.page = action.payload.metadata?.page || state.pagination.page;
        }
      })
      // Handle fetchPurchaseOrders rejected state
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle deletePurchaseOrder pending state
      .addCase(deletePurchaseOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle deletePurchaseOrder fulfilled state
      .addCase(deletePurchaseOrder.fulfilled, (state, action) => {
        state.loading = false;
        // Optimistic UI update - the fetch will refresh the actual data
        state.selectedItems = state.selectedItems.filter(id => id !== action.payload);
      })
      // Handle deletePurchaseOrder rejected state
      .addCase(deletePurchaseOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle batch operation states
      .addCase(performBatchOperation.pending, (state) => {
        state.batchOperations.processing = true;
        state.error = null;
      })
      .addCase(performBatchOperation.fulfilled, (state) => {
        state.batchOperations.processing = false;
        state.selectedItems = []; // Clear selections after successful operation
      })
      .addCase(performBatchOperation.rejected, (state, action) => {
        state.batchOperations.processing = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { 
  setPage,
  setSearchQuery,
  setStatusFilter,
  setDateRange,
  setBuyerIds,
  setLocationIds,
  resetFilters,
  toggleItemSelection,
  selectAllItems
} = poListSlice.actions;

export default poListSlice.reducer;