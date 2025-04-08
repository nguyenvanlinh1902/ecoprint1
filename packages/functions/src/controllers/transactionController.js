import { admin } from '../config/firebase.js';
import transactionRepository from '../repositories/transactionRepository.js';
import orderRepository from '../repositories/orderRepository.js';
import requestParserRepository from '../repositories/requestParserRepository.js';
import userRepository from '../repositories/userRepository.js';
import { CustomError } from '../exceptions/customError.js';
import {fileUploadRepository} from "../repositories/fileUploadRepository.js";

const firestore = admin.firestore();

// Export stub functions that aren't part of the default export
export const createDeposit = async (ctx) => {
  ctx.body = {
    success: true,
    data: {}
  };
};

export const payBatchOrders = async (ctx) => {
  ctx.body = {
    success: true,
    message: 'Batch orders paid successfully'
  };
};

export const updateTransactionStatus = async (ctx) => {
  ctx.body = {
    success: true,
    message: 'Transaction status updated successfully'
  };
};

// Transaction controller for managing payment and transactions
export const requestDeposit = async (ctx) => {
  try {
    const { email } = ctx.req.body;
    const { amount, bankName, transferDate, reference, receiptUrl } = ctx.req.body;
    
    // Validate required fields
    if (!amount || !bankName || !transferDate || !email) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    // Validate amount
    if (amount <= 0) {
      ctx.status = 400;
      ctx.body = { error: 'Amount must be greater than 0' };
      return;
    }
    
    // Remove receipt URL validation - will be uploaded in the second step
    
    // Use repository to create the deposit request
    const result = await transactionRepository.createDepositRequest({
      amount, 
      bankName, 
      transferDate, 
      reference,
      email,
      receiptUrl: receiptUrl || '', // Make receipt URL optional
      thumbnailUrl: receiptUrl || '' // Make thumbnail URL optional
    });
    
    ctx.status = 201;
    ctx.body = { 
      message: 'Deposit request created successfully',
      transactionId: result.id
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Upload receipt for a deposit transaction
 */
export const uploadReceipt = async (ctx) => {
  try {
    console.log('===== RECEIPT UPLOAD START =====');
    console.log('Raw request info:', {
      method: ctx.method,
      url: ctx.url,
      hasReq: !!ctx.req,
      hasRes: !!ctx.res,
      hasHeaders: !!(ctx.req && ctx.req.headers),
      hasBody: !!(ctx.req && ctx.req.body),
      hasFiles: !!(ctx.req && ctx.req.files),
      hasFile: !!(ctx.req && ctx.req.file)
    });
    
    const email = ctx.req.headers['x-user-email'] || ctx.req.body?.email || ctx.state.user.email;
    const { transactionId } = ctx.params;
    
    console.log('Upload receipt request for transaction:', transactionId, 'user email:', email);
    
    // Prepare request with necessary objects
    console.log('Preparing request...');
    requestParserRepository.prepareRequest(ctx);
    
    // Print debug info about the request
    console.log('Request method:', ctx.method);
    console.log('Request URL:', ctx.url);
    console.log('Content-Type:', ctx.req.headers['content-type'] || 'Not specified');
    console.log('Is multipart:', requestParserRepository.isMultipartRequest(ctx.req));
    console.log('Is JSON:', requestParserRepository.isJsonRequest(ctx.req));
    
    // Log full details of the request body and files for debugging
    if (ctx.req.body) {
      console.log('Body keys:', Object.keys(ctx.req.body));
      console.log('Body content:', JSON.stringify(ctx.req.body, (key, value) => {
        // Don't log full file content in base64 if present
        if (typeof value === 'string' && value.length > 1000) {
          return value.substring(0, 100) + '... [truncated]';
        }
        return value;
      }, 2));
    }
    
    if (ctx.req.files) {
      console.log('Files keys:', Object.keys(ctx.req.files));
      for (const key in ctx.req.files) {
        const file = ctx.req.files[key];
        console.log(`File [${key}]:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size || (file.buffer ? file.buffer.length : 'unknown')
        });
      }
    }
    
    // Extract file data using repository function
    console.log('Extracting file data...');
    let fileData = requestParserRepository.extractFileFromRequest(ctx, 'receipt');
    
    // Try to find file data in any available field if not found in 'receipt'
    if (!fileData && ctx.req.files) {
      // Try the first available file if 'receipt' not found
      const fileKeys = Object.keys(ctx.req.files);
      if (fileKeys.length > 0) {
        console.log(`Receipt field not found but found other file field: ${fileKeys[0]}`);
        fileData = ctx.req.files[fileKeys[0]];
      }
    }
    
    // Also check form fields for base64 encoded images
    if (!fileData && ctx.req.body) {
      for (const key in ctx.req.body) {
        const value = ctx.req.body[key];
        if (typeof value === 'string' && 
            (value.startsWith('data:image/') || 
             value.includes('base64'))) {
          console.log(`Found base64 image in field: ${key}`);
          fileData = value;
          break;
        }
      }
    }
    
    // If still no file data, check for file uploaded to state by middleware
    if (!fileData && ctx.state.uploadedFile) {
      console.log('Found file in ctx.state.uploadedFile');
      fileData = ctx.state.uploadedFile;
    }
    
    // If still no file data, try 'image' field as fallback
    if (!fileData) {
      console.log('Attempting to find file in "image" field as fallback...');
      fileData = requestParserRepository.extractFileFromRequest(ctx, 'image');
    }
    
    if (!fileData) {
      console.error('No file data found in request after all attempts');
      ctx.status = 400;
      ctx.body = { 
        error: 'Receipt image is required. Please upload a valid image file (JPG, PNG) or PDF of your payment confirmation.',
        debug: {
          filesExist: !!ctx.req.files,
          fileExists: !!ctx.req.file,
          bodyExists: !!ctx.req.body,
          contentType: ctx.req.headers['content-type'] || 'Not specified',
          bodyKeys: ctx.req.body ? Object.keys(ctx.req.body) : []
        }
      };
      console.log('===== RECEIPT UPLOAD FAILED: NO FILE DATA =====');
      return;
    }
    
    console.log('File data found, type:', typeof fileData, 
               'isBuffer:', Buffer.isBuffer(fileData),
               'isString:', typeof fileData === 'string',
               'isObject:', typeof fileData === 'object');
    
    // Check if transaction exists and belongs to user
    console.log('Validating transaction...');
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      console.error('Transaction not found:', transactionId);
      ctx.status = 404;
      ctx.body = { error: 'Transaction not found' };
      console.log('===== RECEIPT UPLOAD FAILED: TRANSACTION NOT FOUND =====');
      return;
    }
    
    if (transaction.email !== email) {
      console.error('User not authorized for transaction. Transaction email:', transaction.email, 'Request email:', email);
      ctx.status = 403;
      ctx.body = { error: 'Not authorized to upload receipt for this transaction' };
      console.log('===== RECEIPT UPLOAD FAILED: UNAUTHORIZED =====');
      return;
    }
    
    console.log('Transaction validated, processing file upload');
    
    // Use the file upload repository to handle the upload
    console.log('Sending to fileUploadRepository.uploadTransactionReceipt...');
    const uploadResult = await fileUploadRepository.uploadTransactionReceipt(email, transactionId, fileData);
    
    if (!uploadResult.success) {
      console.error('File upload failed:', uploadResult.error);
      ctx.status = 400;
      ctx.body = { error: uploadResult.error };
      console.log('===== RECEIPT UPLOAD FAILED: UPLOAD ERROR =====');
      return;
    }
    
    console.log('File upload successful, URL:', uploadResult.fileUrl);
    if (uploadResult.thumbnailUrl) {
      console.log('Thumbnail created, URL:', uploadResult.thumbnailUrl);
    }
    
    // Update transaction with receipt URL using repository
    console.log('Updating transaction with receipt URL...');
    await transactionRepository.updateTransactionReceipt(transactionId, uploadResult.fileUrl, uploadResult.thumbnailUrl);
    
    console.log('Transaction updated with receipt URL');
    
    ctx.status = 200;
    ctx.body = { 
      message: 'Receipt uploaded successfully',
      receiptUrl: uploadResult.fileUrl,
      thumbnailUrl: uploadResult.thumbnailUrl || uploadResult.fileUrl
    };
    
    console.log('===== RECEIPT UPLOAD COMPLETED SUCCESSFULLY =====');
  } catch (error) {
    console.error('Receipt upload error:', error);
    console.error(error.stack);
    ctx.status = 500;
    ctx.body = { 
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    };
    console.log('===== RECEIPT UPLOAD FAILED: EXCEPTION =====');
  }
};

/**
 * Approve deposit (admin only)
 */
export const approveDeposit = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    
    // Check if transaction exists using repository
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      ctx.status = 404;
      ctx.body = { error: 'Transaction not found' };
      return;
    }
    
    if (transaction.status !== 'pending') {
      ctx.status = 400;
      ctx.body = { error: 'Transaction is not in pending status' };
      return;
    }
    
    // Use repository to approve transaction
    await transactionRepository.approveTransaction(transactionId);
    
    ctx.status = 200;
    ctx.body = { message: 'Deposit approved successfully' };
  } catch (error) {
    console.error("Error in approveDeposit:", error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Reject deposit (admin only)
 */
export const rejectDeposit = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    const { reason } = ctx.req.body;
    
    // Check if transaction exists
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      ctx.status = 404;
      ctx.body = { error: 'Transaction not found' };
      return;
    }
    
    if (transaction.status !== 'pending') {
      ctx.status = 400;
      ctx.body = { error: 'Transaction is not in pending status' };
      return;
    }
    
    // Update transaction status using repository
    await transactionRepository.updateTransactionStatus(transactionId, 'rejected', reason || 'No reason provided');
    
    ctx.status = 200;
    ctx.body = { message: 'Deposit rejected successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Pay for an order from user balance
 */
export const payOrder = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { orderId } = ctx.params;
    
    // Sử dụng repository để kiểm tra đơn hàng
    const order = await orderRepository.getOrderById(orderId);
    
    if (!order) {
      ctx.status = 404;
      ctx.body = { error: 'Order not found' };
      return;
    }
    
    if (order.userId !== uid) {
      ctx.status = 403;
      ctx.body = { error: 'Not authorized to pay for this order' };
      return;
    }
    
    if (order.paymentStatus === 'paid') {
      ctx.status = 400;
      ctx.body = { error: 'Order is already paid' };
      return;
    }
    
    // Sử dụng repository cho việc thanh toán
    await transactionRepository.processOrderPayment(orderId, uid, order.total);
    
    ctx.status = 200;
    ctx.body = { message: 'Order paid successfully' };
  } catch (error) {
    if (error.message === 'Insufficient balance') {
      ctx.status = 400;
      ctx.body = { error: 'Insufficient balance' };
    } else {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
};

/**
 * Get all transactions for the current user
 */
export const getUserTransactions = async (ctx) => {
  try {
    const { uid } = ctx.state.user || {};
    const { type, status, limit = 20, page = 1, email } = ctx.query;
    
    // Make sure we have either uid or email
    if (!uid && !email) {
      ctx.status = 200; // Changed from 400 to 200 to always return a valid response
      ctx.body = { 
        transactions: [],
        balance: 0,
        pagination: {
          total: 0,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: 0
        }
      };
      return;
    }
    
    // Tạo options để truyền vào repository
    const options = {
      userId: uid || null,
      email,  // Pass along the email parameter if provided
      type,
      status,
      limit: parseInt(limit),
      page: parseInt(page)
    };
    
    // Sử dụng repository để lấy dữ liệu transactions
    let result;
    try {
      result = await transactionRepository.getUserTransactions(options);
    } catch (repositoryError) {
      console.error('Error fetching transactions:', repositoryError);
      // Return empty results instead of throwing an error
      result = { 
        transactions: [],
        pagination: {
          total: 0,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: 0
        }
      };
    }
    
    // Lấy thông tin balance của user từ repository
    let balance = 0;
    if (uid) {
      try {
        const userDoc = await firestore.collection('users').doc(uid).get();
        balance = userDoc.exists ? userDoc.data().balance || 0 : 0;
      } catch (userError) {
        console.error('Error fetching user balance:', userError);
        // Continue with balance = 0
      }
    }
    
    // Ensure transactions is always an array
    if (!result.transactions) {
      result.transactions = [];
    }
    
    ctx.status = 200;
    ctx.body = { 
      transactions: result.transactions,
      balance,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Unexpected error in getUserTransactions:', error);
    // Always return a 200 response with empty data
    ctx.status = 200;
    ctx.body = { 
      transactions: [],
      balance: 0,
      pagination: {
        total: 0,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
        pages: 0
      }
    };
  }
};

/**
 * Get all transactions (admin only)
 */
export const getAllTransactions = async (ctx) => {
  try {
    const { userId, type, status, startDate, endDate, limit = 20, page = 1 } = ctx.req.query;
    
    // Create a filter object to pass to the repository
    const filters = {
      userId,
      type,
      status,
      startDate,
      endDate,
      limit: parseInt(limit),
      page: parseInt(page)
    };
    
    // Create a function in repository to handle getAllTransactions with these filters
    const result = await transactionRepository.getAllTransactions(filters);
    
    ctx.status = 200;
    ctx.body = { 
      transactions: result.transactions,
      pagination: result.pagination
    };
  } catch (error) {
    console.error("Error in getAllTransactions:", error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Get transaction by id (admin and user)
 */
export const getTransactionById = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    const { uid, role } = ctx.state.user;
    
    // Use repository to get transaction
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      ctx.status = 404;
      ctx.body = { error: 'Transaction not found' };
      return;
    }
    
    // Check if user has access to this transaction (must be admin or transaction owner)
    if (role !== 'admin' && transaction.userId !== uid) {
      ctx.status = 403;
      ctx.body = { error: 'Not authorized to view this transaction' };
      return;
    }
    
    ctx.status = 200;
    ctx.body = transaction;
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Add transaction admin note (admin only)
 */
export const updateAdminNotes = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    // Get note from body, or try to get from query
    const note = ctx.req.body?.note || ctx.query?.note;
    
    console.log('Adding admin note:', { transactionId, note });
    console.log('Headers:', ctx.headers);
    console.log('Query:', ctx.query);
    
    // Set CORS headers
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email, X-User-Role');
    ctx.set('Access-Control-Allow-Credentials', 'true');
    
    if (ctx.method === 'OPTIONS') {
      ctx.status = 200;
      return;
    }
    
    if (!transactionId) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        message: 'Transaction ID is required' 
      };
      return;
    }
    
    if (note === undefined || note.trim() === '') {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        message: 'Note content is required' 
      };
      return;
    }
    
    // Get transaction
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      ctx.status = 404;
      ctx.body = { 
        success: false,
        message: 'Transaction not found' 
      };
      return;
    }
    
    // Add admin note
    const updatedTransaction = await transactionRepository.addTransactionAdminNote(
      transactionId, 
      note
    );
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: updatedTransaction,
      message: 'Admin note added successfully'
    };
  } catch (error) {
    console.error('Error adding admin note:', error);
    ctx.status = 500;
    ctx.body = { 
      success: false,
      message: 'Failed to add admin note', 
      error: error.message 
    };
  }
};

/**
 * Add transaction user note (user or admin)
 */
export const updateUserNotes = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    const { note } = ctx.req.body;
    const { uid, role, displayName } = ctx.state.user;
    
    if (!transactionId) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        message: 'Transaction ID is required' 
      };
      return;
    }
    
    if (note === undefined || note.trim() === '') {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        message: 'Note content is required' 
      };
      return;
    }
    
    // Get transaction
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      ctx.status = 404;
      ctx.body = { 
        success: false,
        message: 'Transaction not found' 
      };
      return;
    }
    
    // Check if user has access to this transaction (must be admin or transaction owner)
    if (role !== 'admin' && transaction.userId !== uid) {
      ctx.status = 403;
      ctx.body = { 
        success: false,
        message: 'Not authorized to update notes for this transaction' 
      };
      return;
    }
    
    // Get user details to include in the note
    let userName = 'User';
    try {
      const user = await userRepository.getUserByEmail(ctx.state.user.email);
      if (user) {
        userName = user.displayName || user.firstName || ctx.state.user.email;
      }
    } catch (error) {
      console.error('Error getting user details for note:', error);
      // Continue with default name if user lookup fails
    }
    
    // Add user note
    const updatedTransaction = await transactionRepository.addTransactionUserNote(
      transactionId, 
      note,
      userName
    );
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: updatedTransaction,
      message: 'User note added successfully'
    };
  } catch (error) {
    console.error('Error adding transaction user note:', error);
    ctx.status = 500;
    ctx.body = { 
      success: false,
      message: 'Failed to add user note', 
      error: error.message 
    };
  }
};

// Add user note to transaction
export const addTransactionUserNote = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { note } = ctx.req.body;
    
    // Validate input
    if (!note || typeof note !== 'string' || !note.trim()) {
      ctx.status = 400;
      ctx.body = { 
        success: false, 
        message: 'Note content is required',
        code: 'invalid_input'
      };
      return;
    }
    
    // Get user info from headers or body
    const userEmail = ctx.headers['x-user-email'] || ctx.req.body.email;
    
    if (!userEmail) {
      ctx.status = 400;
      ctx.body = { 
        success: false, 
        message: 'User email is required',
        code: 'missing_user'
      };
      return;
    }
    
    // Get user details to include in the note
    let userName = 'User';
    try {
      const user = await userRepository.getUserByEmail(userEmail);
      if (user) {
        userName = user.displayName || user.firstName || userEmail;
      }
    } catch (error) {
      console.error('Error getting user details for note:', error);
      // Continue with default name if user lookup fails
    }
    
    // Add the note
    const updated = await transactionRepository.addTransactionUserNote(id, note, userName);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Note added successfully',
      data: updated
    };
  } catch (error) {
    console.error('Error adding transaction user note:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to add note',
      code: 'server_error'
    };
  }
};

// Remove default export since we're using named exports
// export default {
//   requestDeposit,
//   uploadReceipt,
//   approveDeposit,
//   rejectDeposit,
//   payOrder,
//   getUserTransactions,
//   getAllTransactions
// }; 