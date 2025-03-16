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
export const useRouteProtection = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const history = useHistory(); // Use our compatibility hook
  
  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;
      const currentPath = location.pathname;
      
      const isAuthenticated = !!currentUser;
      
      const hasProfile = !!userProfile;
      
      const requiresAuth = !['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(currentPath);
      
      // Check if user is admin
      const isAdmin = userProfile?.role === 'admin';

      if (requiresAuth && !isAuthenticated) {
        sessionStorage.setItem('intendedPath', currentPath + location.search);
        history.replace('/login');
        return;
      }
      
      if (requiresAuth && isAuthenticated && !hasProfile) {
        history.replace('/login');
        return;
      }
      
      if (currentPath.startsWith('/admin') && (!isAuthenticated || !isAdmin)) {
        history.replace('/dashboard');
        return;
      }
      
      if (isAuthenticated && hasProfile && ['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(currentPath)) {
        history.replace(isAdmin ? '/admin/dashboard' : '/dashboard');
        return;
      }
    };

    checkAuth();
  }, [currentUser, userProfile, loading, location, history]);

  const redirectToSavedPath = () => {
    const intendedPath = sessionStorage.getItem('intendedPath');
    const lastPath = sessionStorage.getItem('lastPath');
    
    if (intendedPath) {
      sessionStorage.removeItem('intendedPath');
      history.push(intendedPath);
    } else if (lastPath) {
      history.push(lastPath);
    } else {
      history.push('/');
    }
  };
  
  return {
    isAuthenticated: !!currentUser && !!userProfile,
    isAdmin: userProfile?.role === 'admin',
    loading,
    redirectToSavedPath
  };
};

export default useRouteProtection; 