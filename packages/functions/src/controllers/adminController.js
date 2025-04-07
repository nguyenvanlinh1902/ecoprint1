import { CustomError } from '../exceptions/customError.js';
import { admin } from '../config/firebaseAdmin.js';
import transactionRepository from '../repositories/transactionRepository.js';
import userRepository from '../repositories/userRepository.js';

const firestore = admin.firestore();

/**
 * Get admin dashboard data 
 * This controller handles fetching all necessary data for the admin dashboard,
 * including statistics, recent orders, users, and pending approvals
 */
export const getDashboard = async (ctx) => {
  try {
    // Lấy thông tin user từ header hoặc body
    const userEmail = ctx.req.headers['x-user-email'] || ctx.req.body?.email;
    const userRole = ctx.req.headers['x-user-role'] || ctx.req.body?.role;
    
    // Kiểm tra quyền admin
    if (!userEmail || userRole !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: "Unauthorized access",
        code: "unauthorized",
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    const usersSnapshot = await firestore.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsersSnapshot = await firestore.collection('users')
      .where('createdAt', '>=', thirtyDaysAgo)
      .count()
      .get();
    const newUsers = newUsersSnapshot.data().count;
    
    // Get products count
    const productsSnapshot = await firestore.collection('products').count().get();
    const totalProducts = productsSnapshot.data().count;
    
    // Get orders count
    const ordersSnapshot = await firestore.collection('orders').count().get();
    const totalOrders = ordersSnapshot.data().count;
    
    // Get pending orders count
    const pendingOrdersSnapshot = await firestore.collection('orders')
      .where('status', '==', 'pending')
      .count()
      .get();
    const pendingOrders = pendingOrdersSnapshot.data().count;
    
    // Get total revenue
    const ordersQuery = await firestore.collection('orders')
      .where('status', '!=', 'cancelled')
      .get();
    
    let totalRevenue = 0;
    ordersQuery.forEach(doc => {
      const order = doc.data();
      if (order.total) {
        totalRevenue += Number(order.total);
      }
    });
    
    // Get recent orders
    const recentOrdersQuery = await firestore.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    const recentOrders = [];
    recentOrdersQuery.forEach(doc => {
      const order = doc.data();
      recentOrders.push({
        id: doc.id,
        ...order,
        createdAt: order.createdAt ? order.createdAt.toDate() : null
      });
    });
    
    // Get recent users
    const recentUsersQuery = await firestore.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    const recentUsers = [];
    recentUsersQuery.forEach(doc => {
      const user = doc.data();
      recentUsers.push({
        id: doc.id,
        ...user,
        createdAt: user.createdAt ? user.createdAt.toDate() : null
      });
    });
    
    // Get pending approval users count
    const pendingApprovalsSnapshot = await firestore.collection('users')
      .where('status', '==', 'pending_approval')
      .count()
      .get();
    const pendingApprovals = pendingApprovalsSnapshot.data().count;
    
    // Compile the dashboard data
    const dashboardData = {
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        pendingOrders,
        totalRevenue,
        newUsers
      },
      recentOrders,
      recentUsers,
      pendingApprovals
    };
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: dashboardData
    };
    
  } catch (error) {
    console.error('[AdminController] Error fetching dashboard data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    };
  }
};

/**
 * Get users list for admin
 * This controller handles fetching users with optional filtering and pagination
 */
