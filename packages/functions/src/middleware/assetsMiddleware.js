import path from 'path';
import { promises as fs } from 'fs';

/**
 * Middleware to serve static assets in development mode
 * and handle SPA routing
 */
const assetsMiddleware = () => {
  return async (ctx, next) => {
    // Skip API routes
    if (ctx.path.startsWith('/api')) {
      return next();
    }

    try {
      // In production, serve from static directory
      const staticDir = path.resolve('../../../static');
      const requestPath = ctx.path === '/' ? '/index.html' : ctx.path;
      const filePath = path.join(staticDir, requestPath);

      try {
        // Try to serve the requested file
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          // If file exists, serve it
          ctx.type = path.extname(filePath);
          ctx.body = await fs.readFile(filePath);
          return;
        }
      } catch (e) {
        // File doesn't exist, serve index.html for SPA routing
        if (e.code === 'ENOENT') {
          const indexPath = path.join(staticDir, 'index.html');
          try {
            ctx.type = 'html';
            ctx.body = await fs.readFile(indexPath);
            return;
          } catch (indexError) {
            // If index.html doesn't exist, proceed to next middleware
            console.error('Error serving index.html:', indexError);
          }
        }
      }
    } catch (error) {
      console.error('Error in assets middleware:', error);
    }

    return next();
  };
};

export default assetsMiddleware; 