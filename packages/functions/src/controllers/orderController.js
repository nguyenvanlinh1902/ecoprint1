import { CustomError } from '../exceptions/customError.js';
import { admin, db } from '../config/firebase.js';
import multer from '@koa/multer';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tạo đơn hàng mới
 */
export const createOrder = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { 
      items, 
      shippingAddress, 
      notes,
      customizations = []
    } = ctx.request.body;
    
    // Validate required fields
    if (!items || !items.length || !shippingAddress) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    // Calculate order details and validate items
    let subtotal = 0;
    let totalQuantity = 0;
    const orderItems = [];
    
    // Process each item
    for (const item of items) {
      // Get product from database
      const productDoc = await db.collection('products').doc(item.productId).get();
      
      if (!productDoc.exists) {
        ctx.status = 400;
        ctx.body = { error: `Product with ID ${item.productId} not found` };
        return;
      }
      
      const product = productDoc.data();
      
      // Check stock availability
      if (product.stock < item.quantity) {
        ctx.status = 400;
        ctx.body = { error: `Not enough stock for product: ${product.name}` };
        return;
      }
      
      // Calculate item price
      const itemPrice = product.price * item.quantity;
      subtotal += itemPrice;
      totalQuantity += item.quantity;
      
      // Prepare order item
      orderItems.push({
        productId: item.productId,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemPrice,
        customizationOptions: item.customizationOptions || []
      });
      
      // Update product stock
      await db.collection('products').doc(item.productId).update({
        stock: admin.firestore.FieldValue.increment(-item.quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Process customizations (printing, embroidery)
    let customizationTotal = 0;
    const processedCustomizations = [];
    
    for (const customization of customizations) {
      processedCustomizations.push({
        type: customization.type, // 'PRINT' or 'EMBROIDERY'
        position: customization.position,
        price: customization.price,
        designUrl: customization.designUrl
      });
      
      customizationTotal += customization.price;
    }
    
    // Calculate totals
    const shippingFee = 0; // Free shipping for phase 1
    const total = subtotal + customizationTotal + shippingFee;
    
    // Create order in database
    const orderRef = db.collection('orders').doc();
    await orderRef.set({
      userId: uid,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      items: orderItems,
      customizations: processedCustomizations,
      subtotal,
      customizationTotal,
      shippingFee,
      total,
      totalQuantity,
      shippingAddress,
      notes: notes || '',
      status: 'pending', // pending, confirmed, processing, shipping, delivered, cancelled
      paymentStatus: 'unpaid', // unpaid, paid
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 201;
    ctx.body = { 
      message: 'Order created successfully',
      orderId: orderRef.id,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      total
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Upload và validate file CSV để import orders
 */
export const importOrders = async (ctx) => {
  try {
    // Check if file exists in request
    if (!ctx.request.file) {
      ctx.status = 400;
      ctx.body = { 
        success: false, 
        message: 'No file uploaded' 
      };
      return;
    }
    
    const { uid } = ctx.state.user;
    const fileBuffer = ctx.request.file.buffer;
    const fileContent = fileBuffer.toString();
    
    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Validate records
    const validationResults = {
      total: records.length,
      valid: 0,
      invalid: 0,
      issues: []
    };
    
    const validRecords = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 because 1st row is header and rows are 1-indexed
      
      try {
        // Validate required fields
        if (!record.product_id) {
          throw new Error('Product ID is required');
        }
        
        if (!record.quantity || isNaN(parseInt(record.quantity)) || parseInt(record.quantity) <= 0) {
          throw new Error('Quantity must be a positive number');
        }
        
        if (!record.recipient_name) {
          throw new Error('Recipient name is required');
        }
        
        if (!record.address) {
          throw new Error('Address is required');
        }
        
        if (!record.city) {
          throw new Error('City is required');
        }
        
        if (!record.state) {
          throw new Error('State is required');
        }
        
        if (!record.zip_code) {
          throw new Error('ZIP code is required');
        }
        
        // Validate product exists and has enough stock
        const productDoc = await db.collection('products').doc(record.product_id).get();
        
        if (!productDoc.exists) {
          throw new Error(`Product with ID ${record.product_id} not found`);
        }
        
        const product = productDoc.data();
        
        if (product.stock < parseInt(record.quantity)) {
          throw new Error(`Not enough stock for product: ${product.name}. Available: ${product.stock}, Requested: ${record.quantity}`);
        }
        
        // Record is valid
        validationResults.valid++;
        validRecords.push({
          ...record,
          product: {
            id: productDoc.id,
            name: product.name,
            price: product.price
          },
          quantity: parseInt(record.quantity)
        });
      } catch (error) {
        validationResults.invalid++;
        validationResults.issues.push({
          row: rowNum,
          message: error.message,
          details: JSON.stringify(record)
        });
      }
    }
    
    // Store valid records in a temporary collection for later processing
    const batchId = uuidv4();
    
    await db.collection('order_import_batches').doc(batchId).set({
      userId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      validationResults,
      records: validRecords
    });
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'File uploaded and validated',
      data: {
        batchId,
        validationResults
      }
    };
  } catch (error) {
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to process import file',
      error: error.message
    };
  }
};

/**
 * Middleware for uploading CSV files
 */
export const uploadCsvMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
}).single('file');

/**
 * Lấy thông tin chi tiết một batch import
 */
export const getBatchImportOrders = async (ctx) => {
  try {
    const { batchId } = ctx.params;
    const { uid } = ctx.state.user;
    
    const batchDoc = await db.collection('order_import_batches').doc(batchId).get();
    
    if (!batchDoc.exists) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Batch not found'
      };
      return;
    }
    
    const batch = batchDoc.data();
    
    // Check if user owns this batch
    if (batch.userId !== uid) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: 'Access denied'
      };
      return;
    }
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: batch
    };
  } catch (error) {
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to get batch import details',
      error: error.message
    };
  }
};

