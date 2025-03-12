# 📊 Purchase Order Management System

A comprehensive command center for managing purchase orders with advanced visualization, analytics, and workflow capabilities. This system provides a dynamic interface to track, analyze, and process purchase orders throughout their entire lifecycle.

## 📑 Table of Contents

- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Technical Stack](#technical-stack)
- [Directory Structure](#directory-structure)
- [Setup and Installation](#setup-and-installation)
- [Available Commands](#available-commands)
- [Development Guidelines](#development-guidelines)
- [Visualizations and Analytics](#visualizations-and-analytics)
- [Deployment](#deployment)

## ✨ Key Features

- 🔄 **Dynamic Purchase Order Lifecycle Experience** - Interactive, visual workflow that adapts to each stage of the PO lifecycle
- 🌐 **Multi-dimensional Planning & Visualization Hub** - Visualize POs in multiple contexts:
  - 📅 Calendar view for date-based planning
  - 📋 Kanban board for status-based management
  - ⏱️ Timeline view for chronological analysis
  - 🗺️ Geographic map for location-based insights
- 📈 **Intelligent Metrics & Analytics Dashboard** - Comprehensive analytics with actionable business intelligence
- 🧩 **Contextual Action Panels** - Stage-specific interfaces that provide relevant tools based on PO status
- ✅ **Smart Validation System** - Real-time form validation that enforces business rules
- 📁 **Document Management** - Upload, process, and track documents associated with purchase orders
- 🔍 **Search and Filtering** - Advanced search capabilities with saved filters and complex queries
- ⚡ **Batch Processing** - Perform operations on multiple POs simultaneously

## 🏗️ Project Structure

This project consists of two main components:

1. 🖥️ **Frontend**: A modern React application with TypeScript, Redux Toolkit, and Vite
2. 🔌 **Backend**: An Express.js server with MongoDB integration and structured API endpoints

## 🔭 Architecture Overview

### 🖥️ Frontend Architecture

The frontend follows a modern component-based architecture:

- **Component Structure**: Organized by feature and responsibility
- **State Management**: Centralized with Redux Toolkit and slice pattern
- **Routing**: Client-side routing with React Router
- **Styling**: SCSS modules with utility classes and component-specific styles
- **API Integration**: Type-safe API client with Axios
- **Visualization**: Integrated D3.js, Chart.js, and Leaflet for advanced visualizations

### 🔌 Backend Architecture

The backend follows a layered architecture:

- **Controller Layer**: Handles HTTP requests/responses
- **Service Layer**: Contains business logic and orchestration
- **Repository Layer**: Handles data access and persistence
- **Model Layer**: Defines data structures and schemas
- **Middleware**: Processes requests before they reach route handlers
- **Utilities**: Shared helper functions and common code

### 🔄 Data Flow

1. Client sends requests to API endpoints
2. Controllers validate input and route to appropriate services
3. Services implement business logic and interact with repositories
4. Repositories interact with the database and return data
5. Services transform data into the format expected by clients
6. Controllers send responses back to the client

## 🛠️ Technical Stack

### 🖥️ Frontend

- **Core**: React 18+ with TypeScript
- **State Management**: Redux Toolkit
- **UI Framework**: Bootstrap 5 with React Bootstrap components
- **Build Tool**: Vite 6
- **Styling**: SCSS with modern module system
- **HTTP Client**: Axios with typed responses
- **Form Handling**: Formik with Yup validation
- **Visualizations**:
  - 📊 Charts: Chart.js with react-chartjs-2
  - 🗺️ Maps: Leaflet with react-leaflet
  - 📈 Data Visualization: D3.js
  - 📅 Calendar: FullCalendar
  - 🔄 Drag-and-Drop: react-beautiful-dnd

### 🔌 Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens
- **Validation**: Custom schema validation
- **PDF Processing**: Custom PDF processor with LangChain integration
- **Error Handling**: Centralized error handling middleware
- **Logging**: Custom logger with rotating file storage

## 🚀 Development Setup

### 📋 Prerequisites

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

## 🔌 API Endpoints

The backend provides the following API endpoints:

- `GET /api/po` - Get all purchase orders
- `GET /api/po/:poNumber` - Get a specific purchase order
- `POST /api/po` - Create a new purchase order
- `PUT /api/po/:poNumber` - Update an existing purchase order
- `DELETE /api/po/:poNumber` - Delete a purchase order
- `PATCH /api/po/:poNumber/status` - Update the status of a purchase order
- `GET /api/po/metrics` - Get purchase order metrics
- `GET /api/po/metrics/detailed` - Get detailed metrics

## 📂 Directory Structure

### Frontend Structure

```
frontend/
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   │   ├── action-panels/ # Status-specific action panels
│   │   ├── charts/        # Chart components
│   │   ├── common/        # Common UI elements
│   │   ├── status-workflow/ # Status workflow components
│   │   ├── validations/   # Form validation components
│   │   └── visualizations/ # Data visualization components
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API and business logic services
│   ├── store/             # Redux store configuration
│   │   └── slices/        # Redux slices for state management
│   ├── styles/            # Global and component styles
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static files
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

### Backend Structure

```
backend/
├── config/                # Configuration files
├── core/                  # Core functionality
│   ├── database.js        # Database connection
│   ├── metrics.js         # Metrics calculation
│   ├── schema/            # Schema definitions
│   ├── status/            # Status definitions and transitions
│   └── validation/        # Validation logic
├── middleware/            # Express middleware
├── po/                    # Purchase Order module
│   ├── controllers/       # Request handlers
│   ├── middleware/        # PO-specific middleware
│   ├── models/            # Mongoose models
│   ├── repositories/      # Data access layer
│   ├── routes/            # API route definitions
│   └── services/          # Business logic
│       └── PDFProcessor/  # PDF processing service
├── public/                # Served static files (frontend build)
├── utils/                 # Utility functions
└── server.js              # Main server entry point
```

## 📝 Development Guidelines

### 💻 Code Style

- **TypeScript**: Use strict typing for all new code
- **Component Structure**: Follow functional component pattern with hooks
- **State Management**: Use Redux for global state, React hooks for local state
- **CSS Methodology**: Use BEM naming convention with SCSS modules
- **Error Handling**: Implement proper error boundaries and try/catch patterns

### ⭐ Best Practices

- 🧪 **Testing**: Write unit tests for critical business logic
- ⚡ **Performance**: Implement code splitting, memoization, and optimized rendering
- ♿ **Accessibility**: Ensure UI components are accessible (WCAG AA compliance)
- 👀 **Code Reviews**: All changes should be reviewed before merging
- 📚 **Documentation**: Document complex logic and component APIs

## 📊 Visualizations and Analytics

The system provides several visualization modes:

- 📅 **Calendar View**: Displays POs by date with drag-and-drop capabilities
- 📋 **Kanban Board**: Organizes POs by status with drag-and-drop transitions
- ⏱️ **Timeline**: Shows PO lifecycle with status milestones
- 🗺️ **Geographic Map**: Visualizes POs based on location data
- 📈 **Metrics Dashboard**: Displays KPIs, trends, and forecasts

## 🚀 Deployment

For detailed deployment instructions, see [Build and Deployment Guide](./docs/build-and-deployment-guide.md).

### Quick Deployment

To quickly deploy the application for testing:

1. Run the deployment script to build and prepare the application:
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

## 📚 Additional Documentation

- 📝 [Implementation Plan](./docs/po-management-system-implementation-plan.md)
- 🚀 [Build and Deployment Guide](./docs/build-and-deployment-guide.md)
- 👀 [Code Review Summary](./docs/code-review-summary.md)