#!/bin/bash
# Script to deploy the React frontend and backend together

# Set the current directory to the project root
PROJECT_ROOT="$(pwd)"
echo "🚀 Starting deployment process from $PROJECT_ROOT"

# Step 1: Build the React frontend
echo "📦 Building the React frontend..."
cd "$PROJECT_ROOT/frontend" || { echo "❌ Failed to navigate to frontend directory"; exit 1; }

# Install any missing dependencies that might cause build failures
echo "📦 Ensuring build dependencies are installed..."
if ! npm list terser >/dev/null 2>&1; then
    echo "Installing terser (required for minification)..."
    npm install --save-dev terser
fi

# Run the build
echo "🔨 Running build process..."
npm run build
BUILD_STATUS=$?

# Check if the build failed and use fallback if needed
if [ $BUILD_STATUS -ne 0 ] || [ ! -d "$PROJECT_ROOT/frontend/dist" ] || [ ! "$(ls -A "$PROJECT_ROOT/frontend/dist")" ]; then
    echo "⚠️ Main build process failed with exit code $BUILD_STATUS"
    echo "🔄 Attempting to create fallback build..."
    
    # Run the fallback build script
    if [ -f "$PROJECT_ROOT/frontend/fallback-build.js" ]; then
        node "$PROJECT_ROOT/frontend/fallback-build.js"
    else
        echo "❌ Fallback build script not found!"
    fi
fi
 
# Step 2: Create a backup of the old frontend
echo "🔄 Backing up old frontend (if exists)..."
if [ -d "$PROJECT_ROOT/backend/public_old_backup" ]; then
  rm -rf "$PROJECT_ROOT/backend/public_old_backup"
fi

if [ -d "$PROJECT_ROOT/backend/public" ]; then
  mv "$PROJECT_ROOT/backend/public" "$PROJECT_ROOT/backend/public_old_backup"
  echo "  ✅ Old frontend backed up to backend/public_old_backup"
else
  mkdir -p "$PROJECT_ROOT/backend/public_old_backup"
  echo "  ✅ Created backup directory (no old frontend found)"
fi

# Step 3: Create a directory for the new frontend
echo "📂 Creating new public directory..."
mkdir -p "$PROJECT_ROOT/backend/public"

# Step 4: Copy the React build to the backend public directory
echo "📋 Copying React build to backend/public..."

if [ -d "$PROJECT_ROOT/frontend/dist" ] && [ "$(ls -A "$PROJECT_ROOT/frontend/dist")" ]; then
    cp -r "$PROJECT_ROOT/frontend/dist/"* "$PROJECT_ROOT/backend/public/"
else
    echo "❌ Build directory is empty or doesn't exist even after fallback attempt!"
    exit 1
fi
echo "  ✅ Frontend assets copied successfully"

# Step 5: Create a .env file for the backend (if it doesn't exist)
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
  echo "📝 Creating .env file for backend..."
  cat > "$PROJECT_ROOT/backend/.env" << EOF
# Environment configuration
NODE_ENV=production
PORT=3000

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/po_management

# App settings
CORS_ORIGIN=*
EOF
  echo "  ✅ Created .env file with default settings"
else
  echo "  ✅ Using existing .env file"
fi

# Step 6: Install production dependencies
echo "📦 Installing production dependencies..."
cd "$PROJECT_ROOT/backend"
npm ci --production

echo "🎉 Deployment complete! Run the application with:"
echo "    cd $PROJECT_ROOT/backend && npm start"