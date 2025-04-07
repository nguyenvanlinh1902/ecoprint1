import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

// Create context
const AdminContext = createContext();

// Custom hook to use admin context
export const useAdmin = () => useContext(AdminContext);

/**
 * Admin Provider Component
 * Provides admin data and functions to all admin components
 */
export const AdminProvider = ({ children }) => {
  // Users data state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [lastUsersFetch, setLastUsersFetch] = useState(null);
  
  // Products data state
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  
  // Orders data state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  
  // Transactions data state
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);
  
  // Fetch all users once when admin section loads
  const fetchAllUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      
      const response = await api.admin.getUsers({ limit: 500 }); // Get a large batch of users
      
      if (response.data && response.data.data && response.data.data.users) {
        setUsers(response.data.data.users);
        setLastUsersFetch(new Date());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
      setUsersError('Failed to load users. Please try again.');
    } finally {
      setUsersLoading(false);
    }
  }, []);
  
  // Load users on mount
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);
  
  // Fetch all products 
  const fetchAllProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      
      const response = await api.products.getAll(); 
      
      if (response.data) {
        setProducts(response.data);
      } else {
        throw new Error('Invalid products response format');
      }
    } catch (error) {
      console.error('Error fetching all products:', error);
      setProductsError('Failed to load products. Please try again.');
    } finally {
      setProductsLoading(false);
    }
  }, []);
  
  // Fetch user's recent orders
  const fetchUserOrders = useCallback(async (userId) => {
    if (!userId) return [];
    
    try {
      const response = await api.admin.getUserOrders(userId);
      return response.data?.data || [];
    } catch (error) {
      console.error(`Error fetching orders for user ${userId}:`, error);
      return [];
    }
  }, []);
  
  // Fetch user's recent transactions
  const fetchUserTransactions = useCallback(async (userId) => {
    if (!userId) return [];
    
    try {
      const response = await api.admin.getUserTransactions(userId);
      return response.data?.data || [];
    } catch (error) {
      console.error(`Error fetching transactions for user ${userId}:`, error);
      return [];
    }
  }, []);
  
  // Helper function to get user by ID
  const getUserById = useCallback((userId) => {
    return users.find(user => user.id === userId) || null;
  }, [users]);
  
  // Helper function to get user by email
  const getUserByEmail = useCallback((email) => {
    return users.find(user => user.email === email) || null;
  }, [users]);
  
  // Helper function to get users by role
  const getUsersByRole = useCallback((role) => {
    if (!role) return users;
    return users.filter(user => user.role === role);
  }, [users]);
  
  // Refresh users data
  const refreshUsers = useCallback(() => {
    // Nếu dữ liệu được lấy cách đây chưa quá 5 phút, không cần fetch lại
    if (lastUsersFetch && (new Date() - lastUsersFetch) < 5 * 60 * 1000) {
      console.log('Using cached users data');
      return Promise.resolve(users);
    }
    
    return fetchAllUsers();
  }, [fetchAllUsers, lastUsersFetch, users]);
  
  // Refresh products data
  const refreshProducts = useCallback(() => {
    return fetchAllProducts();
  }, [fetchAllProducts]);
  
  // Update local user data
  const updateUserInContext = useCallback((userId, newData) => {
    setUsers(prevUsers => {
      const index = prevUsers.findIndex(user => user.id === userId);
      if (index === -1) return prevUsers;
      
      const updatedUsers = [...prevUsers];
      updatedUsers[index] = { ...updatedUsers[index], ...newData };
      return updatedUsers;
    });
  }, []);
  
  // Update a user and refresh the context
  const updateUser = useCallback(async (userId, userData) => {
    try {
      const response = await api.admin.updateUser(userId, userData);
      if (response.data && response.data.data) {
        // Update user in context
        updateUserInContext(userId, response.data.data);
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [updateUserInContext]);
  
  // Helper method to get latest information for a user
  const getFullUserDetails = useCallback(async (userId) => {
    try {
      if (!userId) return null;
      
      // Get base user data
      const user = getUserById(userId);
      if (!user) return null;
      
      // Get user's recent orders and transactions
      const [orders, transactions] = await Promise.all([
        fetchUserOrders(userId),
        fetchUserTransactions(userId)
      ]);
      
      return {
        ...user,
        orders,
        transactions
      };
    } catch (error) {
      console.error('Error getting full user details:', error);
      return getUserById(userId);
    }
  }, [fetchUserOrders, fetchUserTransactions, getUserById]);
  
  // Search users by name or email
  const searchUsers = useCallback((term) => {
    if (!term) return users;
    
    const searchTerm = term.toLowerCase();
    return users.filter(user => {
      return (
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchTerm)) ||
        (user.companyName && user.companyName.toLowerCase().includes(searchTerm))
      );
    });
  }, [users]);
  
  // Context value
  const contextValue = {
    // Users
    users,
    usersLoading,
    usersError,
    getUserById,
    getUserByEmail,
    getUsersByRole,
    getAllUsers: () => users,
    refreshUsers,
    updateUser,
    updateUserInContext,
    getFullUserDetails,
    searchUsers,
    
    // Products
    products,
    productsLoading,
    productsError,
    refreshProducts,
    
    // Transactions
    transactions,
    transactionsLoading,
    
    // Helper to check if context is available
    isContextAvailable: true
  };
  
  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContext; 