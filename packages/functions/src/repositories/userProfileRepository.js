/**
 * Repository for user profile operations
 */
import {Firestore} from '@google-cloud/firestore';
const firestore = new Firestore();
const collection = firestore.collection('userProfiles');
/**
 * Format user profile document
 * @param {Object} doc - Firestore document
 * @returns {Object} Formatted user profile object
 */
const formatUserProfile = (doc) => {
  if (!doc.exists) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
  };
};

/**
 * Create a new user profile
 * @param {Object} userData - User profile data
 * @returns {Promise<Object>} Created user profile
 */
const createUserProfile = async (userData) => {
  try {
    const {id} = await collection.add({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return {success: true, id, ...userData};
  } catch (error) {
    throw error;
  }
};

/**
 * Get user profile by ID
 * @param {string} id - User profile ID
 * @returns {Promise<Object>} User profile object or null if not found
 */
const getUserProfileById = async (id) => {
  try {
    const doc = await collection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const userData = doc.data();
    
    return {
      id: doc.id,
      ...userData,
      createdAt: userData.createdAt ? userData.createdAt.toDate() : null,
      updatedAt: userData.updatedAt ? userData.updatedAt.toDate() : null
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get user profile by email
 * @param {string} email - User email
 * @returns {Promise<Object>} User profile object or null if not found
 */
const getUserProfileByEmail = async (email) => {
  try {
    const snapshot = await collection
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return formatUserProfile(snapshot.docs[0]);
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} id - User profile ID
 * @param {Object} data - User profile data to update
 * @returns {Promise<Object>} Updated user profile
 */
const updateUserProfile = async (id, data) => {
  try {
    const safeData = { ...data };
    
    delete safeData.email;
    delete safeData.id;
    delete safeData.uid;
    delete safeData.createdAt;
    
    safeData.updatedAt = new Date();
    
    await collection.doc(id).update(safeData);
    
    const doc = await collection.doc(id).get();
    return formatUserProfile(doc);
  } catch (error) {
    throw error;
  }
};

/**
 * Update user status
 * @param {string} id - User profile ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated user profile
 */
const updateUserStatus = async (id, status) => {
  try {
    const validStatuses = ['active', 'inactive', 'pending', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    await collection.doc(id).update({
      status,
      updatedAt: new Date()
    });
    
    const doc = await collection.doc(id).get();
    return formatUserProfile(doc);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete user profile
 * @param {string} id - User profile ID
 * @returns {Promise<boolean>} Success status
 */
const deleteUserProfile = async (id) => {
  try {
    await collection.doc(id).delete();
    
    // Auth deletion should be handled separately or through a proper auth service
    // Try-catch removed as auth is not defined
    
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Query user profiles with pagination and filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Object with user profiles and pagination info
 */
const queryUserProfiles = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      role,
      search
    } = options;
    
    const offset = (page - 1) * limit;
    
    let query = collection;
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (role) {
      query = query.where('role', '==', role);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    // Get total count - Note: count() may require different approach in Firestore
    const countSnapshot = await query.get();
    const totalCount = countSnapshot.size;
    
    query = query.limit(limit).offset(offset);
    
    const snapshot = await query.get();
    
    const data = [];
    snapshot.forEach(doc => {
      const userData = formatUserProfile(doc);
      
      if (search && !(
        userData.email.includes(search) || 
        userData.displayName.includes(search) ||
        (userData.companyName && userData.companyName.includes(search))
      )) {
        return;
      }
      
      data.push(userData);
    });
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      data,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Store password reset token
 * @param {string} userId - User ID
 * @param {string} resetToken - Password reset token
 * @param {number} expiryMinutes - Token expiry time in minutes
 * @returns {Promise<boolean>} Success status
 */
const storePasswordReset = async (userId, resetToken, expiryMinutes = 60) => {
  try {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);
    
    await collection.doc(userId).update({
      resetToken,
      resetTokenExpiry: expiryDate,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};

export default {
  createUserProfile,
  getUserProfileById,
  getUserProfileByEmail,
  updateUserProfile,
  updateUserStatus,
  deleteUserProfile,
  queryUserProfiles,
  storePasswordReset
}; 