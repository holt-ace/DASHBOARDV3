import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import PlanningHubPage from '@/pages/PlanningHubPage';
import MetricsDashboardPage from '@/pages/MetricsDashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Styles
import './styles/App.scss';

const App: React.FC = () => {
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
              <Route path="/purchase-orders/:poNumber" element={<PODetailPage />} />
              <Route path="/planning-hub" element={<PlanningHubPage />} />
              <Route path="/metrics" element={<MetricsDashboardPage />} />
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