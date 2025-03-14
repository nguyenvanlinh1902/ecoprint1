import * as functions from 'firebase-functions';
import cors from '@koa/cors';
import Koa from 'koa';
import router from './src/routes/apiRoutes.js';
import { errorHandler } from './src/exceptions/customError.js';
import getRawBody from 'raw-body';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Khởi tạo Koa app
const app = new Koa();

// Middleware
app.use(cors());

// Middleware tùy chỉnh để xử lý request body thay thế cho koaBody và bodyParser
app.use(async (ctx, next) => {
  // Chỉ xử lý các phương thức có thể chứa body
  if (['POST', 'PUT', 'PATCH'].includes(ctx.method)) {
    try {
      // Đọc raw body từ request stream
      const body = await getRawBody(ctx.req, {
        length: ctx.req.headers['content-length'],
        limit: '10mb',
      });

      // Xử lý body dựa trên content-type
      const contentType = ctx.get('Content-Type');
      if (contentType.includes('application/json')) {
        ctx.request.body = JSON.parse(body.toString());
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Xử lý form data đơn giản
        const params = new URLSearchParams(body.toString());
        const formData = {};
        for (const [key, value] of params) {
          formData[key] = value;
        }
        ctx.request.body = formData;
      } else {
        // Lưu raw body cho các content type khác
        ctx.request.body = body;
      }
    } catch (err) {
      ctx.throw(422, 'Unable to process request body');
    }
  }
  await next();
});

app.use(errorHandler);

// Routes
app.use(router.routes()).use(router.allowedMethods());

// 404 handler
app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = {
    success: false,
    error: {
      code: 'ERR_NOT_FOUND',
      message: 'Route not found'
    }
  };
});

// Exports cho Firebase Cloud Functions
export const api = functions.https.onRequest(app.callback());

// Thêm các cloud function triggers khác từ mẫu
export const createAdminUser = functions.https.onRequest(async (req, res) => {
  const { admin } = await import('./src/config/firebaseConfig.js');
  const email = req.query.email;
  const password = req.query.password;
  
  if (!email || !password) {
    res.status(400).send('Email and password required');
    return;
  }
  
  try {
    // Tạo user trong Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: 'Administrator'
    });
    
    // Chuẩn bị dữ liệu cho Firestore
    const userData = {
      email,
      companyName: 'Admin Company',
      phone: '0123456789',
      role: 'admin',
      status: 'active',
      balance: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Lưu vào Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);
    
    res.status(200).send(`Admin user created successfully: ${userRecord.uid}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Thêm các handlers từ mẫu của bạn
// import apiHandler from './handlers/api.js';
// import apiSaHandler from './handlers/apiSa.js';
// import authHandler from './handlers/auth.js';
// import authSaHandler from './handlers/authSa.js';
// import clientApiHandler from './handlers/clientApi.js';
// import subscribeBackgroundHandling from './handlers/pubsub/subscribeBackgroundHandling.js';
// import onCreateShopHandler from './handlers/onCreateShop.js';

// export const apiSa = functions.https.onRequest(apiSaHandler.callback());
// export const clientApi = functions.https.onRequest(clientApiHandler.callback());

// export const auth = functions
//   .runWith({memory: '4GB'})
//   .region('us-central1', 'us-east1', 'europe-west2', 'asia-northeast1')
//   .https.onRequest(authHandler.callback());
// export const authSa = functions.https.onRequest(authSaHandler.callback());

// // ---------------------- Pub/Sub Handlers ----------------------
// export const backgroundHandling = functions
//   .runWith({timeoutSeconds: 30, memory: '2GB'})
//   .pubsub.topic('backgroundHandling')
//   .onPublish(subscribeBackgroundHandling);

// // ---------------------- Firestore Handlers ----------------------
// export const onCreateUser = functions
//   .runWith({memory: '256MB'})
//   .firestore.document('shops/{shopId}')
//   .onCreate(onCreateShopHandler); 