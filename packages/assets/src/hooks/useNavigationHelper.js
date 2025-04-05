import { useNavigate } from 'react-router-dom';

/**
 * Compatibility hook that provides the useHistory-like API
 * but uses the React Router v6 useNavigate hook under the hood
 * 
 * @returns {Object} - A history-like object with navigation methods
 */
export const useNavigationHelper = () => {
  const navigate = useNavigate();
  
  return {
    push: (path, state) => navigate(path, { state }),
    replace: (path, state) => navigate(path, { replace: true, state }),
    goBack: () => navigate(-1),
    go: (n) => navigate(n),
    location: {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: history.state
    }
  };
};

export default useNavigationHelper; 