import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/**
 * Hook to track route changes and update the app context
 */
const useAppRouteTracker = () => {
  const location = useLocation();
  const { updateRouteInfo } = useApp();
  
  useEffect(() => {
    // Update the app context when route changes
    updateRouteInfo(location.pathname);
  }, [location.pathname, updateRouteInfo]);
};

export default useAppRouteTracker; 