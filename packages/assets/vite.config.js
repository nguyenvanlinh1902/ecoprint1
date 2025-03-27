import { defineConfig, transformWithEsbuild, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Môi trường - phát triển hoặc sản xuất
const mode = process.env.NODE_ENV || 'development';
const isProd = mode === 'production';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd());
  
  // Port configuration
  const fePort = process.env.FRONTEND_PORT || 3001;

  // Base URL for backend - use the environment variable or fall back to the default
  const backendBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api';

  // Simplified proxy configuration - only used in development
  const proxyConfig = isProd ? {} : {
    '/api': {
      target: backendBaseUrl,
      changeOrigin: true,
      secure: true,
      rewrite: (path) => path.replace(/^\/api/, '/api'),
      configure: (proxy, options) => {
        proxy.on('error', (err, req, res) => {
          console.log('proxy error', err);
        });
        proxy.on('proxyReq', (proxyReq, req, res) => {
          // Thêm headers CORS
          proxyReq.setHeader('Access-Control-Allow-Origin', '*');
          proxyReq.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS');
          proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
          console.log('Sending Request to the Target:', req.method, req.url);
        });
        proxy.on('proxyRes', (proxyRes, req, res) => {
          // Thêm headers CORS vào response
          proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS';
          proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
          console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
        });
      }
    }
  };

  return {
    // Set public directory
    publicDir: 'public',
    
    // Define any global constants here if needed
    define: {
      __APP_ENV__: JSON.stringify(mode),
      __VITE_API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || backendBaseUrl)
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
        // Enable Fast Refresh in dev mode only
        fastRefresh: !isProd,
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
    
    // Dev server configuration - only used in development
    server: isProd ? undefined : {
      host: true, // Listen on all addresses
      port: fePort,
      strictPort: false, // Try another port if the specified one is in use
      proxy: proxyConfig,
      cors: true,
      hmr: true,
    },
    
    // Build configuration - optimized for production
    build: {
      outDir: '../../static',
      emptyOutDir: false,
      // Generate source maps in development only
      sourcemap: !isProd,
      // Production optimizations
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined,
      // Chunk size optimization
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            mui: ['@mui/material', '@mui/icons-material', '@mui/lab', '@mui/x-data-grid']
          }
        }
      }
    }
  };
}); 