/**
 * Confirm và process batch import orders
 */
export const confirmBatchImport = async (ctx) => {
  try {
    const { batchId } = ctx.params;
    const { uid } = ctx.state.user;
    
    // Get batch document
    const batchDoc = await db.collection('order_import_batches').doc(batchId).get();
    
    if (!batchDoc.exists) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Batch not found'
      };
      return;
    }
    
    const batchData = batchDoc.data();
    
    // Check if user owns this batch
    if (batchData.userId !== uid) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: 'Access denied'
      };
      return;
    }
    
    // Check if batch is already processed
    if (batchData.status === 'processed') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Batch is already processed'
      };
      return;
    }
    
    // Process each valid record
    const batchWrite = db.batch();
    const orderRefs = [];
    
    for (const record of batchData.records) {
      // Create order in Firestore
      const orderRef = db.collection('orders').doc();
      orderRefs.push(orderRef.id);
      
      // Construct shipping address
      const shippingAddress = {
        recipientName: record.recipient_name,
        address: record.address,
        city: record.city,
        state: record.state,
        zipCode: record.zip_code,
        phone: record.phone || '',
      };
      
      // Create order
      batchWrite.set(orderRef, {
        userId: uid,
        status: 'pending',
        items: [
          {
            productId: record.product.id,
            name: record.product.name,
            price: record.product.price,
            quantity: record.quantity,
            totalPrice: record.product.price * record.quantity
          }
        ],
        subtotal: record.product.price * record.quantity,
        shippingCost: 0, // Default to 0, can be updated later
        total: record.product.price * record.quantity,
        shippingAddress,
        shippingMethod: record.shipping_method || 'standard',
        notes: record.additional_requirements || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        importBatchId: batchId
      });
      
      // Update product stock
      const productRef = db.collection('products').doc(record.product.id);
      batchWrite.update(productRef, {
        stock: admin.firestore.FieldValue.increment(-record.quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Update batch status
    batchWrite.update(db.collection('order_import_batches').doc(batchId), {
      status: 'processed',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      orderIds: orderRefs
    });
    
    // Commit batch
    await batchWrite.commit();
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Batch processed successfully',
      data: {
        orderCount: orderRefs.length,
        orderIds: orderRefs
      }
    };
  } catch (error) {
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to process batch import',
      error: error.message
    };
  }
};

