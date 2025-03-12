import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';

// Layout components
import AppHeader from '@/components/common/AppHeader';
import AppSidebar from '@/components/common/AppSidebar';
import AppFooter from '@/components/common/AppFooter';

// Page components
import DashboardPage from '@/pages/DashboardPage';
import POListPage from '@/pages/POListPage';
import PODetailPage from '@/pages/PODetailPage';
import POCreatePage from '@/pages/POCreatePage';
import MetricsDashboardPage from '@/pages/MetricsDashboardPage';
import ComingSoonPage from '@/pages/ComingSoonPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Utilities
import Navigation from '@/utils/navigation';

// Styles
import './styles/App.scss';

const App: React.FC = () => {
  // Get the navigate function from React Router
  const navigate = useNavigate();
  // Initialize the navigation utility
  React.useEffect(() => { Navigation.initialize(navigate); }, [navigate]);

  // Log routes for debugging
  useEffect(() => {
    console.log("App component mounted with routes for PO Details");
  }, []);
  
  return (
    <div className="app-container d-flex flex-column min-vh-100">
      <AppHeader />
      
      <div className="app-content d-flex flex-grow-1">
        <AppSidebar />
        
        <main className="flex-grow-1 p-3 p-md-4 overflow-auto">
          <Container fluid>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/purchase-orders" element={<POListPage />} />
              <Route path="/purchase-orders/create" element={<POCreatePage />} />
              <Route 
                path="/purchase-orders/:poNumber" 
                element={
                  <Suspense fallback={<div className="text-center p-5">Loading purchase order details...</div>}>
                    <PODetailPage />
                  </Suspense>
                } 
              />
              <Route path="/planning-hub" element={<ComingSoonPage />} />
              <Route path="/metrics" element={<MetricsDashboardPage />} />
              <Route path="/reports" element={<ComingSoonPage />} />
              <Route path="/inventory" element={<ComingSoonPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Container>
        </main>
      </div>
      
      <AppFooter />
    </div>
  );
};

export default App;