import Koa from 'koa';
import helmet from 'koa-helmet';
import { koaBody } from 'koa-body';
import corsMiddleware from '../middlewares/cors.js';
import apiRouter from "../routes/apiRoutes.js";
import logger from 'koa-logger';

const app = new Koa();

// Add request logging
app.use(logger());
app.use(corsMiddleware());

// Body parser
app.use(koaBody({
  jsonLimit: '10mb',
  formLimit: '10mb',
  textLimit: '10mb',
  json: true,
  multipart: true,
  urlencoded: true
}));

app.use(helmet({ 
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}));

// Set up API routes
const router = apiRouter();
app.use(router.routes());
app.use(router.allowedMethods());

// 404 handler
app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = {
    success: false,
    message: `Endpoint not found: ${ctx.method} ${ctx.url}`
  };
});

export default app;