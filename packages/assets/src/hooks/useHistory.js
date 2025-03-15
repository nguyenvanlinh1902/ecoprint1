import { useNavigate } from 'react-router-dom';

/**
 * Compatibility hook that provides the useHistory API from React Router v5
 * while using useNavigate from React Router v6 under the hood
 * 
 * @returns {object} A history object with push, replace, and goBack methods
 */
export const useHistory = () => {
  const navigate = useNavigate();
  
  // Create a history object that mimics the React Router v5 history API
  return {
    push: (path, state) => navigate(path, { state }),
    replace: (path, state) => navigate(path, { replace: true, state }),
    goBack: () => navigate(-1),
    go: (n) => navigate(n),
    location: window.location
  };
};

export default useHistory; 