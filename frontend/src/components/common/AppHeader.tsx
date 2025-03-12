import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * AppHeader Component
 * 
 * The main navigation header for the application with simplified navigation links.
 */
const AppHeader: React.FC = () => {
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="app-header py-2">
      <Container fluid>
        <Navbar.Brand as={Link} to="/dashboard" className="me-4">
          <i className="bi bi-box me-2"></i>
          PO Management System
        </Navbar.Brand>
        
        {/* Mobile menu toggle */}
        <Navbar.Toggle aria-controls="app-navbar" className="me-2" />
        
        {/* Simplified header without user profile */}
        <Button variant="light" size="sm" className="d-none d-lg-inline-block ms-auto me-2"><Link to="/purchase-orders/create" className="text-decoration-none text-dark">+ New PO</Link></Button>
        
        <Navbar.Collapse id="app-navbar">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">
              <i className="bi bi-speedometer2 me-1"></i>
              Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/purchase-orders">
              <i className="bi bi-file-text me-1"></i>
              Purchase Orders
            </Nav.Link>
            <Nav.Link as={Link} to="/planning-hub">
              <i className="bi bi-calendar3 me-1"></i>
              Planning Hub
            </Nav.Link>
            <Nav.Link as={Link} to="/metrics">
              <i className="bi bi-graph-up me-1"></i>
              Metrics
            </Nav.Link>
          </Nav>
          
          <div className="d-flex align-items-center d-lg-none">
            <Button 
              variant="light" 
              size="sm" 
              className="fw-bold">
              <i className="bi bi-plus-lg me-2"></i>
              <Link to="/purchase-orders/create" className="text-decoration-none text-dark">
                New PO
              </Link>
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppHeader;