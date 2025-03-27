import { admin } from '../config/firebase.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();
const transactionsCollection = 'transactions';

/**
 * Format a transaction document from Firestore
 * @param {Object} doc - Firestore document
 * @returns {Object} Formatted transaction object
 */
const formatTransaction = (doc) => {
  if (!doc.exists) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
    transferDate: data.transferDate ? data.transferDate.toDate() : null
  };
};

/**
 * Create a new deposit request
 * @param {Object} data - Deposit data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created transaction
 */
const createDepositRequest = async (data, userId) => {
  try {
    const { amount, bankName, transferDate, reference } = data;
    
    // Create transaction in Firestore
    const transactionRef = db.collection(transactionsCollection).doc();
    await transactionRef.set({
      userId,
      type: 'deposit',
      amount: Number(amount),
      bankName,
      transferDate: new Date(transferDate),
      reference: reference || '',
      receiptUrl: '', // Will be updated when receipt is uploaded
      status: 'pending', // pending, approved, rejected
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return {
      id: transactionRef.id,
      success: true
    };
  } catch (error) {
    console.error('Error creating deposit request:', error);
    throw error;
  }
};

/**
 * Upload receipt for a transaction
 * @param {string} transactionId - Transaction ID
 * @param {string} receiptUrl - Receipt URL
 * @returns {Promise<boolean>} Success status
 */
const updateTransactionReceipt = async (transactionId, receiptUrl) => {
  try {
    await db.collection(transactionsCollection).doc(transactionId).update({
      receiptUrl,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating transaction receipt:', error);
    throw error;
  }
};

/**
 * Get a transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Transaction data
 */
const getTransactionById = async (transactionId) => {
  try {
    const transactionDoc = await db.collection(transactionsCollection).doc(transactionId).get();
    
    // Trả về null nếu không tìm thấy transaction
    if (!transactionDoc.exists) {
      return null;
    }
    
    // Format transaction data
    const transaction = formatTransaction(transactionDoc);
    
    // Lấy thông tin người dùng liên quan
    if (transaction.userId) {
      const userDoc = await db.collection('users').doc(transaction.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        transaction.user = {
          id: userDoc.id,
          name: userData.displayName || userData.firstName + ' ' + userData.lastName,
          email: userData.email,
          phone: userData.phone || ''
        };
      }
    }
    
    return transaction;
  } catch (error) {
    console.error('Error getting transaction:', error);
    throw error;
  }
};

/**
 * Update transaction status
 * @param {string} transactionId - Transaction ID
 * @param {string} status - New status
 * @param {string} [reason] - Rejection reason
 * @returns {Promise<boolean>} Success status
 */
const updateTransactionStatus = async (transactionId, status, reason = null) => {
  try {
    const updateData = {
      status,
      updatedAt: FieldValue.serverTimestamp()
    };
    
    if (reason && status === 'rejected') {
      updateData.rejectionReason = reason;
    }
    
    await db.collection(transactionsCollection).doc(transactionId).update(updateData);
    
    return true;
  } catch (error) {
    console.error('Error updating transaction status:', error);
    throw error;
  }
};

/**
 * Get user transactions with filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Transactions and pagination info
 */
const getUserTransactions = async (options = {}) => {
  try {
    const { userId, type, status, limit = 20, page = 1 } = options;
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Validate and parse pagination params
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      throw new Error('Invalid pagination parameters');
    }
    
    // Calculate offset
    const offset = (pageNumber - 1) * limitNumber;
    
    // Create base query with userId filter
    let query = db.collection(transactionsCollection).where('userId', '==', userId);
    
    // Apply additional filters if provided
    if (type) {
      query = query.where('type', '==', type);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Count total for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply sorting and pagination
    query = query.orderBy('createdAt', 'desc')
                .limit(limitNumber)
                .offset(offset);
                
    const transactionsSnapshot = await query.get();
    const transactions = [];
    
    transactionsSnapshot.forEach(doc => {
      transactions.push(formatTransaction(doc));
    });
    
    return { 
      transactions,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber) || 1
      }
    };
  } catch (error) {
    console.error('Error getting user transactions:', error);
    throw error;
  }
};

/**
 * Get all transactions with optional filtering
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Transactions and pagination info
 */
const getAllTransactions = async (options = {}) => {
  try {
    const {
      userId,
      type,
      status,
      startDate,
      endDate,
      limit = 20,
      page = 1,
      search
    } = options;
    
    // Validate and parse pagination params
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      throw new Error('Invalid pagination parameters');
    }
    
    // Calculate offset
    const offset = (pageNumber - 1) * limitNumber;
    
    // Create base query
    let query = db.collection(transactionsCollection);
    
    // Apply filters to query if provided
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Get total count for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply date filters in memory as Firestore can't use multiple range operators
    let allTransactions = [];
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    // Process results
    snapshot.forEach(doc => {
      const transaction = formatTransaction(doc);
      
      let includeRecord = true;
      
      // Apply date filters
      if (startDate && transaction.createdAt < new Date(startDate)) {
        includeRecord = false;
      }
      
      if (endDate && transaction.createdAt > new Date(endDate)) {
        includeRecord = false;
      }
      
      // Apply search filter
      if (search && includeRecord) {
        const searchLower = search.toLowerCase();
        includeRecord = false;
        
        // Search by ID
        if (transaction.id.toLowerCase().includes(searchLower)) {
          includeRecord = true;
        }
        
        // Search by user ID
        else if (transaction.userId.toLowerCase().includes(searchLower)) {
          includeRecord = true;
        }
        
        // Search by type
        else if (transaction.type.toLowerCase().includes(searchLower)) {
          includeRecord = true;
        }
        
        // Search by description if exists
        else if (transaction.description && transaction.description.toLowerCase().includes(searchLower)) {
          includeRecord = true;
        }
        
        // Search by reference if exists
        else if (transaction.reference && transaction.reference.toLowerCase().includes(searchLower)) {
          includeRecord = true;
        }
        
        // Search by bankName if exists
        else if (transaction.bankName && transaction.bankName.toLowerCase().includes(searchLower)) {
          includeRecord = true;
        }
      }
      
      if (includeRecord) {
        allTransactions.push(transaction);
      }
    });
    
    // Apply pagination to the filtered results
    const startIndex = offset;
    const endIndex = startIndex + limitNumber;
    const paginatedTransactions = allTransactions.slice(startIndex, endIndex);
    
    // Calculate total pages
    const filteredTotal = allTransactions.length;
    const totalPages = Math.ceil(filteredTotal / limitNumber) || 1;
    
    return {
      transactions: paginatedTransactions,
      pagination: {
        total: filteredTotal,
        totalPages,
        currentPage: pageNumber,
        limit: limitNumber
      }
    };
  } catch (error) {
    console.error('Error getting all transactions:', error);
    throw error;
  }
};

/**
 * Approve a pending transaction and update user balance
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<boolean>} Success status
 */
const approveTransaction = async (transactionId) => {
  try {
    // Lấy thông tin giao dịch
    const transactionDoc = await db.collection(transactionsCollection).doc(transactionId).get();
    
    if (!transactionDoc.exists) {
      throw new Error('Transaction not found');
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not in pending status');
    }
    
    // Sử dụng transaction Firestore để đảm bảo tính toàn vẹn dữ liệu
    await admin.firestore().runTransaction(async (t) => {
      // Lấy thông tin user
      const userDoc = await t.get(db.collection('users').doc(transaction.userId));
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const newBalance = (userData.balance || 0) + transaction.amount;
      
      // Cập nhật số dư của user
      t.update(db.collection('users').doc(transaction.userId), {
        balance: newBalance,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Cập nhật trạng thái giao dịch
      t.update(db.collection(transactionsCollection).doc(transactionId), {
        status: 'approved',
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error approving transaction:', error);
    throw error;
  }
};

/**
 * Process order payment
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID
 * @param {number} amount - Payment amount
 * @returns {Promise<boolean>} Success status
 */
const processOrderPayment = async (orderId, userId, amount) => {
  try {
    // Lấy thông tin đơn hàng để biết số tiền và thông tin thanh toán
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }
    
    const order = orderDoc.data();
    
    // Sử dụng transaction Firestore để đảm bảo tính toàn vẹn dữ liệu
    await admin.firestore().runTransaction(async (t) => {
      // Lấy thông tin user
      const userDoc = await t.get(db.collection('users').doc(userId));
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // Kiểm tra số dư
      if ((userData.balance || 0) < amount) {
        throw new Error('Insufficient balance');
      }
      
      const newBalance = userData.balance - amount;
      
      // Cập nhật số dư của user
      t.update(db.collection('users').doc(userId), {
        balance: newBalance,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Cập nhật trạng thái thanh toán của đơn hàng
      t.update(db.collection('orders').doc(orderId), {
        paymentStatus: 'paid',
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Tạo giao dịch thanh toán
      const paymentRef = db.collection(transactionsCollection).doc();
      t.set(paymentRef, {
        userId,
        orderId,
        type: 'payment',
        amount: -amount, // Số tiền âm cho thanh toán
        status: 'approved',
        description: `Payment for order ${order.orderNumber}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error processing order payment:', error);
    throw error;
  }
};

export default {
  createDepositRequest,
  updateTransactionReceipt,
  getTransactionById,
  updateTransactionStatus,
  getUserTransactions,
  getAllTransactions,
  approveTransaction,
  processOrderPayment
}; 