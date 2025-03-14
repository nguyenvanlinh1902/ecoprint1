import { admin } from '../config/firebaseConfig.js';
import { CustomError } from '../exceptions/customError.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Upload ảnh chứng minh thanh toán
 */
export const uploadPaymentProof = async (file, userId) => {
  try {
    const tempFilePath = path.join(os.tmpdir(), file.name);
    
    // Ghi file tạm
    await fs.promises.writeFile(tempFilePath, file.data);
    
    // Upload lên Firebase Storage
    const bucket = admin.storage().bucket();
    const destination = `payment-proofs/${userId}/${Date.now()}-${file.name}`;
    
    await bucket.upload(tempFilePath, {
      destination,
      metadata: {
        contentType: file.mimetype
      }
    });
    
    // Xóa file tạm
    await fs.promises.unlink(tempFilePath);
    
    // Tạo URL có thể truy cập
    const fileRef = bucket.file(destination);
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '01-01-2100' // Ngày hết hạn xa
    });
    
    return url;
  } catch (error) {
    console.error('Error uploading payment proof:', error);
    throw new CustomError('Error when uploading payment proof', 500);
  }
};

/**
 * Tạo giao dịch mới
 */
export const createTransaction = async (transactionData) => {
  try {
    const db = admin.firestore();
    // Chuẩn bị dữ liệu giao dịch
    const newTransaction = {
      userId: transactionData.userId,
      type: transactionData.type,
      amount: transactionData.amount,
      status: 'pending',
      paymentProof: transactionData.paymentProof || null,
      orderId: transactionData.orderId || null,
      note: transactionData.note || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Lưu vào Firestore
    const docRef = await db.collection('transactions').add(newTransaction);
    
    return {
      id: docRef.id,
      ...newTransaction
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw new CustomError('Error when creating transaction', 500);
  }
};

/**
 * Thanh toán đơn hàng
 */
export const payForOrder = async (userId, orderId) => {
  const db = admin.firestore();
  
  try {
    return await db.runTransaction(async (transaction) => {
      // Lấy thông tin đơn hàng
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        throw new CustomError('Order not found', 404);
      }
      
      const orderData = orderDoc.data();
      
      // Kiểm tra quyền truy cập
      if (orderData.userId !== userId) {
        throw new CustomError('Access denied', 403);
      }
      
      // Kiểm tra trạng thái đơn hàng
      if (orderData.isPaid) {
        throw new CustomError('Order already paid', 400);
      }
      
      // Lấy thông tin người dùng
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new CustomError('User not found', 404);
      }
      
      const userData = userDoc.data();
      
      // Kiểm tra số dư
      if (userData.balance < orderData.totalPrice) {
        throw new CustomError('Insufficient balance', 400);
      }
      
      // Tạo giao dịch
      const newTransactionRef = db.collection('transactions').doc();
      const newTransaction = {
        userId,
        type: 'payment',
        amount: orderData.totalPrice,
        status: 'completed',
        orderId,
        note: `Payment for order #${orderId}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Cập nhật số dư người dùng
      const newBalance = userData.balance - orderData.totalPrice;
      
      // Đánh dấu đơn hàng đã thanh toán
      transaction.update(orderRef, {
        isPaid: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Cập nhật số dư người dùng
      transaction.update(userRef, {
        balance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Lưu giao dịch
      transaction.set(newTransactionRef, newTransaction);
      
      return {
        orderPaid: true,
        orderId,
        transactionId: newTransactionRef.id,
        amount: orderData.totalPrice,
        newBalance
      };
    });
  } catch (error) {
    console.error('Error paying for order:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Error when paying for order', 500);
  }
};

/**
 * Thanh toán các đơn hàng từ batch import
 */
export const payForBatchOrders = async (userId, batchId) => {
  const db = admin.firestore();
  
  try {
    return await db.runTransaction(async (transaction) => {
      // Lấy thông tin batch import
      const batchRef = db.collection('batchImports').doc(batchId);
      const batchDoc = await transaction.get(batchRef);
      
      if (!batchDoc.exists) {
        throw new CustomError('Batch import not found', 404);
      }
      
      const batchData = batchDoc.data();
      
      // Kiểm tra quyền truy cập
      if (batchData.userId !== userId) {
        throw new CustomError('Access denied', 403);
      }
      
      // Kiểm tra trạng thái batch
      if (batchData.status !== 'confirmed') {
        throw new CustomError('Batch import not confirmed', 400);
      }
      
      // Lấy thông tin người dùng
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new CustomError('User not found', 404);
      }
      
      const userData = userDoc.data();
      
      // Kiểm tra số dư
      if (userData.balance < batchData.totalPrice) {
        throw new CustomError('Insufficient balance', 400);
      }
      
      // Lấy danh sách đơn hàng cần thanh toán
      const ordersQuery = db.collection('orders')
        .where('batchImportId', '==', batchId)
        .where('isPaid', '==', false);
      
      const ordersSnapshot = await transaction.get(ordersQuery);
      
      if (ordersSnapshot.empty) {
        throw new CustomError('No unpaid orders found in this batch', 400);
      }
      
      // Tạo giao dịch
      const newTransactionRef = db.collection('transactions').doc();
      const newTransaction = {
        userId,
        type: 'payment',
        amount: batchData.totalPrice,
        status: 'completed',
        batchImportId: batchId,
        note: `Payment for batch import #${batchId}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Cập nhật số dư người dùng
      const newBalance = userData.balance - batchData.totalPrice;
      
      // Đánh dấu tất cả đơn hàng đã thanh toán
      const orderIds = [];
      ordersSnapshot.forEach(doc => {
        orderIds.push(doc.id);
        transaction.update(doc.ref, {
          isPaid: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      // Cập nhật số dư người dùng
      transaction.update(userRef, {
        balance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Cập nhật trạng thái batch
      transaction.update(batchRef, {
        status: 'processed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Lưu giao dịch
      transaction.set(newTransactionRef, newTransaction);
      
      return {
        batchPaid: true,
        batchId,
        transactionId: newTransactionRef.id,
        amount: batchData.totalPrice,
        newBalance,
        orderCount: orderIds.length,
        orderIds
      };
    });
  } catch (error) {
    console.error('Error paying for batch orders:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Error when paying for batch orders', 500);
  }
};

/**
 * Lấy lịch sử giao dịch của người dùng
 */
export const getUserTransactions = async (userId, type, status, page = 1, limit = 10) => {
  try {
    // Tạo query
    let query = admin.firestore().collection('transactions').where('userId', '==', userId);
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Sắp xếp và phân trang
    query = query.orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
    
    const transactionsSnapshot = await query.get();
    const transactions = [];
    
    transactionsSnapshot.forEach(doc => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Đếm tổng số giao dịch (không có phân trang)
    let countQuery = admin.firestore().collection('transactions').where('userId', '==', userId);
    
    if (type) {
      countQuery = countQuery.where('type', '==', type);
    }
    
    if (status) {
      countQuery = countQuery.where('status', '==', status);
    }
    
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;
    
    return {
      transactions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user transactions:', error);
    throw new CustomError('Error when getting transaction history', 500);
  }
};

/**
 * Lấy tất cả giao dịch (Admin only)
 */
export const getAllTransactions = async (type, status, page = 1, limit = 10) => {
  try {
    // Tạo query
    let query = admin.firestore().collection('transactions');
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Sắp xếp và phân trang
    query = query.orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
    
    const transactionsSnapshot = await query.get();
    const transactions = [];
    
    const userPromises = [];
    
    transactionsSnapshot.forEach(doc => {
      const transactionData = doc.data();
      
      // Thêm ID vào dữ liệu
      const transaction = {
        id: doc.id,
        ...transactionData
      };
      
      transactions.push(transaction);
      
      // Lấy thông tin người dùng
      const userPromise = admin.firestore().collection('users').doc(transactionData.userId).get()
        .then(userDoc => {
          if (userDoc.exists) {
            const userData = userDoc.data();
            transaction.user = {
              companyName: userData.companyName,
              email: userData.email
            };
          }
        });
      
      userPromises.push(userPromise);
    });
    
    // Đợi tất cả các promise
    await Promise.all(userPromises);
    
    // Đếm tổng số giao dịch (không có phân trang)
    let countQuery = admin.firestore().collection('transactions');
    
    if (type) {
      countQuery = countQuery.where('type', '==', type);
    }
    
    if (status) {
      countQuery = countQuery.where('status', '==', status);
    }
    
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;
    
    return {
      transactions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Error getting all transactions:', error);
    throw new CustomError('Error when getting all transactions', 500);
  }
};

/**
 * Cập nhật trạng thái giao dịch (Admin only)
 */
export const updateTransactionStatus = async (transactionId, status, note = '') => {
  const db = admin.firestore();
  
  try {
    return await db.runTransaction(async (transaction) => {
      // Lấy thông tin giao dịch
      const transactionRef = db.collection('transactions').doc(transactionId);
      const transactionDoc = await transaction.get(transactionRef);
      
      if (!transactionDoc.exists) {
        throw new CustomError('Transaction not found', 404);
      }
      
      const transactionData = transactionDoc.data();
      
      // Kiểm tra loại giao dịch và trạng thái hiện tại
      if (transactionData.type !== 'deposit' || transactionData.status !== 'pending') {
        throw new CustomError('Only pending deposit transactions can be updated', 400);
      }
      
      // Cập nhật trạng thái
      transaction.update(transactionRef, {
        status,
        note: note || transactionData.note,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Nếu xác nhận giao dịch, cập nhật số dư người dùng
      if (status === 'completed') {
        const userRef = db.collection('users').doc(transactionData.userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new CustomError('User not found', 404);
        }
        
        const userData = userDoc.data();
        const newBalance = userData.balance + transactionData.amount;
        
        transaction.update(userRef, {
          balance: newBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return {
          id: transactionId,
          status,
          note,
          userId: transactionData.userId,
          amount: transactionData.amount,
          newBalance
        };
      }
      
      return {
        id: transactionId,
        status,
        note,
        userId: transactionData.userId,
        amount: transactionData.amount
      };
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Error when updating transaction status', 500);
  }
}; 