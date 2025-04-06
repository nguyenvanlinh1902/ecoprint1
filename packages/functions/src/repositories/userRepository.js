/**
 * Repository for user operations
 */
import { admin, adminAuth } from '../config/firebaseAdmin.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const firestore = admin.firestore();
const userProfilesCollection = firestore.collection('userProfiles');
const usersCollection = firestore.collection('users');

/**
 * Verify user credentials
 * @param {string} email - User email
 * @param {string} password - Plain text password to verify
 * @returns {Promise<Object>} User record object
 */
const verifyUserCredentials = async (email, password) => {
  try {
    const userProfile = await getUserByEmail(email);
    if (!userProfile) {
      throw new Error('Authentication failed');
    }

    const firebaseUid = userProfile.uid || userProfile.id;

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
          await userProfilesCollection.doc(userProfile.id).update({
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
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object>} User object or null if not found
 */
const getUserByEmail = async (email) => {
  try {
    const snapshot = await userProfilesCollection
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const userDoc = snapshot.docs[0];
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
    
    let query = usersCollection;
    
    // Apply where clauses for status and role
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (role) {
      query = query.where('role', '==', role);
    }
    
    // Use compound queries with filters
    if (search) {
      // We need to perform a client-side filtering for search terms
      // since Firestore doesn't support full text search
      const snapshot = await query.orderBy('email').get();
      
      const filteredDocs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Case-insensitive search on email and displayName
        const email = data.email?.toLowerCase() || '';
        const name = data.displayName?.toLowerCase() || '';
        const searchTerm = search.toLowerCase();
        
        if (email.includes(searchTerm) || name.includes(searchTerm)) {
          filteredDocs.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
          });
        }
      });
      
      // Client-side pagination
      const startIdx = (page - 1) * limit;
      const endIdx = startIdx + limit;
      
      const paginatedUsers = filteredDocs
        .sort((a, b) => b.createdAt - a.createdAt) // Sort by createdAt desc
        .slice(startIdx, endIdx);
      
      return {
        users: paginatedUsers,
        totalUsers: filteredDocs.length,
        currentPage: page,
        totalPages: Math.ceil(filteredDocs.length / limit)
      };
    } else {
      // Standard pagination for non-search queries
      const totalCountQuery = query.count();
      const countSnapshot = await totalCountQuery.get();
      const totalUsers = countSnapshot.data().count;
      
      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.orderBy('createdAt', 'desc')
                   .limit(limit)
                   .offset(offset);
      
      const snapshot = await query.get();
      
      const users = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
        });
      });
      
      return {
        users,
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit)
      };
    }
  } catch (error) {
    console.error('Error in getUsers repository:', error);
    throw error;
  }
};

/**
 * Update user status
 * @param {string} email - User email
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated user object
 */
const updateUserStatus = async (email, status) => {
  try {
    const validStatuses = ['active', 'inactive', 'pending', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    const user = await getUserByEmail(email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    
    await userProfilesCollection.doc(user.id).update({
      status,
      updatedAt: new Date()
    });
    
    if (user.uid) {
      if (status === 'inactive') {
        await adminAuth.updateUser(user.uid, { disabled: true });
      } else if (status === 'active') {
        await adminAuth.updateUser(user.uid, { disabled: false });
      }
    }
    
    return await getUserByEmail(email);
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} email - User email
 * @param {Object} data - User data to update
 * @returns {Promise<Object>} Updated user object
 */
const updateUserProfile = async (email, data) => {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    
    const safeData = { ...data };
    
    delete safeData.email;
    delete safeData.password;
    delete safeData.balance;
    delete safeData.id;
    delete safeData.uid;
    delete safeData.createdAt;
    
    safeData.updatedAt = new Date();
    
    await userProfilesCollection.doc(user.id).update(safeData);
    
    if (safeData.displayName && user.uid) {
      await adminAuth.updateUser(user.uid, { displayName: safeData.displayName });
    }
    
    return await getUserByEmail(email);
  } catch (error) {
    throw error;
  }
};

/**
 * Get user orders
 * @param {string} email - User email
 * @param {number} limit - Number of orders to fetch
 * @returns {Promise<Array>} Array of user orders
 */
const getUserOrders = async (email, limit = 5) => {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    
    const snapshot = await firestore.collection('orders')
      .where('userEmail', '==', email)
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
 * @param {string} email - User email
 * @param {number} limit - Number of transactions to fetch
 * @returns {Promise<Array>} Array of user transactions
 */
const getUserTransactions = async (email, limit = 5) => {
  try {
    const snapshot = await firestore.collection('transactions')
      .where('userEmail', '==', email)
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
  getUserByEmail,
  getUsers,
  updateUserStatus,
  updateUserProfile,
  getUserOrders,
  getUserTransactions
}; 