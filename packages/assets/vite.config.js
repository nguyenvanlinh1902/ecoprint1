import { defineConfig, transformWithEsbuild, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import EnvironmentPlugin from 'vite-plugin-environment';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const mode = process.env.NODE_ENV || 'development';
const isProd = mode === 'production';
const host = process.env.HOST ? process.env.HOST.replace(/https?:\/\//, '') : 'localhost';
const fePort = process.env.FRONTEND_PORT || 3001;
const bePort = process.env.BACKEND_PORT || 5001;

const hmrConfig = {
  protocol: 'ws',
  host: 'localhost',
  port: fePort,
  clientPort: fePort,
  overlay: true
};

const proxyOptions = {
  target: `http://127.0.0.1:${bePort}`,
  changeOrigin: true,
  secure: false,
  ws: true,
  configure: (proxy, options) => {
    proxy.on('error', (err, req, res) => {
      console.log('proxy error', err);
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
      proxyReq.setHeader('Access-Control-Allow-Origin', '*');
      proxyReq.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS');
      proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    });
    proxy.on('proxyRes', (proxyRes, req, res) => {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
    });
  }
};

const proxyConfig = {
  '^/api(/|(\\?.*)?$)': proxyOptions,
  '^/auth(/|(\\?.*)?$)': proxyOptions,
  '^/apiSa(/|(\\?.*)?$)': proxyOptions,
  '^/proxy(/|(\\?.*)?$)': proxyOptions,
};

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.IS_EMBEDDED_APP': JSON.stringify(process.env.IS_EMBEDDED_APP || 'no')
  },
  plugins: [
    nodePolyfills(),
    EnvironmentPlugin(
      {
        NODE_ENV: mode,
        HOST: host,
        FRONTEND_PORT: fePort,
        BACKEND_PORT: bePort,
        IS_EMBEDDED_APP: 'no'
      },
      {
        loadEnvFiles: true
      }
    ),
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
    react({
      jsxRuntime: 'automatic',
      fastRefresh: !isProd
    })
  ],
  optimizeDeps: {
    force: true,
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
      },
      define: {
        global: 'globalThis'
      }
    }
  },
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
  server: {
    host: 'localhost',
    port: fePort,
    strictPort: false,
    proxy: proxyConfig,
    hmr: hmrConfig,
    cors: true,
    watch: {
      usePolling: true,
      interval: 1000
    },
    fs: {
      strict: false,
      allow: ['..']
    }
  },
  build: {
    outDir: '../../static',
    emptyOutDir: false,
    sourcemap: !isProd,
    minify: isProd ? 'terser' : false,
    terserOptions: isProd ? {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    } : undefined,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@mui/material']
        }
      }
    }
  }
}); 