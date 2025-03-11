import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Types for UI notifications
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  title?: string;
  timeout?: number;
  actions?: Array<{
    label: string;
    action: string;
  }>;
  dismissible?: boolean;
}

/**
 * Types for UI modal
 */
export interface Modal {
  id: string;
  type: string;
  title: string;
  size?: 'sm' | 'lg' | 'xl';
  data?: any;
  options?: {
    closable?: boolean;
    closeOnBackdropClick?: boolean;
  };
}

/**
 * State interface for the UI
 */
interface UIState {
  // Global loading state
  loading: {
    global: boolean;
    operations: Record<string, boolean>;
  };
  // Notifications system
  notifications: Notification[];
  // Modal system
  modal: Modal | null;
  // Sidebar state
  sidebarCollapsed: boolean;
  // Tour state
  tourActive: boolean;
  tourStep: number;
  // Search state
  globalSearch: string;
}

/**
 * Initial state for UI
 */
const initialState: UIState = {
  loading: {
    global: false,
    operations: {},
  },
  notifications: [],
  modal: null,
  sidebarCollapsed: false,
  tourActive: false,
  tourStep: 0,
  globalSearch: '',
};

/**
 * UI slice with reducers and actions
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Set global loading state
     */
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    
    /**
     * Set loading state for a specific operation
     */
    setOperationLoading: (state, action: PayloadAction<{ operation: string; loading: boolean }>) => {
      state.loading.operations[action.payload.operation] = action.payload.loading;
    },
    
    /**
     * Clear all loading states
     */
    clearLoading: (state) => {
      state.loading.global = false;
      state.loading.operations = {};
    },
    
    /**
     * Add a notification
     */
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      state.notifications.push({
        ...action.payload,
        id,
        dismissible: action.payload.dismissible !== false, // Default to true
      });
    },
    
    /**
     * Remove a notification by ID
     */
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    /**
     * Clear all notifications
     */
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    /**
     * Open a modal
     */
    openModal: (state, action: PayloadAction<Modal>) => {
      state.modal = action.payload;
    },
    
    /**
     * Close the current modal
     */
    closeModal: (state) => {
      state.modal = null;
    },
    
    /**
     * Update modal data
     */
    updateModalData: (state, action: PayloadAction<any>) => {
      if (state.modal) {
        state.modal.data = action.payload;
      }
    },
    
    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    /**
     * Set sidebar collapsed state
     */
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    
    /**
     * Start the application tour
     */
    startTour: (state) => {
      state.tourActive = true;
      state.tourStep = 0;
    },
    
    /**
     * Set the current tour step
     */
    setTourStep: (state, action: PayloadAction<number>) => {
      state.tourStep = action.payload;
    },
    
    /**
     * End the application tour
     */
    endTour: (state) => {
      state.tourActive = false;
      state.tourStep = 0;
    },
    
    /**
     * Set global search query
     */
    setGlobalSearch: (state, action: PayloadAction<string>) => {
      state.globalSearch = action.payload;
    },
  },
});

// Export actions and reducer
export const {
  setGlobalLoading,
  setOperationLoading,
  clearLoading,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  updateModalData,
  toggleSidebar,
  setSidebarCollapsed,
  startTour,
  setTourStep,
  endTour,
  setGlobalSearch,
} = uiSlice.actions;

export default uiSlice.reducer;