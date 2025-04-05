import App from 'koa';
import cors from '@koa/cors';
import { koaBody } from 'koa-body';
import errorRepository from '../repositories/errorRepository.js';
import render from 'koa-ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from '../routes/apiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

const app = new App();
app.proxy = true;

render(app, {
  cache: isProd,  // Enable cache in production
  debug: !isProd, // Disable debug in production
  layout: false,
  root: path.resolve(__dirname, '../../../views'),
  viewExt: 'html'
});


app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400
}));

app.use(apiRoutes.allowedMethods());
app.use(apiRoutes.routes());

app.on('error', errorRepository.handleError);

export default app;