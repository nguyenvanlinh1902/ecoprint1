import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Cấu hình cổng
const fePort = process.env.FRONTEND_PORT || 3000;
const bePort = 5011; // Cập nhật theo firebase.json

// Cấu hình proxy
const proxyOptions = {
  target: `http://127.0.0.1:5011`,
  changeOrigin: false,
  secure: true,
  ws: false,
  configure: (proxy, _options) => {
    proxy.on('error', (err, _req, _res) => {
      console.log('proxy error', err);
    });
    proxy.on('proxyReq', (proxyReq, req, _res) => {
      console.log('Sending Request to the Target:', req.method, req.url);
    });
    proxy.on('proxyRes', (proxyRes, req, _res) => {
      console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
    });
  }
};

// Các đường dẫn API cần proxy
const proxyConfig = {
  '^/api(/|(\\?.*)?$)': proxyOptions,
  '^/auth(/|(\\?.*)?$)': proxyOptions,
  '^/functions(/|(\\?.*)?$)': proxyOptions,
  '^/clientApi(/|(\\?.*)?$)': proxyOptions,
  '^/apiSa(/|(\\?.*)?$)': proxyOptions,
  '^/authSa(/|(\\?.*)?$)': proxyOptions
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
      '@functions': path.resolve(__dirname, '../functions/src')
    }
  },
  
  // Cấu hình server dev
  server: {
    host: 'localhost',
    port: 3001,
    proxy: proxyConfig
  },
  
  // Cấu hình build
  build: {
    outDir: '../../static',
    emptyOutDir: false
  }
}); 