export const getUsers = async (ctx) => {
  try {
    console.log('Admin getUsers - Getting all users with role "user"');
    
    // Use the repository to get all users with role "user"
    const result = await userRepository.getUsers({
      limit: 1000, // Lấy tối đa 1000 người dùng (thực tế là tất cả)
      role: 'user'  // Chỉ lấy người dùng có role là "user"
    });
    
    // Return success response with users data
    ctx.body = {
      success: true,
      data: {
        users: result.users,
        totalUsers: result.totalUsers,
        totalPages: 1,
        currentPage: 1
      }
    };
  } catch (error) {
    console.error('Error in getUsers controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch users',
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Get user detail for admin
 * This controller handles fetching a specific user's details
 */
export const getUserById = async (ctx) => {
  try {
    const { userId } = ctx.params;
    
    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }
    
    // Use the repository to get user details
    const user = await userRepository.getUserById(userId);
    
    if (!user) {
      throw new CustomError('User not found', 404);
    }
    
    // Return success response with user data
    ctx.body = {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('Error in getUserById controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch user details'
    };
  }
};

/**
 * Approve user
 * This controller handles approving a pending user
 */
export const approveUser = async (ctx) => {
  try {
    const { userId } = ctx.params;
    
    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }
    
    console.log(`Admin approveUser - Approving user with ID: ${userId}`);
    
    // Use the repository function that accepts userId
    const updatedUser = await userRepository.updateUserStatusById(userId, 'active');
    
    console.log(`Admin approveUser - User approved successfully: ${updatedUser.email}`);
    
    // Return success response
    ctx.body = {
      success: true,
      message: 'User approved successfully',
      data: updatedUser
    };
  } catch (error) {
    console.error('Error in approveUser controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to approve user',
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Reject user
 * This controller handles rejecting a pending user
 */
export const rejectUser = async (ctx) => {
  try {
    const { userId } = ctx.params;
    
    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }
    
    console.log(`Admin rejectUser - Rejecting user with ID: ${userId}`);
    
    // Use the repository function that accepts userId
    const updatedUser = await userRepository.updateUserStatusById(userId, 'rejected');
    
    console.log(`Admin rejectUser - User rejected successfully: ${updatedUser.email}`);
    
    // Return success response
    ctx.body = {
      success: true,
      message: 'User rejected successfully',
      data: updatedUser
    };
  }
  catch (error) {
    console.error('Error in rejectUser controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to reject user',
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Update user status
 * This controller handles updating a user's status (activate, deactivate)
 */
export const updateUserStatus = async (ctx) => {
  try {
    const { userId, action } = ctx.params;
    const { status } = ctx.req.body || {};
    
    // Determine status from action or body
    let finalStatus = status;
    
    if (action) {
      switch (action) {
        case 'activate':
          finalStatus = 'active';
          break;
        case 'deactivate':
          finalStatus = 'inactive';
          break;
        default:
          // Keep the status from body if action not recognized
          break;
      }
    }
    
    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }
    
    if (!finalStatus || !['active', 'inactive', 'pending', 'rejected'].includes(finalStatus)) {
      throw new CustomError('Valid status is required', 400);
    }
    
    console.log(`Admin updateUserStatus - Updating status for user ${userId} to ${finalStatus}`);
    
    // Use the repository function that accepts userId
    const updatedUser = await userRepository.updateUserStatusById(userId, finalStatus);
    
    console.log(`Admin updateUserStatus - Updated status successfully for user: ${updatedUser.email}`);
    
    // Return success response
    ctx.body = {
      success: true,
      message: `User status updated to ${finalStatus} successfully`,
      data: updatedUser
    };
  } catch (error) {
    console.error('Error in updateUserStatus controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to update user status',
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Get orders for a specific user
 * This controller handles fetching a user's orders
 */
export const getUserOrders = async (ctx) => {
  try {
    const { userId } = ctx.params;
    const { limit = 5 } = ctx.query;
    
    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }
    
    // Parse limit to number
    const limitNumber = parseInt(limit, 10);
    if (isNaN(limitNumber) || limitNumber < 1) {
      throw new CustomError('Invalid limit parameter', 400);
    }
    
    // Use the repository to get user orders
    const orders = await userRepository.getUserOrders(userId, limitNumber);
    
    // Return success response with orders data
    ctx.body = {
      success: true,
      data: orders
    };
  } catch (error) {
    console.error('Error in getUserOrders controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch user orders'
    };
  }
};

/**
 * Get transactions for a specific user
 * This controller handles fetching a user's transactions
 */
export const getUserTransactions = async (ctx) => {
  try {
    const { userId } = ctx.params;
    const { limit = 5 } = ctx.query;
    
    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }
    
    // Parse limit to number
    const limitNumber = parseInt(limit, 10);
    if (isNaN(limitNumber) || limitNumber < 1) {
      throw new CustomError('Invalid limit parameter', 400);
    }
    
    // Use the repository to get user transactions
    const transactions = await userRepository.getUserTransactions(userId, limitNumber);
    
    // Return success response with transactions data
    ctx.body = {
      success: true,
      data: transactions
    };
  } catch (error) {
    console.error('Error in getUserTransactions controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch user transactions'
    };
  }
};

/**
 * Update user profile
 * This controller handles updating a user's profile information
 */
export const updateUser = async (ctx) => {
  try {
    const { userId } = ctx.params;
    const userData = ctx.req.body;
    
    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }
    
    // Basic validation
    if (!userData || Object.keys(userData).length === 0) {
      throw new CustomError('User data is required', 400);
    }
    
    // Use the repository to update user
    const updatedUser = await userRepository.updateUserProfile(userId, userData);
    
    // Return success response
    ctx.body = {
      success: true,
      data: updatedUser,
      message: 'User profile updated successfully'
    };
  } catch (error) {
    console.error('Error in updateUser controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to update user profile'
    };
  }
};

/**
 * Get all transactions for admin
 * This controller handles fetching all transactions with filtering and pagination
 */
export const getAllTransactions = async (ctx) => {
  try {
    const { page = 1, limit = 10, type, status, startDate, endDate, userId, search } = ctx.query;
    
    // Parse to numbers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    
    // Validate
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      throw new CustomError('Invalid pagination parameters', 400);
    }
    
    // Create filters
    const filters = {
      page: pageNumber,
      limit: limitNumber,
      type,
      status,
      startDate,
      endDate,
      userId,
      search
    };
    
    // Use the repository to get transactions
    const result = await transactionRepository.getAllTransactions(filters);
    
    // Return success response with transactions data and pagination
    ctx.status = 200;
    ctx.body = {
      success: true,
      transactions: result.transactions,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('Error in getAllTransactions controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch transactions',
      error: error.message
    };
  }
};

/**
 * Get transaction by id for admin
 * This controller handles fetching a specific transaction's details
 */
export const getTransactionById = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    
    if (!transactionId) {
      throw new CustomError('Transaction ID is required', 400);
    }
    
    // Use the repository to get transaction details
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      throw new CustomError('Transaction not found', 404);
    }
    
    // Return success response with transaction data
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: transaction
    };
  } catch (error) {
    console.error('Error in getTransactionById controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch transaction details',
      error: error.message
    };
  }
};

/**
 * Approve transaction
 * This controller handles approving a pending transaction
 */
export const approveTransaction = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    
    if (!transactionId) {
      throw new CustomError('Transaction ID is required', 400);
    }
    
    // Get transaction
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      throw new CustomError('Transaction not found', 404);
    }
    
    if (transaction.status !== 'pending') {
      throw new CustomError('Only pending transactions can be approved', 400);
    }
    
    // Use transactionRepository to approve the transaction
    // This will handle everything including finding the user by email
    await transactionRepository.approveTransaction(transactionId);
    
    // Return success response
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Transaction approved successfully'
    };
  } catch (error) {
    console.error('Error in approveTransaction controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to approve transaction',
      error: error.message
    };
  }
};

