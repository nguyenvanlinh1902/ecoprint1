import { ACTION_TYPES } from '../reducers/storeReducer';

/**
 * Display a toast message
 * @param {Function} dispatch - Store dispatch function
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether it's an error message
 */
export const setToast = (dispatch, message, isError = false) => {
  dispatch({
    type: ACTION_TYPES.SET_TOAST,
    payload: {
      message,
      isError
    }
  });

  // Automatically clear toast after 5 seconds
  setTimeout(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_TOAST });
  }, 5000);
};

/**
 * Clear the toast message
 * @param {Function} dispatch - Store dispatch function
 */
export const clearToast = (dispatch) => {
  dispatch({ type: ACTION_TYPES.CLEAR_TOAST });
};

/**
 * Set the current user
 * @param {Function} dispatch - Store dispatch function
 * @param {Object} user - User object
 */
export const setUser = (dispatch, user) => {
  dispatch({
    type: ACTION_TYPES.SET_USER,
    payload: user
  });
};

/**
 * Log out the current user
 * @param {Function} dispatch - Store dispatch function
 */
export const logout = (dispatch) => {
  // Clear any auth tokens
  localStorage.removeItem('auth_token');
  localStorage.removeItem('tokenTimestamp');
  
  dispatch({ type: ACTION_TYPES.LOGOUT });
}; 