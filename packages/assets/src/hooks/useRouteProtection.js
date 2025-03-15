import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const history = useHistory(); // Use our compatibility hook
  
  useEffect(() => {
    const checkAuth = async () => {
      // Wait until auth state is no longer loading
      if (loading) return;

      // Get current path
      const currentPath = location.pathname;
      
      // Check if user is authenticated
      const isAuthenticated = !!currentUser;
      
      // Check if user profile exists
      const hasProfile = !!userProfile;
      
      // Check if current path requires authentication
      const requiresAuth = !['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(currentPath);
      
      // Check if user is admin
      const isAdmin = userProfile?.role === 'admin';
      
      // Debug information
      console.log('Route protection check:', {
        currentPath,
        isAuthenticated,
        hasProfile,
        requiresAuth,
        isAdmin
      });
      
      // If path requires auth but user is not authenticated, redirect to login
      if (requiresAuth && !isAuthenticated) {
        console.log('Protected route but user not authenticated, redirecting to login');
        sessionStorage.setItem('intendedPath', currentPath + location.search);
        navigate('/login', { replace: true });
        return;
      }
      
      // If user is authenticated but doesn't have a profile, redirect to login
      if (requiresAuth && isAuthenticated && !hasProfile) {
        console.log('User authenticated but profile missing, redirecting to login');
        navigate('/login', { replace: true });
        return;
      }
      
      // Admin routes protection
      if (currentPath.startsWith('/admin') && (!isAuthenticated || !isAdmin)) {
        console.log('Admin route but user is not admin, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }
      
      // If user is authenticated and on auth pages, redirect to appropriate dashboard
      if (isAuthenticated && hasProfile && ['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(currentPath)) {
        console.log('User authenticated but on auth page, redirecting to dashboard');
        navigate(isAdmin ? '/admin/dashboard' : '/dashboard', { replace: true });
        return;
      }
    };

    checkAuth();
  }, [currentUser, userProfile, loading, location, navigate]);

  // Function to redirect to last path or intended path
  const redirectToSavedPath = () => {
    const intendedPath = sessionStorage.getItem('intendedPath');
    const lastPath = sessionStorage.getItem('lastPath');
    
    if (intendedPath) {
      sessionStorage.removeItem('intendedPath');
      navigate(intendedPath);
    } else if (lastPath) {
      navigate(lastPath);
    } else {
      navigate('/');
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