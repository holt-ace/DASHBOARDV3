import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import poListReducer from './slices/poListSlice';
import poDetailReducer from './slices/poDetailSlice';
import visualizationReducer from './slices/visualizationSlice';
import metricsReducer from './slices/metricsSlice';
import uiReducer from './slices/uiSlice';

/**
 * Configure the Redux store with all reducers
 * Using Redux Toolkit for simplified Redux logic
 */
export const store = configureStore({
  reducer: {
    poList: poListReducer,
    poDetail: poDetailReducer,
    visualization: visualizationReducer,
    metrics: metricsReducer,
    ui: uiReducer,
  },
  // Enable Redux DevTools in development environment
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types in serializability check
        ignoredActions: ['poList/setDateRange'],
        // Ignore these field paths in serializability check
        ignoredPaths: ['poList.filters.startDate', 'poList.filters.endDate'],
      },
    }),
});

// Export types for Redux usage
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Custom hooks for typed Redux usage
 * Provides type safety for useDispatch and useSelector
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;