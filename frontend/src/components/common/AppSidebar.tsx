import React, { useState } from 'react';
import { Nav, Button } from 'react-bootstrap';
import { NavLink, useLocation } from 'react-router-dom';

/**
 * AppSidebar Component
 * 
 * The main navigation sidebar for the application.
 * Provides quick access to primary sections of the app with visual indicators
 * for the current active section.
 */
const AppSidebar: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };
  
  // Helper to determine if a path is active (exact or starts with)
  const isPathActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  return (
    <div className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header d-flex justify-content-between align-items-center p-3">
        {!collapsed && (
          <h5 className="m-0">Navigation</h5>
        )}
        <Button 
          variant="link" 
          className="p-1 text-secondary border-0"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
        </Button>
      </div>
      
      <Nav className="flex-column p-2" as="ul">
        <Nav.Item as="li">
          <NavLink 
            to="/dashboard" 
            className={({isActive}) => 
              `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`
            }
          >
            <i className="bi bi-speedometer2 me-3"></i>
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
        </Nav.Item>
        
        <Nav.Item as="li">
          <NavLink 
            to="/purchase-orders" 
            className={({isActive}) => 
              `nav-link d-flex align-items-center ${isActive || isPathActive('/purchase-orders') ? 'active' : ''}`
            }
          >
            <i className="bi bi-file-text me-3"></i>
            {!collapsed && <span>Purchase Orders</span>}
          </NavLink>
        </Nav.Item>
        
        <Nav.Item as="li">
          <NavLink 
            to="/planning-hub" 
            className={({isActive}) => 
              `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`
            }
          >
            <i className="bi bi-calendar3 me-3"></i>
            {!collapsed && <span>Planning Hub</span>}
          </NavLink>
        </Nav.Item>
        
        <Nav.Item as="li">
          <NavLink 
            to="/metrics" 
            className={({isActive}) => 
              `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`
            }
          >
            <i className="bi bi-graph-up me-3"></i>
            {!collapsed && <span>Metrics & Analytics</span>}
          </NavLink>
        </Nav.Item>
        
        {!collapsed && (
          <>
            <div className="sidebar-divider my-3"></div>
            
            <div className="sidebar-heading px-3 py-2 text-muted text-uppercase small">
              Quick Actions
            </div>
            
            <Nav.Item as="li">
              <NavLink 
                to="/purchase-orders/create" 
                className={({isActive}) => 
                  `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`
                }
              >
                <i className="bi bi-plus-circle me-3"></i>
                <span>Create New PO</span>
              </NavLink>
            </Nav.Item>
            
            <Nav.Item as="li">
              <NavLink 
                to="/reports" 
                className={({isActive}) => 
                  `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`
                }
              >
                <i className="bi bi-file-earmark-bar-graph me-3"></i>
                <span>Reports</span>
              </NavLink>
            </Nav.Item>
            
            <div className="sidebar-divider my-3"></div>
            
            <div className="sidebar-heading px-3 py-2 text-muted text-uppercase small">
              Support
            </div>
            
            <Nav.Item as="li">
              <NavLink 
                to="/help" 
                className={({isActive}) => 
                  `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`
                }
              >
                <i className="bi bi-question-circle me-3"></i>
                <span>Help & Documentation</span>
              </NavLink>
            </Nav.Item>
            
            <Nav.Item as="li">
              <NavLink 
                to="/settings" 
                className={({isActive}) => 
                  `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`
                }
              >
                <i className="bi bi-gear me-3"></i>
                <span>Settings</span>
              </NavLink>
            </Nav.Item>
          </>
        )}
      </Nav>
      
      {!collapsed && (
        <div className="sidebar-footer p-3 mt-auto">
          <div className="d-flex align-items-center bg-light p-2 rounded">
            <div className="avatar-circle bg-primary text-white me-3">
              <span>AJ</span>
            </div>
            <div>
              <div className="fw-bold">Alex Johnson</div>
              <div className="text-muted small">Procurement Manager</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppSidebar;