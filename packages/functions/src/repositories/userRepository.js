import { admin, auth } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

const firestore = admin.firestore();
const userProfilesCollection = firestore.collection('userProfiles');
/**
 *
 * @param email
 * @param password
 * @returns {Promise<*|UserRecord>}
 */
const verifyUserCredentials = async (email, password) => {
  try {
    const userProfile = await getUserByEmail(email);
    if (!userProfile) {
      throw new Error('Authentication failed');
    }

    const firebaseUid = userProfile.uid || userProfile.id;

    try {
      const userRecord = await auth.getUser(firebaseUid);
      
      if (userRecord.disabled && userProfile.status === 'active') {
        await auth.updateUser(firebaseUid, { disabled: false });
      }
      
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + "!1";
        
        const newUserRecord = await auth.createUser({
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
      role,
      email
    } = options;
    
    console.log('getUsers options:', JSON.stringify(options, null, 2));
    
    // Always use userProfilesCollection instead of usersCollection
    let query = userProfilesCollection;
    
    console.log('Querying collection: userProfiles');
    
    // Apply where clauses for status and role
    if (status) {
      console.log(`Adding status filter: ${status}`);
      query = query.where('status', '==', status);
    }
    
    if (role) {
      console.log(`Adding role filter: ${role}`);
      query = query.where('role', '==', role);
    }
    
    // If email is specified, add it as a filter
    if (email) {
      console.log(`Adding email filter: ${email}`);
      query = query.where('email', '==', email);
    }
    
    // For search queries, we need client-side filtering
    if (search) {
      console.log(`Adding search filter: ${search}`);
      // We need to perform a client-side filtering for search terms
      // since Firestore doesn't support full text search
      const snapshot = await query.get();
      
      console.log(`Search query returned ${snapshot.size} results before filtering`);
      
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
      
      console.log(`Found ${filteredDocs.length} documents after filtering for search term: ${search}`);
      
      // Client-side pagination
      const startIdx = (page - 1) * limit;
      const endIdx = startIdx + limit;
      
      const paginatedUsers = filteredDocs
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) // Sort by createdAt desc, handle null values
        .slice(startIdx, endIdx);
      
      console.log(`Returning ${paginatedUsers.length} users for page ${page} with limit ${limit}`);
      
      return {
        users: paginatedUsers,
        totalUsers: filteredDocs.length,
        currentPage: page,
        totalPages: Math.ceil(filteredDocs.length / limit)
      };
    } else {
      // For non-search queries, use Firestore pagination
      console.log('Executing standard query without search term');
      
      try {
        // Get total count
        const countSnapshot = await query.count().get();
        const totalUsers = countSnapshot.data().count;
        
        console.log(`Total users count: ${totalUsers}`);
        
        // Apply pagination
        const offset = (page - 1) * limit;
        
        // Handle potential ordering issues with nulls
        query = query.orderBy('createdAt', 'desc')
                    .limit(limit)
                    .offset(offset);
        
        const snapshot = await query.get();
        
        console.log(`Query returned ${snapshot.size} documents`);
        
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
        
        console.log(`Processed ${users.length} users, returning results`);
        
        return {
          users,
          totalUsers,
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit)
        };
      } catch (error) {
        // Log the error for debugging
        console.error('Error in standard query:', error);
        
        // Fallback to get all documents and handle pagination in memory
        console.log('Falling back to fetching all documents');
        
        const snapshot = await query.get();
        
        const allUsers = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          allUsers.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
          });
        });
        
        // Sort and paginate in memory
        const sortedUsers = allUsers.sort((a, b) => 
          ((b.createdAt instanceof Date ? b.createdAt : new Date(0)) - 
           (a.createdAt instanceof Date ? a.createdAt : new Date(0))));
        
        const startIdx = (page - 1) * limit;
        const paginatedUsers = sortedUsers.slice(startIdx, startIdx + limit);
        
        console.log(`Fallback returned ${paginatedUsers.length} users out of ${allUsers.length} total`);
        
        return {
          users: paginatedUsers,
          totalUsers: allUsers.length,
          currentPage: page,
          totalPages: Math.ceil(allUsers.length / limit)
        };
      }
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
        await auth.updateUser(user.uid, { disabled: true });
      } else if (status === 'active') {
        await auth.updateUser(user.uid, { disabled: false });
      }
    }
    
    return await getUserByEmail(email);
  } catch (error) {
    throw error;
  }
};

/**
 * Update user status by ID
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated user object
 */
const updateUserStatusById = async (userId, status) => {
  try {
    console.log(`Updating user status: ID=${userId}, status=${status}`);
    
    const validStatuses = ['active', 'inactive', 'pending', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    // Get the user document
    const userDoc = await userProfilesCollection.doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const userData = userDoc.data();
    console.log(`Found user with email: ${userData.email}`);
    
    // Update status in Firestore
    await userProfilesCollection.doc(userId).update({
      status,
      updatedAt: new Date()
    });
    
    console.log(`Updated status in Firestore for user ${userId}`);
    
    // Update user in Firebase Authentication if UID exists
    if (userData.uid) {
      try {
        if (status === 'inactive') {
          console.log(`Disabling Firebase account for UID ${userData.uid}`);
          await auth.updateUser(userData.uid, { disabled: true });
        } else if (status === 'active') {
          console.log(`Enabling Firebase account for UID ${userData.uid}`);
          await auth.updateUser(userData.uid, { disabled: false });
        }
      } catch (authError) {
        console.error('Error updating Firebase Auth user:', authError);
        // Continue even if Firebase Auth update fails
      }
    }
    
    // Return updated user
    const updatedDoc = await userProfilesCollection.doc(userId).get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data().createdAt ? updatedDoc.data().createdAt.toDate() : null,
      updatedAt: updatedDoc.data().updatedAt ? updatedDoc.data().updatedAt.toDate() : null
    };
  } catch (error) {
    console.error('Error in updateUserStatusById:', error);
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
      await auth.updateUser(user.uid, { displayName: safeData.displayName });
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
  updateUserStatusById,
  updateUserProfile,
  getUserOrders,
  getUserTransactions
}; 