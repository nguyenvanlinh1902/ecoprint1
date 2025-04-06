import { admin } from '../config/firebaseAdmin.js';

const firestore = admin.firestore();
/** @type {CollectionReference} */
const collection = firestore.collection('transactions');

/**
 * Format a transaction document from Firestore
 * @param {Object} doc - Firestore document
 * @returns {Object} Formatted transaction object
 */
export function formatTransaction(doc) {
  if (!doc.exists) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
    transferDate: data.transferDate ? data.transferDate.toDate() : null
  };
}

/**
 * Create a new deposit request
 * @param {Object} data - Deposit data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created transaction
 */
export async function createDepositRequest(data, userId) {
  try {
    const { amount, bankName, transferDate, reference } = data;
    
    // Create transaction in Firestore
    const transactionRef = collection.doc();
    await transactionRef.set({
      userId,
      type: 'deposit',
      amount: Number(amount),
      bankName,
      transferDate: new Date(transferDate),
      reference: reference || '',
      receiptUrl: '', // Will be updated when receipt is uploaded
      status: 'pending', // pending, approved, rejected
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return {
      id: transactionRef.id,
      success: true
    };
  } catch (error) {
    console.error('Error creating deposit request:', error);
    throw error;
  }
}

/**
 * Upload receipt for a transaction
 * @param {string} transactionId - Transaction ID
 * @param {string} receiptUrl - Receipt URL
 * @returns {Promise<boolean>} Success status
 */
export async function updateTransactionReceipt(transactionId, receiptUrl) {
  try {
    await collection.doc(transactionId).update({
      receiptUrl,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating transaction receipt:', error);
    throw error;
  }
}

/**
 * Get a transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Transaction data
 */
export async function getTransactionById(transactionId) {
  try {
    const transactionDoc = await collection.doc(transactionId).get();
    
    // Return null if transaction not found
    if (!transactionDoc.exists) {
      return null;
    }
    
    // Format transaction data
    const transaction = formatTransaction(transactionDoc);
    
    // Get related user information
    if (transaction.userId) {
      const userDoc = await firestore.collection('users').doc(transaction.userId).get();
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
}

/**
 * Update transaction status
 * @param {string} transactionId - Transaction ID
 * @param {string} status - New status
 * @param {string} [reason] - Rejection reason
 * @returns {Promise<boolean>} Success status
 */
export async function updateTransactionStatus(transactionId, status, reason = null) {
  try {
    const updateData = {
      status,
      updatedAt: new Date()
    };
    
    if (reason && status === 'rejected') {
      updateData.rejectionReason = reason;
    }
    
    await collection.doc(transactionId).update(updateData);
    
    return true;
  } catch (error) {
    console.error('Error updating transaction status:', error);
    throw error;
  }
}

/**
 * Get user transactions with filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Transactions and pagination info
 */
export async function getUserTransactions(options = {}) {
  try {
    const { userId, email, type, status, limit = 20, page = 1 } = options;
    
    let userIdToUse = userId;
    
    // If email is provided but no userId, find the user by email
    if ((!userId || userId === null) && email) {
      const usersRef = firestore.collection('users');
      const userQuery = await usersRef.where('email', '==', email).limit(1).get();
      
      if (userQuery.empty) {
        // Instead of throwing an error, return empty results
        console.log(`No user found with email: ${email}, returning empty results`);
        return { 
          transactions: [],
          pagination: {
            total: 0,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            pages: 0
          }
        };
      }
      
      userIdToUse = userQuery.docs[0].id;
    }
    
    if (!userIdToUse) {
      throw new Error('User ID or email is required');
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
    let query = collection.where('userId', '==', userIdToUse);
    
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
        pages: Math.ceil(total / limitNumber)
      }
    };
  } catch (error) {
    console.error('Error getting user transactions:', error);
    throw error;
  }
}

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
    let query = collection;
    
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
    const transactionDoc = await collection.doc(transactionId).get();
    
    if (!transactionDoc.exists) {
      throw new Error('Transaction not found');
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not in pending status');
    }
    
    // Sử dụng transaction Firestore để đảm bảo tính toàn vẹn dữ liệu
    await firestore.runTransaction(async (t) => {
      // Lấy thông tin user
      const userDoc = await t.get(firestore.collection('users').doc(transaction.userId));
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const newBalance = (userData.balance || 0) + transaction.amount;
      
      // Cập nhật số dư của user
      t.update(firestore.collection('users').doc(transaction.userId), {
        balance: newBalance,
        updatedAt: new Date()
      });
      
      // Cập nhật trạng thái giao dịch
      t.update(collection.doc(transactionId), {
        status: 'approved',
        updatedAt: new Date()
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
    // Validate parameters
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      throw new Error('Valid order ID is required');
    }
    
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid user ID is required');
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw new Error('Valid payment amount is required');
    }
    
    // Lấy thông tin đơn hàng để biết số tiền và thông tin thanh toán
    const orderDoc = await firestore.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }
    
    const order = orderDoc.data();
    
    // Sử dụng transaction Firestore để đảm bảo tính toàn vẹn dữ liệu
    await firestore.runTransaction(async (t) => {
      // Lấy thông tin user
      const userDoc = await t.get(firestore.collection('users').doc(userId));
      
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
      t.update(firestore.collection('users').doc(userId), {
        balance: newBalance,
        updatedAt: new Date()
      });
      
      // Cập nhật trạng thái thanh toán của đơn hàng
      t.update(firestore.collection('orders').doc(orderId), {
        paymentStatus: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      });
      
      // Tạo giao dịch thanh toán
      const paymentRef = collection.doc();
      t.set(paymentRef, {
        userId,
        orderId,
        type: 'payment',
        amount: -amount, // Số tiền âm cho thanh toán
        status: 'approved',
        description: `Payment for order ${order.orderNumber}`,
        createdAt: new Date(),
        updatedAt: new Date()
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