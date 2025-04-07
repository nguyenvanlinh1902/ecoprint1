import { useAdmin } from '../context/AdminContext';

/**
 * Safe hook for admin context
 * Returns default values when context is not available 
 * Prevents errors in components using admin context when it's not wrapped in AdminProvider
 */
export function useSafeAdmin() {
  const context = useAdmin();
  
  // If context is not available, return default values
  if (!context) {
    return {
      // Users default values
      users: [],
      usersLoading: false,
      usersError: null,
      getUserById: () => null,
      getUserByEmail: () => null,
      getUsersByRole: () => [],
      getAllUsers: () => [],
      refreshUsers: () => Promise.resolve([]),
      updateUser: () => Promise.resolve(null),
      updateUserInContext: () => {},
      getFullUserDetails: () => Promise.resolve(null),
      searchUsers: () => [],
      
      // Products default values
      products: [],
      productsLoading: false,
      productsError: null,
      refreshProducts: () => Promise.resolve([]),
      
      // Transactions default values
      transactions: [],
      transactionsLoading: false,
      transactionsError: null,
      
      // Context status
      isContextAvailable: false
    };
  }
  
  // Return the actual context values
  return context;
}

export default useSafeAdmin; 