/**
 * Fallback build script for the React application
 * This generates a minimal build that can be served if the main build process fails
 */
const fs = require('fs');
const path = require('path');

// Ensure the dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a minimal HTML file
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Order Management System</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background-color: #005ea8;
      color: white;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 2rem;
    }
    h1 {
      margin: 0;
    }
    .card {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .status {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: bold;
    }
    .status-uploaded { background-color: #ffeeba; color: #856404; }
    .status-confirmed { background-color: #b8daff; color: #004085; }
    .status-shipped { background-color: #c3e6cb; color: #155724; }
    .status-delivered { background-color: #d4edda; color: #155724; }
    .btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      background-color: #005ea8;
      color: white;
      text-decoration: none;
      cursor: pointer;
      font-weight: 500;
    }
    .btn:hover {
      background-color: #004b87;
    }
    .footer {
      margin-top: 3rem;
      border-top: 1px solid #ddd;
      padding-top: 1rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <header>
    <h1>Purchase Order Management System</h1>
  </header>
  
  <main>
    <div class="card">
      <h2>Fallback Application</h2>
      <p>This is a minimal fallback version of the Purchase Order Management System. The full React application could not be built.</p>
      <p>Please check the build logs for more information or contact your administrator.</p>
      
      <h3>Common Actions</h3>
      <ul>
        <li><a href="/api/po">View API Data</a></li>
        <li><a href="#" class="btn">Refresh Data</a></li>
      </ul>
    </div>
    
    <div class="card">
      <h2>Recent Purchase Orders</h2>
      <div id="po-list">
        <div class="po-item">
          <h3>PO#12345678 <span class="status status-confirmed">Confirmed</span></h3>
          <p>Ordered: Jan 15, 2025 | Buyer: Acme Corp | $12,450.00</p>
        </div>
        <div class="po-item">
          <h3>PO#87654321 <span class="status status-shipped">Shipped</span></h3>
          <p>Ordered: Jan 12, 2025 | Buyer: Global Industries | $8,275.50</p>
        </div>
      </div>
    </div>
  </main>
  
  <div class="footer">
    Purchase Order Management System &copy; 2025
  </div>

  <script>
    // Basic JavaScript to simulate API functionality
    document.addEventListener('DOMContentLoaded', function() {
      // Add click handler for refresh button
      document.querySelector('.btn').addEventListener('click', function(e) {
        e.preventDefault();
        alert('API connection not available in fallback mode');
      });
    });
  </script>
</body>
</html>`;

// Write the HTML file to the dist directory
fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);

// Create an empty assets directory
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('🔄 Fallback build created successfully in the dist directory');