import { admin } from '../config/firebase.js';

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
    adminNotes: data.adminNotes || [],
    userNotes: data.userNotes || [],
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
    transferDate: data.transferDate ? data.transferDate.toDate() : null
  };
}

/**
 * Create a new deposit request
 * @param {Object} data - Deposit data
 * @returns {Promise<Object>} Created transaction
 */
export async function createDepositRequest(data) {
  try {
    const { amount, bankName, transferDate, reference, email, receiptUrl, thumbnailUrl } = data;
    
    // Create transaction in Firestore
    const transactionRef = collection.doc();
    await transactionRef.set({
      email,
      type: 'deposit',
      amount: Number(amount),
      bankName,
      transferDate: new Date(transferDate),
      reference: reference || '',
      receiptUrl: receiptUrl || '', // Use provided receipt URL from Firebase
      thumbnailUrl: thumbnailUrl || receiptUrl || '', // Use thumbnail or receipt URL
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
 * @param {string} thumbnailUrl - Thumbnail URL
 * @returns {Promise<boolean>} Success status
 */
export async function updateTransactionReceipt(transactionId, receiptUrl, thumbnailUrl) {
  try {
    console.log(`Updating transaction ${transactionId} with receipt URL: ${receiptUrl}`);
    if (thumbnailUrl) {
      console.log(`Also adding thumbnail URL: ${thumbnailUrl}`);
    }
    
    const transactionRef = collection.doc(transactionId);
    const updateData = { 
      receiptUrl, 
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (thumbnailUrl) {
      updateData.thumbnailUrl = thumbnailUrl;
    }
    
    await transactionRef.update(updateData);
    console.log(`Transaction ${transactionId} receipt updated successfully`);
    return { success: true };
  } catch (error) {
    console.error(`Error updating transaction receipt: ${error.message}`, error);
    return { success: false, error: error.message };
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
    
    // Validate and parse pagination params
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      throw new Error('Invalid pagination parameters');
    }
    
    // Calculate offset
    const offset = (pageNumber - 1) * limitNumber;
    
    // Create base query
    let query;
    
    // First check if we should query by email directly
    if (email) {
      console.log(`Querying transactions by email: ${email}`);
      query = collection.where('email', '==', email);
    } 
    // If no email but we have userId, query by userId
    else if (userId) {
      console.log(`Querying transactions by userId: ${userId}`);
      query = collection.where('userId', '==', userId);
    } 
    // If neither, throw error
    else {
      console.log('No email or userId provided, returning empty results');
      return { 
        transactions: [],
        pagination: {
          total: 0,
          page: pageNumber,
          limit: limitNumber,
          pages: 0
        }
      };
    }
    
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
    
    console.log(`Found ${total} transactions matching criteria`);
    
    // Apply sorting and pagination
    query = query.orderBy('createdAt', 'desc')
                .limit(limitNumber)
                .offset(offset);
                
    const transactionsSnapshot = await query.get();
    const transactions = [];
    
    console.log(`Retrieved ${transactionsSnapshot.size} transactions after pagination`);
    
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
    // Get transaction data
    const transactionDoc = await collection.doc(transactionId).get();
    
    if (!transactionDoc.exists) {
      throw new Error('Transaction not found');
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not in pending status');
    }
    
    // Get user info by email
    const userEmail = transaction.email;
    
    if (!userEmail) {
      throw new Error('Transaction has no associated email');
    }
    
    // Query user by email - direct query without transaction
    const usersRef = firestore.collection('users');
    const userQuerySnapshot = await usersRef.where('email', '==', userEmail).limit(1).get();
    
    let userId;
    let userData;
    
    // Handle user creation if not exists
    if (userQuerySnapshot.empty) {
      // Create new user
      const newUserRef = usersRef.doc();
      userId = newUserRef.id;
      
      // Basic data for new user
      userData = {
        email: userEmail,
        displayName: userEmail.split('@')[0],
        role: 'user',
        status: 'active',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Set user data directly
      await newUserRef.set(userData);
    } else {
      // Get existing user data
      const userDoc = userQuerySnapshot.docs[0];
      userId = userDoc.id;
      userData = userDoc.data();
    }
    
    // Update user balance directly
    const userDocRef = usersRef.doc(userId);
    const currentBalance = userData.balance || 0;
    const newBalance = currentBalance + transaction.amount;
    
    await userDocRef.update({
      balance: newBalance,
      updatedAt: new Date()
    });
    
    // Update transaction status separately
    const updateData = {
      status: 'approved',
      updatedAt: new Date()
    };
    
    if (!transaction.userId) {
      updateData.userId = userId;
    }
    
    await collection.doc(transactionId).update(updateData);
    
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

/**
 * Update transaction admin notes
 * @param {string} transactionId - Transaction ID
 * @param {string} adminNotes - Admin notes
 * @returns {Promise<Object>} Updated transaction data
 */
export async function updateTransactionAdminNotes(transactionId, adminNotes) {
  try {
    // Get transaction reference
    const transactionRef = collection.doc(transactionId);
    
    // Update transaction
    await transactionRef.update({
      adminNotes,
      updatedAt: new Date()
    });
    
    // Get updated transaction
    const updatedTransaction = await getTransactionById(transactionId);
    
    return updatedTransaction;
  } catch (error) {
    console.error('Error updating transaction admin notes:', error);
    throw error;
  }
}

/**
 * Update transaction user notes
 * @param {string} transactionId - Transaction ID
 * @param {string} userNotes - User notes
 * @returns {Promise<Object>} Updated transaction data
 */
export async function updateTransactionUserNotes(transactionId, userNotes) {
  try {
    // Get transaction reference
    const transactionRef = collection.doc(transactionId);
    
    // Update transaction
    await transactionRef.update({
      userNotes,
      updatedAt: new Date()
    });
    
    // Get updated transaction
    const updatedTransaction = await getTransactionById(transactionId);
    
    return updatedTransaction;
  } catch (error) {
    console.error('Error updating transaction user notes:', error);
    throw error;
  }
}

/**
 * Add transaction admin note
 * @param {string} transactionId - Transaction ID
 * @param {string} note - Admin note to add
 * @returns {Promise<Object>} Updated transaction data
 */
export async function addTransactionAdminNote(transactionId, note) {
  try {
    // Get transaction reference
    const transactionRef = collection.doc(transactionId);
    const transactionDoc = await transactionRef.get();
    
    if (!transactionDoc.exists) {
      throw new Error('Transaction not found');
    }
    
    const data = transactionDoc.data();
    const adminNotes = data.adminNotes || [];
    
    // Create new note with timestamp
    const newNote = {
      text: note,
      createdAt: new Date(),
      id: `admin_note_${Date.now()}`
    };
    
    // Add note to array
    adminNotes.push(newNote);
    
    // Update transaction
    await transactionRef.update({
      adminNotes,
      updatedAt: new Date()
    });
    
    // Get updated transaction
    const updatedTransaction = await getTransactionById(transactionId);
    
    return updatedTransaction;
  } catch (error) {
    console.error('Error adding transaction admin note:', error);
    throw error;
  }
}

/**
 * Add transaction user note
 * @param {string} transactionId - Transaction ID
 * @param {string} note - User note to add
 * @param {string} userName - Name of the user adding the note
 * @returns {Promise<Object>} Updated transaction data
 */
export async function addTransactionUserNote(transactionId, note, userName = '') {
  try {
    // Get transaction reference
    const transactionRef = collection.doc(transactionId);
    const transactionDoc = await transactionRef.get();
    
    if (!transactionDoc.exists) {
      throw new Error('Transaction not found');
    }
    
    const data = transactionDoc.data();
    const userNotes = data.userNotes || [];
    
    // Create new note with timestamp
    const newNote = {
      text: note,
      createdAt: new Date(),
      userName: userName,
      id: `user_note_${Date.now()}`
    };
    
    // Add note to array
    userNotes.push(newNote);
    
    // Update transaction
    await transactionRef.update({
      userNotes,
      updatedAt: new Date()
    });
    
    // Get updated transaction
    const updatedTransaction = await getTransactionById(transactionId);
    
    return updatedTransaction;
  } catch (error) {
    console.error('Error adding transaction user note:', error);
    throw error;
  }
}

export default {
  createDepositRequest,
  updateTransactionReceipt,
  getTransactionById,
  updateTransactionStatus,
  getUserTransactions,
  getAllTransactions,
  approveTransaction,
  processOrderPayment,
  updateTransactionAdminNotes,
  updateTransactionUserNotes,
  formatTransaction,
  addTransactionAdminNote,
  addTransactionUserNote
}; 