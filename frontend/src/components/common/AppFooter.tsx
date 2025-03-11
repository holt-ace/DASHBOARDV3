import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * AppFooter Component
 * 
 * Footer component for the application that includes company information, 
 * quick links, and copyright notice.
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
          
          <Col md={4} className="text-center">
            <ul className="list-inline mb-0">
              <li className="list-inline-item">
                <Link to="/help" className="text-decoration-none text-muted">
                  Help
                </Link>
              </li>
              <li className="list-inline-item">•</li>
              <li className="list-inline-item">
                <Link to="/privacy" className="text-decoration-none text-muted">
                  Privacy
                </Link>
              </li>
              <li className="list-inline-item">•</li>
              <li className="list-inline-item">
                <Link to="/terms" className="text-decoration-none text-muted">
                  Terms
                </Link>
              </li>
            </ul>
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