/**
 * Reject transaction
 * This controller handles rejecting a pending transaction
 */
export const rejectTransaction = async (ctx) => {
  try {
    const { transactionId } = ctx.params;
    const { reason } = ctx.req.body;
    
    if (!transactionId) {
      throw new CustomError('Transaction ID is required', 400);
    }
    
    // Get transaction
    const transaction = await transactionRepository.getTransactionById(transactionId);
    
    if (!transaction) {
      throw new CustomError('Transaction not found', 404);
    }
    
    if (transaction.status !== 'pending') {
      throw new CustomError('Only pending transactions can be rejected', 400);
    }
    
    // Kiểm tra lý do từ chối và đảm bảo không trống
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      throw new CustomError('Rejection reason is required', 400);
    }
    
    // Update transaction status
    await transactionRepository.updateTransactionStatus(
      transactionId, 
      'rejected', 
      reason.trim()
    );
    
    // Return success response
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Transaction rejected successfully'
    };
  } catch (error) {
    console.error('Error in rejectTransaction controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to reject transaction',
      error: error.message
    };
  }
};

/**
 * Create a new transaction (admin only)
 * This controller handles creating a new transaction for a user
 */
export const createTransaction = async (ctx) => {
  try {
    const { userId, type, amount, description, status = 'completed' } = ctx.req.body;
    
    // Validate required fields
    if (!userId || !type || !amount) {
      throw new CustomError('User ID, type, and amount are required', 400);
    }
    
    // Validate amount
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      throw new CustomError('Amount must be a positive number', 400);
    }
    
    // Validate type
    const validTypes = ['deposit', 'withdrawal', 'refund', 'adjustment'];
    if (!validTypes.includes(type)) {
      throw new CustomError(`Type must be one of: ${validTypes.join(', ')}`, 400);
    }
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'rejected', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new CustomError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }
    
    // Check if user exists
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new CustomError('User not found', 404);
    }
    
    // Create transaction
    const transactionRef = firestore.collection('transactions').doc();
    
    // Handle balance update if transaction is completed
    if (status === 'completed') {
      await admin.firestore().runTransaction(async (t) => {
        // Get updated user data
        const userData = userDoc.data();
        
        // Calculate new balance based on transaction type
        let balanceChange = amountNumber;
        if (type === 'withdrawal') {
          balanceChange = -amountNumber;
          
          // Check if user has enough balance for withdrawal
          if ((userData.balance || 0) < amountNumber) {
            throw new CustomError('User does not have enough balance for this withdrawal', 400);
          }
        }
        
        const newBalance = (userData.balance || 0) + balanceChange;
        
        // Update user balance
        t.update(firestore.collection('users').doc(userId), {
          balance: newBalance,
          updatedAt: new Date()
        });
        
        // Create transaction
        t.set(transactionRef, {
          userId,
          type,
          amount: amountNumber,
          description: description || `Manual ${type} by admin`,
          status,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    } else {
      // Create transaction without updating balance
      await transactionRef.set({
        userId,
        type,
        amount: amountNumber,
        description: description || `Manual ${type} by admin`,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Return success response
    ctx.status = 201;
    ctx.body = {
      success: true,
      message: 'Transaction created successfully',
      transactionId: transactionRef.id
    };
  } catch (error) {
    console.error('Error in createTransaction controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to create transaction',
      error: error.message
    };
  }
}; 