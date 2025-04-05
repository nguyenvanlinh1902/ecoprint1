/**
 * Repository for user operations
 */
import { Firestore } from '@google-cloud/firestore';
import { admin, adminAuth } from '../config/firebaseAdmin.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const firestore = new Firestore();
const userProfilesCollection = firestore.collection('userProfiles');
const usersCollection = firestore.collection('users');

/**
 * Verify user credentials
 * @param {string} docId - User ID or Firebase UID
 * @param {string} password - Plain text password to verify
 * @returns {Promise<Object>} User record object
 */
const verifyUserCredentials = async (docId, password) => {
  try {
    const userProfile = await getUserById(docId);
    if (!userProfile) {
      throw new Error('Authentication failed');
    }

    const firebaseUid = userProfile.uid || docId;

    try {
      const userRecord = await adminAuth.getUser(firebaseUid);
      
      if (userRecord.disabled && userProfile.status === 'active') {
        await adminAuth.updateUser(firebaseUid, { disabled: false });
      }
      
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + "!1";
        
        const newUserRecord = await adminAuth.createUser({
          uid: firebaseUid,
          email: userProfile.email,
          emailVerified: true,
          password: password || randomPassword,
          displayName: userProfile.displayName || '',
          disabled: userProfile.status !== 'active'
        });
        
        if (!userProfile.uid) {
          await userProfilesCollection.doc(docId).update({
            uid: firebaseUid,
            updatedAt: new Date()
          });
        }
        
        return newUserRecord;
      }
      
      throw new Error('Authentication failed');
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Generate a unique user ID
 * @returns {Promise<string>} Generated user ID
 */
const generateUserId = async () => {
  return uuidv4();
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object or null if not found
 */
const getUserById = async (userId) => {
  try {
    const userDoc = await userProfilesCollection.doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data();
    return {
      id: userDoc.id,
      ...userData,
      createdAt: userData.createdAt ? userData.createdAt.toDate() : null,
      updatedAt: userData.updatedAt ? userData.updatedAt.toDate() : null
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get users with pagination and filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Object with users array and pagination info
 */
const getUsers = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      role
    } = options;
    
    const offset = (page - 1) * limit;
    
    let query = usersCollection;
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (role) {
      query = query.where('role', '==', role);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    // Get total count
    const countSnapshot = await query.get();
    const totalUsers = countSnapshot.size;
    
    query = query.limit(limit).offset(offset);
    
    const snapshot = await query.get();
    
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (search && !data.email.includes(search) && !data.displayName.includes(search)) {
        return;
      }
      
      users.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
      });
    });
    
    const totalPages = Math.ceil(totalUsers / limit);
    
    return {
      users,
      totalUsers,
      currentPage: page,
      totalPages
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update user status
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated user object
 */
const updateUserStatus = async (userId, status) => {
  try {
    const validStatuses = ['active', 'inactive', 'pending', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    await usersCollection.doc(userId).update({
      status,
      updatedAt: new Date()
    });
    
    if (status === 'inactive') {
      await adminAuth.updateUser(userId, { disabled: true });
    } else if (status === 'active') {
      await adminAuth.updateUser(userId, { disabled: false });
    }
    
    return await getUserById(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} data - User data to update
 * @returns {Promise<Object>} Updated user object
 */
const updateUserProfile = async (userId, data) => {
  try {
    const safeData = { ...data };
    
    delete safeData.email;
    delete safeData.password;
    delete safeData.balance;
    delete safeData.id;
    delete safeData.uid;
    delete safeData.createdAt;
    
    safeData.updatedAt = new Date();
    
    await usersCollection.doc(userId).update(safeData);
    
    if (safeData.displayName) {
      await adminAuth.updateUser(userId, { displayName: safeData.displayName });
    }
    
    return await getUserById(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Get user orders
 * @param {string} userId - User ID
 * @param {number} limit - Number of orders to fetch
 * @returns {Promise<Array>} Array of user orders
 */
const getUserOrders = async (userId, limit = 5) => {
  try {
    const snapshot = await firestore.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const orders = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      orders.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
      });
    });
    
    return orders;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user transactions
 * @param {string} userId - User ID
 * @param {number} limit - Number of transactions to fetch
 * @returns {Promise<Array>} Array of user transactions
 */
const getUserTransactions = async (userId, limit = 5) => {
  try {
    const snapshot = await firestore.collection('transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const transactions = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
      });
    });
    
    return transactions;
  } catch (error) {
    throw error;
  }
};

export default {
  verifyUserCredentials,
  generateUserId,
  getUserById,
  getUsers,
  updateUserStatus,
  updateUserProfile,
  getUserOrders,
  getUserTransactions
}; 