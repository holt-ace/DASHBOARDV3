import React from 'react';
import { Container, Row, Col, Card, Alert, Button } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

/**
 * ComingSoonPage Component
 *
 * Displays a placeholder page for features that are under development.
 * Shows different visuals depending on the feature type (reports or inventory).
 */
const ComingSoonPage: React.FC = () => {
  // Determine feature type based on the current path
  const location = useLocation();
  const path = location.pathname;
  const feature = path.includes('/reports') ? 'reports' : 
                  path.includes('/inventory') ? 'inventory' : 
                  path.includes('/planning-hub') ? 'planning' : 
                  'generic';

  const featureType = feature || 'generic';
  
  // Configuration for different feature types
  const featureConfigs: Record<string, {
    title: string,
    description: string,
    icon: string,
    color: string,
    expectedDate: string
  }> = {
    reports: {
      title: 'Reports Module',
      description: 'Advanced analytics and reporting capabilities are coming soon. You\'ll be able to generate custom reports, export data in multiple formats, and schedule automated report delivery.',
      icon: 'bi-bar-chart-line',
      color: '#3F51B5', // Indigo
      expectedDate: 'Q2 2025'
    },
    inventory: {
      title: 'Inventory Management',
      description: 'Comprehensive inventory tracking and management features are under development. Soon you\'ll be able to track stock levels, manage warehouse locations, and automate reordering.',
      icon: 'bi-box-seam',
      color: '#4CAF50', // Green
      expectedDate: 'Q2 2025'
    },
    planning: {
      title: 'Planning Hub',
      description: 'Enhanced planning and visualization tools are under development. Soon you\'ll be able to visualize POs using calendar, kanban, timeline and map views for better planning and management.',
      icon: 'bi-calendar-week',
      color: '#FF9800', // Orange
      expectedDate: 'Q2 2025'
    },
    generic: {
      title: 'New Feature Coming Soon',
      description: 'We\'re working on exciting new features to enhance your experience. Stay tuned for updates!',
      icon: 'bi-stars',
      color: '#2196F3', // Blue
      expectedDate: 'Coming Soon'
    }
  };
  
  // Get the configuration for the current feature
  const config = featureConfigs[featureType] || featureConfigs.generic;
  
  return (
    <Container fluid>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h2 mb-0 text-gray-800">{config.title}</h1>
      </div>
      
      <Row className="justify-content-center">
        <Col lg={8} xl={7}>
          <Card className="shadow mb-4">
            <Card.Body className="p-5 text-center">
              <div className="mb-4">
                <i 
                  className={`bi ${config.icon} display-1`} 
                  style={{ color: config.color }}
                ></i>
              </div>
              
              <h2 className="h3 mt-4 mb-3">Coming Soon!</h2>
              
              <p className="lead mb-4">{config.description}</p>
              
              <Alert variant="light" className="border">
                <div className="d-flex align-items-center">
                  <i className="bi bi-calendar-event me-2"></i>
                  <span>Expected Release: <strong>{config.expectedDate}</strong></span>
                </div>
              </Alert>
              
              <div className="mt-4 pt-3">
                <Button as="a" href="/dashboard" variant="outline-primary" className="me-3">
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Dashboard
                </Button>
                
                {featureType === 'reports' && (
                  <Button as="a" href="/metrics" variant="outline-secondary">
                    <i className="bi bi-graph-up me-2"></i>
                    View Metrics
                  </Button>
                )}
                
                {featureType === 'inventory' && (
                  <Button as="a" href="/purchase-orders" variant="outline-secondary">
                    <i className="bi bi-file-text me-2"></i>
                    View Purchase Orders
                  </Button>
                )}
                
                {featureType === 'planning' && (
                  <Button as="a" href="/purchase-orders" variant="outline-secondary">
                    <i className="bi bi-file-text me-2"></i>
                    View Purchase Orders
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
          
          {/* Development Timeline */}
          <Card className="shadow">
            <Card.Header className="py-3 d-flex align-items-center">
              <h6 className="m-0 font-weight-bold">Development Timeline</h6>
            </Card.Header>
            <Card.Body>
              <div className="timeline-container mb-3">
                <div className="timeline-item">
                  <div className="timeline-marker completed">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Planning Phase</h6>
                    <p className="small text-muted">Requirement gathering and feature specification</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-marker active">
                    <i className="bi bi-gear-fill"></i>
                  </div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Development</h6>
                    <p className="small text-muted">Building core functionality and user interface</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <i className="bi bi-bug"></i>
                  </div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Testing</h6>
                    <p className="small text-muted">Quality assurance and bug fixing</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <i className="bi bi-rocket-takeoff"></i>
                  </div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Release</h6>
                    <p className="small text-muted">Deployment and user onboarding</p>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ComingSoonPage;