# Purchase Order Management System

A comprehensive system for managing purchase orders with advanced visualization, analytics, and workflow capabilities.

## Project Structure

This project consists of two main components:

1. **Frontend**: A modern React application with TypeScript, Redux, and Vite
2. **Backend**: An Express.js server with MongoDB integration

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- MongoDB running locally or accessible via URI
- Git

### Running the Application in Development Mode

#### Option 1: Backend API Only (Port 8080) + Frontend (Port 3000)

1. **Start the Backend API Server**:
   ```bash
   cd backend
   PORT=8080 npm run dev
   ```

2. **Start the React Frontend**:
   ```bash
   cd frontend
   npm run start
   ```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - API Endpoints: http://localhost:8080/api/*

This setup keeps the React development server running separately from the backend, which provides hot reloading and other developer features.

#### Option 2: Development Integration Testing

To test the full integration as it would work in production:

1. Build and deploy using the provided script:
   ```bash
   ./deploy.sh
   ```

2. Start the backend server in production mode:
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

3. Access the integrated application:
   - http://localhost:3000

## API Endpoints

The backend provides the following API endpoints:

- `GET /api/po` - Get all purchase orders
- `GET /api/po/:poNumber` - Get a specific purchase order
- `POST /api/po` - Create a new purchase order
- `PUT /api/po/:poNumber` - Update an existing purchase order
- `DELETE /api/po/:poNumber` - Delete a purchase order
- `PATCH /api/po/:poNumber/status` - Update the status of a purchase order
- `GET /api/po/metrics` - Get purchase order metrics
- `GET /api/po/metrics/detailed` - Get detailed metrics

## Deployment to Production

To deploy the application to production:

1. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

2. Configure your production environment variables:
   - Edit `backend/.env` with your production settings

3. Start the production server:
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

## Implementation Details

The application implements three key innovations:

1. **Dynamic Purchase Order Lifecycle Experience** - An interactive, visual, and contextual experience that adapts to each stage of the PO lifecycle.

2. **Multi-dimensional Planning & Visualization Hub** - A versatile interface for visualizing POs in multiple contexts (calendar, kanban, timeline, map).

3. **Intelligent Metrics & Analytics Dashboard** - A comprehensive analytics dashboard that provides actionable business intelligence.

## Contributing

1. Create a new branch for your feature
2. Make changes and test thoroughly
3. Submit a pull request with a detailed description of changes