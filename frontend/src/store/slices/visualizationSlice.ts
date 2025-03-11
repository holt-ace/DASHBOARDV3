import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { POStatus } from '@/types/purchaseOrder';

/**
 * Types for visualization settings
 */
export interface CalendarView {
  viewMode: 'month' | 'week' | 'day';
  currentDate: string;
  highlightedStatus: POStatus | null;
  displayMode: 'delivery' | 'order' | 'invoice';
}

export interface TimelineView {
  zoom: number;
  startDate: string | null;
  endDate: string | null;
  groupBy: 'status' | 'buyer' | 'location' | null;
  displayMode: 'compact' | 'detailed';
}

export interface DashboardLayout {
  panels: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; w: number; h: number };
    settings: Record<string, any>;
    title: string;
  }>;
  layout: 'grid' | 'fixed';
}

/**
 * State interface for the visualization settings
 */
interface VisualizationState {
  calendarView: CalendarView;
  timelineView: TimelineView;
  dashboardLayout: DashboardLayout;
  activeView: 'calendar' | 'timeline' | 'dashboard';
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Initial state for visualization
 */
const initialState: VisualizationState = {
  calendarView: {
    viewMode: 'month',
    currentDate: new Date().toISOString(),
    highlightedStatus: null,
    displayMode: 'delivery',
  },
  timelineView: {
    zoom: 1,
    startDate: null,
    endDate: null,
    groupBy: 'status',
    displayMode: 'compact',
  },
  dashboardLayout: {
    panels: [],
    layout: 'grid',
  },
  activeView: 'dashboard',
  theme: 'light',
};

/**
 * Visualization slice with reducers and actions
 */
const visualizationSlice = createSlice({
  name: 'visualization',
  initialState,
  reducers: {
    /**
     * Set the active visualization view
     */
    setActiveView: (state, action: PayloadAction<VisualizationState['activeView']>) => {
      state.activeView = action.payload;
    },
    
    /**
     * Set the calendar view settings
     */
    setCalendarView: (state, action: PayloadAction<Partial<CalendarView>>) => {
      state.calendarView = { ...state.calendarView, ...action.payload };
    },
    
    /**
     * Set the timeline view settings
     */
    setTimelineView: (state, action: PayloadAction<Partial<TimelineView>>) => {
      state.timelineView = { ...state.timelineView, ...action.payload };
    },
    
    /**
     * Add a panel to the dashboard
     */
    addDashboardPanel: (state, action: PayloadAction<DashboardLayout['panels'][0]>) => {
      state.dashboardLayout.panels.push(action.payload);
    },
    
    /**
     * Remove a panel from the dashboard
     */
    removeDashboardPanel: (state, action: PayloadAction<string>) => {
      state.dashboardLayout.panels = state.dashboardLayout.panels.filter(
        panel => panel.id !== action.payload
      );
    },
    
    /**
     * Update dashboard panel settings
     */
    updatePanelSettings: (state, action: PayloadAction<{ id: string; settings: Record<string, any> }>) => {
      const panel = state.dashboardLayout.panels.find(p => p.id === action.payload.id);
      if (panel) {
        panel.settings = { ...panel.settings, ...action.payload.settings };
      }
    },
    
    /**
     * Update dashboard panel position
     */
    updatePanelPosition: (
      state, 
      action: PayloadAction<{ 
        id: string; 
        position: Partial<DashboardLayout['panels'][0]['position']> 
      }>
    ) => {
      const panel = state.dashboardLayout.panels.find(p => p.id === action.payload.id);
      if (panel) {
        panel.position = { ...panel.position, ...action.payload.position };
      }
    },
    
    /**
     * Set the dashboard layout type
     */
    setDashboardLayout: (state, action: PayloadAction<DashboardLayout['layout']>) => {
      state.dashboardLayout.layout = action.payload;
    },
    
    /**
     * Reset dashboard to default layout
     */
    resetDashboard: (state) => {
      state.dashboardLayout = initialState.dashboardLayout;
    },
    
    /**
     * Save the current dashboard as a template
     */
    saveDashboardTemplate: () => {
      // In a real app, would save to backend or localStorage
      // For now, just a placeholder
    },
    
    /**
     * Set the UI theme
     */
    setTheme: (state, action: PayloadAction<VisualizationState['theme']>) => {
      state.theme = action.payload;
    },
  },
});

// Export actions and reducer
export const {
  setActiveView,
  setCalendarView,
  setTimelineView,
  addDashboardPanel,
  removeDashboardPanel,
  updatePanelSettings,
  updatePanelPosition,
  setDashboardLayout,
  resetDashboard,
  saveDashboardTemplate,
  setTheme,
} = visualizationSlice.actions;

export default visualizationSlice.reducer;