import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Cấu hình cổng
const fePort = process.env.FRONTEND_PORT || 3001;

// Base URL cho backend - use the environment variable or fall back to the default
const backendBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api';

// Cấu hình proxy đơn giản hơn
const proxyConfig = {
  '/api': {
    target: backendBaseUrl,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Plugin để xử lý file .js như .jsx
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
    
    // Plugin React
    react({
      // Enable Fast Refresh
      fastRefresh: true,
    })
  ],
  
  // Cấu hình optimization
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  
  // Alias đường dẫn
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
  
  // Cấu hình server dev
  server: {
    host: 'localhost',
    port: fePort,
    proxy: proxyConfig,
    // Preserve the history state for React Router
    historyApiFallback: true,
    // Reload all pages across all views
    hmr: {
      // Ensure HMR preserves the page state
      overlay: true,
      // Don't lose client state on reload
      clientPort: fePort
    }
  },
  
  // Cấu hình build
  build: {
    outDir: '../../static',
    emptyOutDir: false,
    // Generate source maps for easier debugging
    sourcemap: true,
  }
}); 