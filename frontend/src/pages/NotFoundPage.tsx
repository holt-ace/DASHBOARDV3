import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * NotFoundPage Component
 * 
 * Displays a friendly 404 page when users navigate to a non-existent route.
 * Provides helpful navigation options to get users back on track.
 */
const NotFoundPage: React.FC = () => {
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm border-0 text-center">
            <Card.Body className="p-5">
              <div className="display-1 text-muted mb-4">
                <i className="bi bi-map"></i>
              </div>
              
              <h1 className="mb-3">404 - Page Not Found</h1>
              
              <p className="lead mb-4 text-muted">
                Oops! The page you're looking for doesn't exist or has been moved.
              </p>
              
              <div className="mb-4">
                <Row className="justify-content-center g-3">
                  <Col xs={12} sm="auto">
                    <Button 
                      variant="primary" 
                      className="w-100"
                    >
                      <i className="bi bi-house-door me-2"></i>
                      <Link to="/" className="text-white text-decoration-none">
                        Go to Dashboard
                      </Link>
                    </Button>
                  </Col>
                  
                  <Col xs={12} sm="auto">
                    <Button 
                      variant="outline-secondary" 
                      className="w-100"
                      onClick={() => window.history.back()}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Go Back
                    </Button>
                  </Col>
                </Row>
              </div>
              
              <div className="text-center mt-4">
                <h6 className="mb-3">Need Help?</h6>
                <div className="d-flex justify-content-center gap-3">
                  <Link to="/help" className="text-decoration-none">
                    <i className="bi bi-question-circle me-1"></i>
                    Help Center
                  </Link>
                  <Link to="/support" className="text-decoration-none">
                    <i className="bi bi-headset me-1"></i>
                    Contact Support
                  </Link>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFoundPage;