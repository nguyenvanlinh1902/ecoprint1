import { CustomError } from '../exceptions/customError.js';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import multer from '@koa/multer';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import orderRepository from '../repositories/orderRepository.js';
import productRepository from '../repositories/productRepository.js';

const firestore = new Firestore();

/**
 * Tạo đơn hàng mới
 */
export const createOrder = async (ctx) => {
  try {
    const { email } = ctx.state.user;
    const { 
      items, 
      shippingAddress, 
      notes,
      customizations = []
    } = ctx.req.body;
    
    // Validate required fields
    if (!items || !items.length || !shippingAddress) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || typeof item.productId !== 'string' || item.productId.trim() === '') {
        ctx.status = 400;
        ctx.body = { error: 'Invalid product ID' };
        return;
      }
      if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid quantity' };
        return;
      }
    }
    
    // Start a Firestore transaction
    const result = await firestore.runTransaction(async (transaction) => {
      // Phase 1: Read all product data first
      const productData = [];
      
      for (const item of items) {
        const productRef = firestore.collection('products').doc(item.productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
        
        const product = productDoc.data();
        productData.push({
          productRef,
          product,
          item
        });
      }
      
      // Phase 2: Process data and prepare updates (no transaction writes yet)
      let subtotal = 0;
      let totalQuantity = 0;
      const orderItems = [];
      
      // Process each item
      for (const { product, item } of productData) {
        // Check stock availability if needed
        // if (product.stock < item.quantity) {
        //   throw new Error(`Not enough stock for product: ${product.name}`);
        // }
        
        // Calculate item price
        const itemPrice = product.price * item.quantity;
        subtotal += itemPrice;
        totalQuantity += item.quantity;
        
        // Prepare order item
        orderItems.push({
          productId: item.productId,
          name: product.name,
          sku: product.sku || '',
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice: itemPrice,
          customizationOptions: item.customizationOptions || [],
          printOptions: product.printOptions || null
        });
      }
      
      // Process customizations (printing, embroidery)
      let customizationTotal = 0;
      const processedCustomizations = [];
      
      for (const customization of customizations) {
        // Check if this is a valid print position
        let customizationPrice = 0;
        if (customization.type === 'PRINT' && customization.position && customization.price !== undefined) {
          customizationPrice = Number(customization.price) || 0;
        }
        
        processedCustomizations.push({
          type: customization.type || 'PRINT', // Default to 'PRINT'
          position: customization.position,
          price: customizationPrice,
          designUrl: customization.designUrl || ''
        });
        
        customizationTotal += customizationPrice;
      }
      
      // Calculate totals
      const shippingFee = 0; // Free shipping for phase 1
      const total = subtotal + customizationTotal + shippingFee;
      
      // Prepare order data
      const orderRef = firestore.collection('orders').doc();
      const orderData = {
        email: email,
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
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Phase 3: Execute all writes
      // Update stock for all products
      for (const { productRef, item } of productData) {
        transaction.update(productRef, {
          stock: FieldValue.increment(-item.quantity),
          updatedAt: new Date()
        });
      }
      
      // Create the order
      transaction.set(orderRef, orderData);
      
      return {
        orderId: orderRef.id,
        orderNumber: orderData.orderNumber,
        total
      };
    });
    
    ctx.status = 201;
    ctx.body = { 
      message: 'Order created successfully',
      ...result
    };
  } catch (error) {
    console.error('Error creating order:', error);
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
    if (!ctx.req.file) {
      ctx.status = 400;
      ctx.body = { 
        success: false, 
        message: 'No file uploaded' 
      };
      return;
    }
    
    const { email } = ctx.state.user;
    const fileBuffer = ctx.req.file.buffer;
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
        const productDoc = await firestore.collection('products').doc(record.product_id).get();
        
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
    
    await firestore.collection('order_import_batches').doc(batchId).set({
      email: email,
      createdAt: new Date(),
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
    const { email } = ctx.state.user;
    
    const batchDoc = await firestore.collection('order_import_batches').doc(batchId).get();
    
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
    if (batch.email !== email) {
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
    const { email } = ctx.state.user;
    
    // Get batch document
    const batchDoc = await firestore.collection('order_import_batches').doc(batchId).get();
    
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
    if (batchData.email !== email) {
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
    const batchWrite = firestore.batch();
    const orderRefs = [];
    
    for (const record of batchData.records) {
      // Create order in Firestore
      const orderRef = firestore.collection('orders').doc();
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
        email: email,
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
        createdAt: new Date(),
        updatedAt: new Date(),
        importBatchId: batchId
      });
      
      // Update product stock
      const productRef = firestore.collection('products').doc(record.product.id);
      batchWrite.update(productRef, {
        stock: FieldValue.increment(-record.quantity),
        updatedAt: new Date()
      });
    }
    
    // Update batch status
    batchWrite.update(firestore.collection('order_import_batches').doc(batchId), {
      status: 'processed',
      processedAt: new Date(),
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
    const { status, email, startDate, endDate, limit = 20, page = 1, search } = ctx.query;
    
    // Get user role from request header or body
    const userRole = ctx.req.headers['x-user-role'] || ctx.req.body?.role;
    
    // Ensure this endpoint is only accessible by admins
    if (userRole !== 'admin') {
      ctx.status = 403;
      ctx.body = { 
        success: false,
        message: 'Access denied. Admin role required.'
      };
      return;
    }
    
    console.log(`[Admin getAllOrders] Fetching orders with params:`, { status, email, page, limit });
    
    // Use the repository instead of direct Firestore access
    const result = await orderRepository.getAllOrders({
      status,
      email,
      startDate,
      endDate,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
      search
    });
    
    console.log(`[Admin getAllOrders] Found ${result.orders.length} orders`);
    
    ctx.status = 200;
    ctx.body = { 
      success: true,
      data: {
        orders: result.orders,
        pagination: result.pagination
      }
    };
  } catch (error) {
    console.error('[Admin getAllOrders] Error:', error);
    ctx.status = 500;
    ctx.body = { 
      success: false,
      message: 'Failed to fetch orders',
      error: error.message 
    };
  }
};

/**
 * Get orders for the current authenticated user
 */
export const getUserOrders = async (ctx) => {
  try {
    const { email } = ctx.state.user;
    const { status, limit = 20, page = 1 } = ctx.query;
    
    console.log(`[getUserOrders] Fetching orders for user ${email} with params:`, { status, page, limit });
    
    // Use the repository instead of direct Firestore access
    const result = await orderRepository.getOrdersByEmail(email, {
      status,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10)
    });
    
    ctx.status = 200;
    ctx.body = { 
      orders: result.orders,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Error getting user orders:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Lấy chi tiết đơn hàng
 */
export const getOrderDetails = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    
    // Get information about the requesting user
    const userEmail = ctx.req.headers['x-user-email'] || ctx.req.body?.email || ctx.state.user?.email;
    const userRole = ctx.req.headers['x-user-role'] || ctx.req.body?.role || ctx.state.user?.role;
    
    console.log(`[getOrderDetails] Request from ${userEmail} with role ${userRole} for order ${orderId}`);
    
    if (!orderId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Order ID is required'
      };
      return;
    }
    
    // Use repository to get order
    const order = await orderRepository.getOrderById(orderId);
    
    if (!order) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Order not found'
      };
      return;
    }
    
    // Check if the user has permission to view this order
    // Admins can view any order, regular users can only view their own orders
    const isAdmin = userRole === 'admin';
    const isOrderOwner = order.email === userEmail;
    
    if (!isAdmin && !isOrderOwner) {
      console.log(`[getOrderDetails] Access denied: ${userEmail} (${userRole}) attempted to view order for ${order.email}`);
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: 'You do not have permission to view this order'
      };
      return;
    }
    
    console.log(`[getOrderDetails] Successfully fetched order ${orderId}`);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: order
    };
  } catch (error) {
    console.error('Error getting order details:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch order details',
      error: error.message
    };
  }
};

