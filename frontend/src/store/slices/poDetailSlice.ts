import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { ApiService } from '@/services/ApiService';

/**
 * State interface for the PO detail
 */
interface PODetailState {
  purchaseOrder: PurchaseOrder | null;
  loading: boolean;
  error: string | null;
  availableTransitions: POStatus[];
}

/**
 * Initial state for the PO detail
 */
const initialState: PODetailState = {
  purchaseOrder: null,
  loading: false,
  error: null,
  availableTransitions: [],
};

/**
 * Async thunk to fetch a purchase order by ID/number
 */
export const fetchPODetail = createAsyncThunk(
  'poDetail/fetchPODetail',
  async (poNumber: string, { rejectWithValue }) => {
    try {
      const purchaseOrder = await ApiService.fetchPO(poNumber);
      
      // Temporarily use empty transitions array to avoid 404 error
      // We'll implement this properly once the status transitions endpoint is fixed
      let transitions: POStatus[] = [];
      try {
        transitions = await ApiService.getAvailableTransitions(purchaseOrder.header.status);
      } catch (transError) {
        console.warn('Could not fetch transitions, using empty array:', transError);
      }
      return { purchaseOrder, transitions };      
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch purchase order');
    }
  }
);

/**
 * Async thunk to update a purchase order
 */
export const updatePO = createAsyncThunk(
  'poDetail/updatePO',
  async ({ poNumber, updateData }: { poNumber: string; updateData: Partial<PurchaseOrder> }, { rejectWithValue }) => {
    try {
      const updatedPO = await ApiService.updatePO(poNumber, updateData);
      return updatedPO;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update purchase order');
    }
  }
);

/**
 * Async thunk to update the status of a purchase order
 */
export const updatePOStatus = createAsyncThunk(
  'poDetail/updatePOStatus',
  async ({ 
    poNumber, 
    newStatus, 
    notes,
    oldStatus
  }: { 
    poNumber: string; 
    newStatus: POStatus; 
    notes?: string;
    oldStatus?: POStatus;
  }, { rejectWithValue }) => {
    try {
      const updatedPO = await ApiService.updateStatus(poNumber, newStatus, notes, oldStatus);
      return updatedPO;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update purchase order status');
    }
  }
);

/**
 * PO detail slice with reducers and actions
 */
const poDetailSlice = createSlice({
  name: 'poDetail',
  initialState,
  reducers: {
    /**
     * Clear the current PO detail
     */
    clearPODetail: (state) => {
      state.purchaseOrder = null;
      state.loading = false;
      state.error = null;
      state.availableTransitions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchPODetail pending state
      .addCase(fetchPODetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle fetchPODetail fulfilled state
      .addCase(fetchPODetail.fulfilled, (state, action: PayloadAction<{ purchaseOrder: PurchaseOrder; transitions: POStatus[] }>) => {
        state.loading = false;
        state.purchaseOrder = action.payload.purchaseOrder;
        state.availableTransitions = action.payload.transitions;
      })
      // Handle fetchPODetail rejected state
      .addCase(fetchPODetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle updatePO pending state
      .addCase(updatePO.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle updatePO fulfilled state (actual update is done in fetchPODetail)
      .addCase(updatePO.fulfilled, (state) => {
        state.loading = false;
      })
      // Handle updatePO rejected state
      .addCase(updatePO.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle updatePOStatus pending state
      .addCase(updatePOStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle updatePOStatus fulfilled state (actual update is done in fetchPODetail)
      .addCase(updatePOStatus.fulfilled, (state, action: PayloadAction<PurchaseOrder>) => {
        state.loading = false;
        state.purchaseOrder = action.payload;
        // We need to fetch available transitions again as they may have changed
      })
      // Handle updatePOStatus rejected state
      .addCase(updatePOStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { clearPODetail } = poDetailSlice.actions;
export default poDetailSlice.reducer;