const functions = require('firebase-functions');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const koaBody = require('koa-body');
const cors = require('@koa/cors');
const router = require('./src/routes/apiRoutes');
const { errorHandler } = require('./src/exceptions/customError');

// Khởi tạo Koa app
const app = new Koa();

// Middleware
app.use(cors());
app.use(koaBody({ 
  multipart: true,
  formidable: {
    maxFileSize: 10 * 1024 * 1024 // giới hạn 10MB
  }
}));
app.use(bodyParser());
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

// Export Firebase Cloud Function
exports.api = functions.https.onRequest(app.callback());

// Thêm các cloud function triggers nếu cần
exports.createAdminUser = functions.https.onRequest(async (req, res) => {
  const { admin } = require('./src/config/firebaseConfig');
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