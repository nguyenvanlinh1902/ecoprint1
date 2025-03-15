import { CustomError } from '../exceptions/customError.js';
import { admin, db } from '../config/firebase.js';

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
const requestDeposit = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { amount, bankName, transferDate, reference } = ctx.request.body;
    
    // Validate required fields
    if (!amount || !bankName || !transferDate) {
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
    
    // Create transaction in Firestore
    const transactionRef = db.collection('transactions').doc();
    await transactionRef.set({
      userId: uid,
      type: 'deposit',
      amount: Number(amount),
      bankName,
      transferDate: new Date(transferDate),
      reference: reference || '',
      receiptUrl: '', // Will be updated when receipt is uploaded
      status: 'pending', // pending, approved, rejected
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 201;
    ctx.body = { 
      message: 'Deposit request created successfully',
      transactionId: transactionRef.id
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

// Upload receipt for deposit
const uploadReceipt = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { transactionId } = ctx.params;
    
    if (!ctx.request.files || !ctx.request.files.receipt) {
      ctx.status = 400;
      ctx.body = { error: 'No receipt file uploaded' };
      return;
    }
    
    // Check if transaction exists and belongs to user
    const transactionDoc = await db.collection('transactions').doc(transactionId).get();
    
    if (!transactionDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Transaction not found' };
      return;
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.userId !== uid) {
      ctx.status = 403;
      ctx.body = { error: 'Not authorized to upload receipt for this transaction' };
      return;
    }
    
    // Upload receipt to Firebase Storage
    const file = ctx.request.files.receipt;
    const fileName = `receipts/${uid}/${Date.now()}_${file.name}`;
    
    const bucket = admin.storage().bucket();
    const fileBuffer = file.data;
    
    const fileUpload = bucket.file(fileName);
    await fileUpload.save(fileBuffer, {
      metadata: {
        contentType: file.mimetype
      }
    });
    
    // Get public URL
    await fileUpload.makePublic();
    const receiptUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    // Update transaction with receipt URL
    await db.collection('transactions').doc(transactionId).update({
      receiptUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 200;
    ctx.body = { 
      message: 'Receipt uploaded successfully',
      receiptUrl
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

// Approve deposit (admin only)
const approveDeposit = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    
    // Check if transaction exists
    const transactionDoc = await db.collection('transactions').doc(transactionId).get();
    
    if (!transactionDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Transaction not found' };
      return;
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.status !== 'pending') {
      ctx.status = 400;
      ctx.body = { error: 'Transaction is not in pending status' };
      return;
    }
    
    // Use a transaction to update balance and transaction status
    await admin.firestore().runTransaction(async (t) => {
      // Get user document
      const userDoc = await t.get(db.collection('users').doc(transaction.userId));
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const newBalance = (userData.balance || 0) + transaction.amount;
      
      // Update user balance
      t.update(db.collection('users').doc(transaction.userId), {
        balance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update transaction status
      t.update(db.collection('transactions').doc(transactionId), {
        status: 'approved',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    ctx.status = 200;
    ctx.body = { message: 'Deposit approved successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

// Reject deposit (admin only)
const rejectDeposit = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    const { reason } = ctx.request.body;
    
    // Check if transaction exists
    const transactionDoc = await db.collection('transactions').doc(transactionId).get();
    
    if (!transactionDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Transaction not found' };
      return;
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.status !== 'pending') {
      ctx.status = 400;
      ctx.body = { error: 'Transaction is not in pending status' };
      return;
    }
    
    // Update transaction status
    await db.collection('transactions').doc(transactionId).update({
      status: 'rejected',
      rejectionReason: reason || 'No reason provided',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 200;
    ctx.body = { message: 'Deposit rejected successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

// Pay for an order with account balance
const payOrder = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { orderId } = ctx.params;
    
    // Check if order exists
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Order not found' };
      return;
    }
    
    const order = orderDoc.data();
    
    // Check if user owns this order
    if (order.userId !== uid) {
      ctx.status = 403;
      ctx.body = { error: 'Not authorized to pay for this order' };
      return;
    }
    
    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      ctx.status = 400;
      ctx.body = { error: 'Order is already paid' };
      return;
    }
    
    // Use a transaction to update balance and order payment status
    await admin.firestore().runTransaction(async (t) => {
      // Get user document
      const userDoc = await t.get(db.collection('users').doc(uid));
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // Check if user has enough balance
      if ((userData.balance || 0) < order.total) {
        throw new Error('Insufficient balance');
      }
      
      const newBalance = userData.balance - order.total;
      
      // Update user balance
      t.update(db.collection('users').doc(uid), {
        balance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update order payment status
      t.update(db.collection('orders').doc(orderId), {
        paymentStatus: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Create payment transaction
      const paymentRef = db.collection('transactions').doc();
      t.set(paymentRef, {
        userId: uid,
        orderId,
        type: 'payment',
        amount: -order.total, // Negative amount for payment
        status: 'approved',
        description: `Payment for order ${order.orderNumber}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
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

// Get user's transactions
const getUserTransactions = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { type, status, limit = 20, page = 1 } = ctx.query;
    
    let query = db.collection('transactions').where('userId', '==', uid);
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
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
                
    const transactionsSnapshot = await query.get();
    const transactions = [];
    
    transactionsSnapshot.forEach(doc => {
      const transactionData = doc.data();
      transactions.push({
        id: doc.id,
        ...transactionData,
        createdAt: transactionData.createdAt ? transactionData.createdAt.toDate() : null,
        updatedAt: transactionData.updatedAt ? transactionData.updatedAt.toDate() : null,
        transferDate: transactionData.transferDate ? new Date(transactionData.transferDate) : null
      });
    });
    
    // Get user balance
    const userDoc = await db.collection('users').doc(uid).get();
    const balance = userDoc.exists ? userDoc.data().balance || 0 : 0;
    
    ctx.status = 200;
    ctx.body = { 
      transactions,
      balance,
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

// Get all transactions (admin only)
const getAllTransactions = async (ctx) => {
  try {
    const { userId, type, status, startDate, endDate, limit = 20, page = 1 } = ctx.query;
    
    let query = db.collection('transactions');
    
    // Apply filters
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    if (status) {
      query = query.where('status', '==', status);
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
                
    const transactionsSnapshot = await query.get();
    const transactions = [];
    
    transactionsSnapshot.forEach(doc => {
      const transactionData = doc.data();
      transactions.push({
        id: doc.id,
        ...transactionData,
        createdAt: transactionData.createdAt ? transactionData.createdAt.toDate() : null,
        updatedAt: transactionData.updatedAt ? transactionData.updatedAt.toDate() : null,
        transferDate: transactionData.transferDate ? new Date(transactionData.transferDate) : null
      });
    });
    
    ctx.status = 200;
    ctx.body = { 
      transactions,
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

export default {
  requestDeposit,
  uploadReceipt,
  approveDeposit,
  rejectDeposit,
  payOrder,
  getUserTransactions,
  getAllTransactions
}; 