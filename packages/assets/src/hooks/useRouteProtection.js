import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useHistory from './useHistory'; // Import our compatibility hook
import { useAuth } from './useAuth';

/**
 * Custom hook for protecting routes and preserving location on page refreshes
 * 
 * @param {Object} options Configuration options
 * @param {boolean} options.requireAuth Whether authentication is required
 * @param {string[]} options.requiredRoles Array of roles allowed to access the route
 * @param {string} options.redirectTo Path to redirect to if access is denied
 * @returns {Object} Auth status information
 */
export const useRouteProtection = ({
  requireAuth = true,
  requiredRoles = [],
  redirectTo = '/login'
}) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const history = useHistory(); // Use our compatibility hook
  
  // Save current location to session storage if not in an auth page
  useEffect(() => {
    if (!loading && location.pathname !== '/login' && 
        location.pathname !== '/register' && 
        location.pathname !== '/reset-password') {
      sessionStorage.setItem('lastPath', location.pathname + location.search);
    }
  }, [location, loading]);
  
  // Handle route protection
  useEffect(() => {
    if (loading) return; // Wait for auth to load
    
    // If auth is required but user is not logged in
    if (requireAuth && !currentUser) {
      // Store the intended destination
      sessionStorage.setItem('intendedPath', location.pathname + location.search);
      history.replace(redirectTo);
      return;
    }
    
    // If specific roles are required
    if (requiredRoles.length > 0 && currentUser) {
      const userRole = userProfile?.role || 'user';
      
      if (!requiredRoles.includes(userRole)) {
        history.replace('/unauthorized');
        return;
      }
    }
  }, [currentUser, userProfile, loading, requireAuth, requiredRoles, redirectTo, location, history]);
  
  // Function to redirect to last path or intended path
  const redirectToSavedPath = () => {
    const intendedPath = sessionStorage.getItem('intendedPath');
    const lastPath = sessionStorage.getItem('lastPath');
    
    if (intendedPath) {
      sessionStorage.removeItem('intendedPath');
      history.replace(intendedPath);
    } else if (lastPath) {
      history.replace(lastPath);
    } else {
      history.replace('/');
    }
  };
  
  return {
    isAuthenticated: !!currentUser,
    userRole: userProfile?.role,
    loading,
    redirectToSavedPath
  };
};

export default useRouteProtection; 