import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import useHistory from './useHistory';

/**
 * Hook to manage session storage for path redirections
 * This hook safely uses router hooks because it's designed to be used 
 * inside components that are children of BrowserRouter
 */
export const useSessionStorage = () => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const history = useHistory();

  // Store the current path for later use
  useEffect(() => {
    if (!loading && location.pathname !== '/login' && 
        location.pathname !== '/register' && 
        location.pathname !== '/forgot-password' &&
        location.pathname !== '/reset-password') {
      sessionStorage.setItem('lastVisitedPath', location.pathname);
    }
  }, [loading, location.pathname, currentUser]);

  // Function to redirect to the last visited path
  const redirectToLastVisitedPath = () => {
    const intendedPath = sessionStorage.getItem('intendedPath');
    const lastPath = sessionStorage.getItem('lastVisitedPath');
    
    if (intendedPath) {
      sessionStorage.removeItem('intendedPath');
      history.push(intendedPath);
    } else if (lastPath) {
      history.push(lastPath);
    } else {
      history.push('/dashboard');
    }
  };
  
  return {
    redirectToLastVisitedPath,
    storeCurrentPath: () => sessionStorage.setItem('lastVisitedPath', location.pathname),
    storeIntendedPath: (path) => sessionStorage.setItem('intendedPath', path)
  };
};

export default useSessionStorage; 