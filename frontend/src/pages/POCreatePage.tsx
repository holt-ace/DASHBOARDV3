import React, { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Table, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

/**
 * POCreatePage Component
 * 
 * Page that provides a form for creating a new purchase order.
 * Includes sections for header information, product items, and additional details.
 */
const POCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [validated, setValidated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Placeholder state for form data
  const [formData, setFormData] = useState({
    poNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    buyerFirstName: '',
    buyerLastName: '',
    buyerEmail: '',
    locationName: '',
    locationAddress: '',
    deliveryDate: '',
    deliveryInstructions: ''
  });

  // Placeholder state for product items
  const [productItems, setProductItems] = useState([
    { id: 1, supc: '', description: '', quantity: 1, price: 0, total: 0 }
  ]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle product item changes
  const handleProductChange = (id: number, field: string, value: string | number) => {
    setProductItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total if quantity or price changed
          if (field === 'quantity' || field === 'price') {
            const quantity = field === 'quantity' ? Number(value) : item.quantity;
            const price = field === 'price' ? Number(value) : item.price;
            updatedItem.total = quantity * price;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Add new product item
  const handleAddProduct = () => {
    const newId = Math.max(...productItems.map(item => item.id), 0) + 1;
    setProductItems([
      ...productItems,
      { id: newId, supc: '', description: '', quantity: 1, price: 0, total: 0 }
    ]);
  };

  // Remove product item
  const handleRemoveProduct = (id: number) => {
    if (productItems.length > 1) {
      setProductItems(productItems.filter(item => item.id !== id));
    }
  };

  // Calculate order total
  const calculateTotal = () => {
    return productItems.reduce((sum, item) => sum + item.total, 0);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Here you would normally submit the data to your API
    console.log('Form data submitted:', { ...formData, products: productItems });
    
    // Show success message
    setShowSuccess(true);
    
    // Navigate to PO details page after a delay
    setTimeout(() => {
      navigate('/purchase-orders/PO' + Math.floor(100000 + Math.random() * 900000));
    }, 2000);
  };

  return (
    <Container fluid>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h2 mb-0 text-gray-800">Create New Purchase Order</h1>
      </div>
      
      {showSuccess && (
        <Alert 
          variant="success" 
          dismissible 
          onClose={() => setShowSuccess(false)}
          className="mb-4"
        >
          <Alert.Heading>Purchase Order Created Successfully!</Alert.Heading>
          <p>Your purchase order has been created and is being processed. You will be redirected to the PO details page momentarily.</p>
        </Alert>
      )}
      
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        {/* Header Information Card */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light py-3">
            <h5 className="mb-0 fw-bold">Order Information</h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6} lg={3}>
                <Form.Group controlId="poNumber">
                  <Form.Label>PO Number</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Auto-generated"
                    name="poNumber"
                    disabled
                  />
                </Form.Group>
              </Col>
              
              <Col md={6} lg={3}>
                <Form.Group controlId="orderDate">
                  <Form.Label>Order Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="orderDate"
                    value={formData.orderDate}
                    onChange={handleInputChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide an order date.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6} lg={3}>
                <Form.Group controlId="deliveryDate">
                  <Form.Label>Requested Delivery Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleInputChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide a delivery date.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6} lg={3}>
                <Form.Group controlId="status">
                  <Form.Label>Status</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="UPLOADED"
                    disabled
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Buyer Information Card */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light py-3">
            <h5 className="mb-0 fw-bold">Buyer Information</h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="buyerFirstName">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter first name"
                    name="buyerFirstName"
                    value={formData.buyerFirstName}
                    onChange={handleInputChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide a first name.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group controlId="buyerLastName">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter last name"
                    name="buyerLastName"
                    value={formData.buyerLastName}
                    onChange={handleInputChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide a last name.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={12}>
                <Form.Group controlId="buyerEmail">
                  <Form.Label>Email Address *</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter email"
                    name="buyerEmail"
                    value={formData.buyerEmail}
                    onChange={handleInputChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide a valid email address.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Location Information */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light py-3">
            <h5 className="mb-0 fw-bold">Location Information</h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="locationName">
                  <Form.Label>Location Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter location name"
                    name="locationName"
                    value={formData.locationName}
                    onChange={handleInputChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide a location name.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group controlId="locationAddress">
                  <Form.Label>Address *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter address"
                    name="locationAddress"
                    value={formData.locationAddress}
                    onChange={handleInputChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide an address.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={12}>
                <Form.Group controlId="deliveryInstructions">
                  <Form.Label>Delivery Instructions</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Enter any special delivery instructions"
                    name="deliveryInstructions"
                    value={formData.deliveryInstructions}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Product Items */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light py-3 d-flex justify-content-between">
            <h5 className="mb-0 fw-bold">Product Items</h5>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleAddProduct}
            >
              <i className="bi bi-plus"></i> Add Item
            </Button>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <Table bordered>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '20%' }}>SUPC *</th>
                    <th style={{ width: '30%' }}>Description</th>
                    <th style={{ width: '10%' }}>Quantity *</th>
                    <th style={{ width: '15%' }}>Unit Price *</th>
                    <th style={{ width: '15%' }}>Total</th>
                    <th style={{ width: '5%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productItems.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <Form.Control
                          type="text"
                          placeholder="SUPC"
                          value={item.supc}
                          onChange={(e) => handleProductChange(item.id, 'supc', e.target.value)}
                          required
                          size="sm"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          placeholder="Product description"
                          value={item.description}
                          onChange={(e) => handleProductChange(item.id, 'description', e.target.value)}
                          size="sm"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleProductChange(item.id, 'quantity', Number(e.target.value))}
                          required
                          size="sm"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => handleProductChange(item.id, 'price', Number(e.target.value))}
                          required
                          size="sm"
                        />
                      </td>
                      <td className="text-end">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(item.total)}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveProduct(item.id)}
                          disabled={productItems.length <= 1}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="text-end fw-bold">Order Total:</td>
                    <td className="text-end fw-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(calculateTotal())}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Card.Body>
        </Card>
        
        {/* Form Actions */}
        <div className="mb-4 d-flex justify-content-between">
          <Button variant="outline-secondary">
            <i className="bi bi-arrow-left me-1"></i> 
            <Link to="/purchase-orders" className="text-decoration-none text-secondary">
              Cancel
            </Link>
          </Button>
          
          <div>
            <Button variant="outline-primary" className="me-2" type="reset">
              <i className="bi bi-arrow-counterclockwise me-1"></i> Reset
            </Button>
            <Button variant="success" type="submit">
              <i className="bi bi-check2-circle me-1"></i> Create Purchase Order
            </Button>
          </div>
        </div>
      </Form>
    </Container>
  );
};

export default POCreatePage;