/**
 * Update order status
 * Route: PATCH /admin/orders/:orderId/status
 */
export const updateOrderStatus = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    const { status } = ctx.req.body;
    
    if (!orderId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Order ID is required'
      };
      return;
    }
    
    if (!status) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Status is required'
      };
      return;
    }
    
    // Use repository to update order status
    const updatedOrder = await orderRepository.updateOrderStatus(orderId, status);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    };
  } catch (error) {
    console.error('Error updating order status:', error);
    ctx.status = error.message === 'Order not found' ? 404 : 500;
    ctx.body = {
      success: false,
      message: error.message === 'Order not found' ? 'Order not found' : 'Failed to update order status',
      error: error.message
    };
  }
};

/**
 * Update order tracking information
 * Route: PATCH /admin/orders/:orderId/tracking
 */
export const updateOrderTracking = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    const { carrier, trackingNumber, trackingUrl } = ctx.req.body;
    
    if (!orderId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Order ID is required'
      };
      return;
    }
    
    if (!carrier || !trackingNumber) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Carrier and tracking number are required'
      };
      return;
    }
    
    // Use repository to update tracking
    const updatedOrder = await orderRepository.updateOrderTracking(orderId, {
      carrier,
      trackingNumber,
      trackingUrl
    });
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: updatedOrder,
      message: 'Order tracking information updated successfully'
    };
  } catch (error) {
    console.error('Error updating order tracking:', error);
    ctx.status = error.message === 'Order not found' ? 404 : 500;
    ctx.body = {
      success: false,
      message: error.message === 'Order not found' ? 'Order not found' : 'Failed to update order tracking information',
      error: error.message
    };
  }
};

