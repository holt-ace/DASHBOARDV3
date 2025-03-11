import React from 'react';
import { Navbar, Container, Nav, Dropdown, Button, Form, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * AppHeader Component
 * 
 * The main navigation header for the application.
 * Provides access to search, notifications, user profile, and main navigation links.
 */
const AppHeader: React.FC = () => {
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="app-header py-2">
      <Container fluid>
        <Navbar.Brand as={Link} to="/dashboard" className="me-4">
          <i className="bi bi-box me-2"></i>
          PO Management System
        </Navbar.Brand>
        
        <div className="d-flex">
          {/* Mobile menu toggle */}
          <Navbar.Toggle aria-controls="app-navbar" className="me-2" />
          
          {/* Profile dropdown - always visible */}
          <Dropdown align="end">
            <Dropdown.Toggle variant="link" id="dropdown-profile" className="text-white p-0">
              <div className="avatar-circle bg-white text-primary">
                <span>AJ</span>
              </div>
            </Dropdown.Toggle>
            
            <Dropdown.Menu>
              <Dropdown.Item>
                <i className="bi bi-person me-2"></i>
                Profile
              </Dropdown.Item>
              <Dropdown.Item>
                <i className="bi bi-gear me-2"></i>
                Settings
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item>
                <i className="bi bi-box-arrow-right me-2"></i>
                Sign Out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
        
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
          
          <div className="d-flex align-items-center">
            {/* Search */}
            <Form className="d-none d-lg-flex me-3">
              <InputGroup>
                <Form.Control
                  placeholder="Search PO#, Supplier..."
                  aria-label="Search"
                  size="sm"
                />
                <Button variant="outline-light" size="sm">
                  <i className="bi bi-search"></i>
                </Button>
              </InputGroup>
            </Form>
            
            {/* Notifications */}
            <Dropdown align="end" className="me-3">
              <Dropdown.Toggle variant="link" id="dropdown-notifications" className="text-white p-0">
                <i className="bi bi-bell fs-5"></i>
                <span className="notification-badge">3</span>
              </Dropdown.Toggle>
              
              <Dropdown.Menu className="dropdown-menu-lg">
                <Dropdown.Header>
                  You have 3 new notifications
                </Dropdown.Header>
                <Dropdown.Divider />
                
                <Dropdown.Item>
                  <div className="notification-item">
                    <div className="icon bg-primary">
                      <i className="bi bi-truck"></i>
                    </div>
                    <div className="content">
                      <div className="title">PO123456 has been shipped</div>
                      <div className="time">5 minutes ago</div>
                    </div>
                  </div>
                </Dropdown.Item>
                
                <Dropdown.Item>
                  <div className="notification-item">
                    <div className="icon bg-warning">
                      <i className="bi bi-exclamation-triangle"></i>
                    </div>
                    <div className="content">
                      <div className="title">PO654321 requires attention</div>
                      <div className="time">1 hour ago</div>
                    </div>
                  </div>
                </Dropdown.Item>
                
                <Dropdown.Item>
                  <div className="notification-item">
                    <div className="icon bg-success">
                      <i className="bi bi-check-circle"></i>
                    </div>
                    <div className="content">
                      <div className="title">PO789012 has been delivered</div>
                      <div className="time">Yesterday</div>
                    </div>
                  </div>
                </Dropdown.Item>
                
                <Dropdown.Divider />
                <Dropdown.Item className="text-center">
                  View All Notifications
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Create PO Button */}
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