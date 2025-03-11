import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Use 'terser' for production builds, but fall back to 'esbuild' if terser isn't available
    // This provides more reliability in different environments
    minify: process.env.VITE_USE_ESBUILD === 'true' ? 'esbuild' : 'terser',
    // Configure terser options for better performance/size balance
    terserOptions: { compress: { drop_console: false, passes: 1 } },
    sourcemap: false,
    // Configure splitChunks for better caching
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})