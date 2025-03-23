import * as adminService from '../services/adminService.js';
import { CustomError } from '../exceptions/customError.js';
import { admin, db } from '../config/firebase.js';

/**
 * Get admin dashboard data 
 * This controller handles fetching all necessary data for the admin dashboard,
 * including statistics, recent orders, users, and pending approvals
 */
export const getDashboard = async (ctx) => {
  try {
    console.log('[AdminController] Fetching dashboard data');
    
    // Get users count
    const usersSnapshot = await db.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;
    
    // Get new users in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsersSnapshot = await db.collection('users')
      .where('createdAt', '>=', thirtyDaysAgo)
      .count()
      .get();
    const newUsers = newUsersSnapshot.data().count;
    
    // Get orders count
    const ordersSnapshot = await db.collection('orders').count().get();
    const totalOrders = ordersSnapshot.data().count;
    
    // Get pending orders count
    const pendingOrdersSnapshot = await db.collection('orders')
      .where('status', '==', 'pending')
      .count()
      .get();
    const pendingOrders = pendingOrdersSnapshot.data().count;
    
    // Get total revenue
    const ordersQuery = await db.collection('orders')
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
    const recentOrdersQuery = await db.collection('orders')
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
    const recentUsersQuery = await db.collection('users')
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
    const pendingApprovalsSnapshot = await db.collection('users')
      .where('status', '==', 'pending_approval')
      .count()
      .get();
    const pendingApprovals = pendingApprovalsSnapshot.data().count;
    
    // Compile the dashboard data
    const dashboardData = {
      stats: {
        totalUsers,
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
    const { page = 1, limit = 10, status, search } = ctx.query;
    
    // Parse to numbers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    
    // Validate
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      throw new CustomError('Invalid pagination parameters', 400);
    }
    
    // Use the service to get users
    const result = await adminService.getUsers({
      page: pageNumber,
      limit: limitNumber,
      status,
      search
    });
    
    // Return success response with users data and pagination
    ctx.body = {
      success: true,
      data: {
        users: result.users,
        totalUsers: result.totalUsers,
        totalPages: result.totalPages,
        currentPage: pageNumber
      }
    };
  } catch (error) {
    console.error('Error in getUsers controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch users'
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
    
    // Use the service to get user details
    const user = await adminService.getUserById(userId);
    
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
    
    // Use the service to approve user
    await adminService.updateUserStatus(userId, 'active');
    
    // Return success response
    ctx.body = {
      success: true,
      message: 'User approved successfully'
    };
  } catch (error) {
    console.error('Error in approveUser controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to approve user'
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
    
    // Use the service to reject user
    await adminService.updateUserStatus(userId, 'rejected');
    
    // Return success response
    ctx.body = {
      success: true,
      message: 'User rejected successfully'
    };
  }
  catch (error) {
    console.error('Error in rejectUser controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to reject user'
    };
  }
};

/**
 * Update user status
 * This controller handles updating a user's status (activate, deactivate)
 */
export const updateUserStatus = async (ctx) => {
  try {
    const { userId } = ctx.params;
    const { status } = ctx.req.body;
    
    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }
    
    if (!status || !['active', 'inactive', 'pending', 'rejected'].includes(status)) {
      throw new CustomError('Valid status is required', 400);
    }
    
    // Use the service to update user status
    await adminService.updateUserStatus(userId, status);
    
    // Return success response
    ctx.body = {
      success: true,
      message: `User status updated to ${status} successfully`
    };
  } catch (error) {
    console.error('Error in updateUserStatus controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to update user status'
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
    
    // Use the service to get user orders
    const orders = await adminService.getUserOrders(userId, limitNumber);
    
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
    
    // Use the service to get user transactions
    const transactions = await adminService.getUserTransactions(userId, limitNumber);
    
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
    
    // Use the service to update user
    const updatedUser = await adminService.updateUserProfile(userId, userData);
    
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