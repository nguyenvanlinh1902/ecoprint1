import * as adminService from '../services/adminService.js';
import { CustomError } from '../exceptions/customError.js';

/**
 * Get admin dashboard data 
 * This controller handles fetching all necessary data for the admin dashboard,
 * including statistics, recent orders, users, and pending approvals
 */
export const getDashboard = async (ctx) => {
  try {
    // Use the service to get dashboard data
    const dashboardData = await adminService.getDashboardData();
    
    // Return success response with the dashboard data
    ctx.body = {
      success: true,
      data: dashboardData
    };
  } catch (error) {
    console.error('Error in getDashboard controller:', error);
    
    // Handle errors
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to fetch dashboard data'
    };
  }
}; 