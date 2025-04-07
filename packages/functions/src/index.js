import * as functions from 'firebase-functions';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import { koaBody } from 'koa-body';
import apiRouter from './routes/apiRoutes.js';
import corsMiddleware from './middleware/cors.js';
import apiHandler from './handlers/api.js';

// Create Koa app
const app = new Koa();

// Apply middlewares
app.use(logger()); // Log all requests
app.use(corsMiddleware()); // Apply CORS middleware
app.use(bodyParser()); // Parse JSON bodies

// Api function - đúng cấu hình với koa
export const api = functions.https.onRequest((req, res) => {
  apiHandler.callback()(req, res);
});
