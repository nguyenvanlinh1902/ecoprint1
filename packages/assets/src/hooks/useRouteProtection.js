import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useHistory from './useHistory'; // Import our compatibility hook
import { useApp } from '../context/AppContext';

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
  const { user, token, loading, isAdmin } = useApp();
  const location = useLocation();
  const history = useHistory(); // Use our compatibility hook
  
  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;
      const currentPath = location.pathname;
      
      const isAuthenticated = !!token && !!user;
      
      const requiresAuth = !['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'].includes(currentPath);
      
      if (requiresAuth && !isAuthenticated) {
        sessionStorage.setItem('intendedPath', currentPath + location.search);
        history.replace('/auth/login');
        return;
      }
      
      if (currentPath.startsWith('/admin') && (!isAuthenticated || !isAdmin)) {
        history.replace('/dashboard');
        return;
      }
      
      if (isAuthenticated && ['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'].includes(currentPath)) {
        history.replace(isAdmin ? '/admin/dashboard' : '/dashboard');
        return;
      }
    };

    checkAuth();
  }, [user, token, loading, isAdmin, location, history]);

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
    isAuthenticated: !!user && !!token,
    isAdmin,
    loading,
    redirectToSavedPath
  };
};

export default useRouteProtection; 