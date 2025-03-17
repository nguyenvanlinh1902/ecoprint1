import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Port configuration
const fePort = process.env.FRONTEND_PORT || 3001;

// Base URL for backend - use the environment variable or fall back to the default
const backendBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api';

// Simplified proxy configuration
const proxyConfig = {
  '/api': {
    target: backendBaseUrl,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  // Set public directory
  publicDir: 'public',
  
  // Define any global constants here if needed
  define: {
    // Empty for now, using CONFIG from env.js instead
  },
  
  plugins: [
    // Plugin to handle .js files as .jsx
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/)) return null;

        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic'
        });
      }
    },
    
    // React plugin
    react({
      // Enable Fast Refresh
      fastRefresh: true,
    })
  ],
  
  // Optimization configuration
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  
  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@services': path.resolve(__dirname, './src/services'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@helpers': path.resolve(__dirname, './src/helpers'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@resources': path.resolve(__dirname, './src/resources'),
      '@config': path.resolve(__dirname, './src/config'),
      '@const': path.resolve(__dirname, './src/const'),
      '@functions': path.resolve(__dirname, '../functions/src')
    }
  },
  
  // Dev server configuration
  server: {
    host: true, // Listen on all addresses
    port: fePort,
    strictPort: false, // Try another port if the specified one is in use
    proxy: proxyConfig,
    cors: true,
    hmr: true,
  },
  
  // Build configuration
  build: {
    outDir: '../../static',
    emptyOutDir: false,
    // Generate source maps for easier debugging
    sourcemap: true
  }
}); 