/**
 * Get all orders for admin
 */
export const getAllOrders = async (ctx) => {
  try {
    const { status, userId, startDate, endDate, limit = 20, page = 1 } = ctx.query;
    
    let query = db.collection('orders');
    
    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    // Apply date range if both start and end dates are provided
    if (startDate && endDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate));
      
      query = query.where('createdAt', '>=', startTimestamp)
                   .where('createdAt', '<=', endTimestamp);
    }
    
    // Count total for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.orderBy('createdAt', 'desc')
                .limit(parseInt(limit))
                .offset(offset);
                
    const ordersSnapshot = await query.get();
    const orders = [];
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      orders.push({
        id: doc.id,
        ...orderData,
        createdAt: orderData.createdAt ? orderData.createdAt.toDate() : null,
        updatedAt: orderData.updatedAt ? orderData.updatedAt.toDate() : null
      });
    });
    
    ctx.status = 200;
    ctx.body = { 
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Get orders for the current authenticated user
 */
export const getUserOrders = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { status, limit = 20, page = 1 } = ctx.query;
    
    let query = db.collection('orders').where('userId', '==', uid);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Count total for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.orderBy('createdAt', 'desc')
                .limit(parseInt(limit))
                .offset(offset);
                
    const ordersSnapshot = await query.get();
    const orders = [];
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      orders.push({
        id: doc.id,
        ...orderData,
        createdAt: orderData.createdAt ? orderData.createdAt.toDate() : null,
        updatedAt: orderData.updatedAt ? orderData.updatedAt.toDate() : null
      });
    });
    
    ctx.status = 200;
    ctx.body = { 
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Lấy chi tiết đơn hàng
 */
export const getOrderDetails = async (ctx) => {
  ctx.body = {
    success: true,
    data: {}
  };
};

/**
 * Update the status of an order
 */
export const updateOrderStatus = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    const { status } = ctx.request.body;
    
    if (!status) {
      ctx.status = 400;
      ctx.body = { error: 'Status is required' };
      return;
    }
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid status' };
      return;
    }
    
    // Check if order exists
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Order not found' };
      return;
    }
    
    // Update order status
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 200;
    ctx.body = { message: 'Order status updated successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Cancel an order
 */
export const cancelOrder = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    const { uid } = ctx.state.user;
    
    // Check if order exists
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Order not found' };
      return;
    }
    
    const orderData = orderDoc.data();
    
    // Check if user owns this order
    if (orderData.userId !== uid) {
      ctx.status = 403;
      ctx.body = { error: 'Not authorized to cancel this order' };
      return;
    }
    
    // Check if order can be cancelled
    if (orderData.status !== 'pending') {
      ctx.status = 400;
      ctx.body = { error: 'Only pending orders can be cancelled' };
      return;
    }
    
    // Update order status
    await db.collection('orders').doc(orderId).update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Return items to stock
    for (const item of orderData.items) {
      await db.collection('products').doc(item.productId).update({
        stock: admin.firestore.FieldValue.increment(item.quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    ctx.status = 200;
    ctx.body = { message: 'Order cancelled successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Get order details by ID
 * Route: GET /orders/:orderId
 */
export const getOrderById = async (ctx) => {
  try {
    // This function maps to getOrderDetails which is what we have implementation for
    return await getOrderDetails(ctx);
  } catch (error) {
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch order details'
    };
  }
}; 