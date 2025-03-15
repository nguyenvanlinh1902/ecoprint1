import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Cấu hình cổng
const fePort = process.env.FRONTEND_PORT || 3001;

// Base URL cho backend
const backendBaseUrl = 'http://localhost:5001/ecoprint1-3cd5c/us-central1/backend';

// Cấu hình proxy đơn giản hơn
const proxyConfig = {
  '/api': backendBaseUrl
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
    react()
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
    proxy: proxyConfig
  },
  
  // Cấu hình build
  build: {
    outDir: '../../static',
    emptyOutDir: false
  }
}); 