/**
 * Update order admin notes
 * Route: PATCH /admin/orders/:orderId/notes
 */
export const updateOrderNotes = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    const { adminNotes } = ctx.req.body;
    
    if (!orderId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Order ID is required'
      };
      return;
    }
    
    if (adminNotes === undefined) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Admin notes are required'
      };
      return;
    }
    
    // Use repository to update notes
    const updatedOrder = await orderRepository.updateOrderNotes(orderId, adminNotes);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: updatedOrder,
      message: 'Order notes updated successfully'
    };
  } catch (error) {
    console.error('Error updating order notes:', error);
    ctx.status = error.message === 'Order not found' ? 404 : 500;
    ctx.body = {
      success: false,
      message: error.message === 'Order not found' ? 'Order not found' : 'Failed to update order notes',
      error: error.message
    };
  }
};

/**
 * Update order user comments
 * Route: PATCH /orders/:orderId/comments
 */
export const updateUserOrderComments = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    
    // Debug what's in the request body
    console.log('Request body ctx.req.body:', ctx.req.body);
    
    // Get comment from ctx.req.body
    // Support both 'comment' and 'note' parameters for compatibility
    const requestBody = ctx.req.body || {};
    const comment = requestBody.comment || requestBody.note;
    
    console.log('Extracted comment:', comment);
    
    const { email, uid } = ctx.state.user;
    
    if (!orderId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Order ID is required'
      };
      return;
    }
    
    if (!comment || comment.trim() === '') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Comment content is required'
      };
      return;
    }
    
    // First verify the order exists and user has access
    const existingOrder = await orderRepository.getOrderById(orderId);
    
    if (!existingOrder) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Order not found'
      };
      return;
    }
    
    // Ensure the user has permission to add comments to this order
    if (existingOrder.email !== email && existingOrder.userId !== uid) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: 'You do not have permission to add comments to this order'
      };
      return;
    }
    
    // Use repository to add comment
    const updatedOrder = await orderRepository.addOrderComment(orderId, comment, email);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: updatedOrder,
      message: 'Order comment added successfully'
    };
  } catch (error) {
    console.error('Error adding order comment:', error);
    ctx.status = error.message === 'Order not found' ? 404 : 500;
    ctx.body = {
      success: false,
      message: error.message === 'Order not found' ? 'Order not found' : 'Failed to add order comment',
      error: error.message
    };
  }
};

/**
 * Cancel an order
 */
export const cancelOrder = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    const { email } = ctx.state.user;
    
    // Check if order exists
    const orderDoc = await firestore.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Order not found' };
      return;
    }
    
    const orderData = orderDoc.data();
    
    // Check if user owns this order
    if (orderData.email !== email) {
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
    await firestore.collection('orders').doc(orderId).update({
      status: 'cancelled',
      updatedAt: new Date()
    });
    
    // Return items to stock
    for (const item of orderData.items) {
      await firestore.collection('products').doc(item.productId).update({
        stock: FieldValue.increment(item.quantity),
        updatedAt: new Date()
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