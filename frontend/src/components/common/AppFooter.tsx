import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

/**
 * AppFooter Component
 * 
 * Simple footer component for the application that includes 
 * version information and copyright notice.
 */
const AppFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="app-footer bg-light mt-auto py-3 border-top">
      <Container>
        <Row className="align-items-center g-3">
          <Col md={4} className="text-center text-md-start">
            <div className="d-flex flex-column">
              <span className="fw-bold mb-1">PO Management System</span>
              <span className="text-muted small">Version 1.2.3</span>
            </div>
          </Col>
          
          <Col md={4} className="text-center d-none d-md-block">
            {/* Center column intentionally left empty */}
          </Col>
          
          <Col md={4} className="text-center text-md-end">
            <span className="text-muted small">
              &copy; {currentYear} Company, Inc. All rights reserved.
            </span>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default AppFooter;