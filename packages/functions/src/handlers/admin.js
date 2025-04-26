import Koa from 'koa';
import render from 'koa-ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { verifyRequest } from '../middlewares/authMiddleware.js';
import adminRouter from '../routes/apiAdmin.js';

// Create dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const adminApi = new Koa();
adminApi.proxy = true;

render(adminApi, {
  cache: true,
  debug: false,
  layout: false,
  root: path.resolve(__dirname, '../../views'),
  viewExt: 'html'
});

adminApi.use(verifyRequest());

const router = adminRouter();

adminApi.use(router.routes());
adminApi.use(router.allowedMethods());

export default adminApi;
