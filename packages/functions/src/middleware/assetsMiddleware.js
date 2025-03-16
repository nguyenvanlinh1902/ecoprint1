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
      // Fix the static directory path to use the workspace root
      const staticDir = path.resolve(process.cwd(), '../..', 'static');
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
            // Silent error - proceed to next middleware
          }
        }
      }
    } catch (error) {
      // Silent error handling
    }

    return next();
  };
};

export default assetsMiddleware; 