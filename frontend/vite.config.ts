import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { ModuleFormat } from 'rollup'

// Get environment variables from process.env during build config
const useEsbuild = process.env.VITE_USE_ESBUILD === 'true'

// Define vendor dependencies for manual chunking
const vendorDependencies = [
  'react', 
  'react-dom', 
  'react-router-dom',
  '@reduxjs/toolkit',
  'react-redux',
  'axios'
]

// Define charting dependencies for manual chunking
const chartingDependencies = [
  'd3',
  'chart.js',
  'leaflet'
]

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Use root path for production deployment
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 500, // Set the chunk size warning limit
    // Use 'terser' for production builds by default
    minify: useEsbuild ? 'esbuild' : 'terser',
    terserOptions: { compress: { drop_console: false, passes: 1 } }, // Configure terser options
    sourcemap: true, // Enable source maps to help with debugging
    // Configure code splitting for better caching and performance
    rollupOptions: {
      output: {
        manualChunks: (id: string): string | void => {
          // Group vendor dependencies
          if (vendorDependencies.some(dep => id.includes(`/node_modules/${dep}`))) {
            return 'vendor'
          }
          
          // Group charting and visualization libraries
          if (chartingDependencies.some(dep => id.includes(`/node_modules/${dep}`))) {
            return 'charts'
          }
          
          // Dynamic imports for route-based code splitting are handled automatically
        },
        // Improve output format
        format: 'es' as ModuleFormat,
        // Optimize entry points
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js'
        }
      }
    }
  }
)