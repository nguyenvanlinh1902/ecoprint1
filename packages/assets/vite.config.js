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
      secure: false,
      ws: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      configure: (proxy, options) => {
        proxy.on('error', (err, req, res) => {
          console.log('proxy error', err);
          // Provide a better error response to the client
          if (res.writeHead && !res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'Proxy error', 
              message: 'Failed to connect to backend server',
              details: err.message
            }));
          }
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
      }),

      // Network connectivity check plugin
      {
        name: 'network-connectivity-check',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Check if server is healthy
            if (req.url === '/__network_check') {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'ok', env: mode }));
              return;
            }
            next();
          });
        }
      }
    ],
    
    // Optimization configuration
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@mui/icons-material',
        '@mui/system',
        '@emotion/react',
        '@emotion/styled',
        'prop-types'
      ],
      esbuildOptions: {
        loader: {
          '.js': 'jsx'
        }
      }
    },
    
    // Path aliases
    resolve: {
      extensions: ['.js', '.jsx', '.json'],
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
        '@functions': path.resolve(__dirname, '../functions/src'),
        '@api': path.resolve(__dirname, './src/api'),
        '@assets': path.resolve(__dirname, './src')
      }
    },
    
    // Dev server configuration - only used in development
    server: isProd ? undefined : {
      host: true, // Listen on all addresses
      port: fePort,
      strictPort: false, // Try another port if the specified one is in use
      proxy: proxyConfig,
      cors: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: fePort,
        clientPort: fePort,
        timeout: 5000,
        overlay: true
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      fs: {
        strict: false,
        allow: ['..']
      },
      // Add middleware to handle preflight OPTIONS requests
      middlewares: [
        (req, res, next) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Access-Control-Max-Age', '86400');
            res.statusCode = 204;
            res.end();
            return;
          }
          next();
        }
      ]
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
          drop_console: false, // Keep console logs for debugging
          drop_debugger: true
        }
      } : undefined,
      // Chunk size optimization
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          globals: {
            'process.env.NODE_ENV': JSON.stringify(mode)
          },
          // Extract third-party libraries to the vendor chunk
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', '@mui/material'],
          }
        }
      }
    }
  };
}); 