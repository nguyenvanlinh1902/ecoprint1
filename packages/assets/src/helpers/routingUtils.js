/**
 * Navigation utilities to replace useHistory hook
 * Can be used directly in components that can't use React Router hooks
 */

/**
 * Navigate to a different route
 * @param {string} path - Path to navigate to
 * @param {Object} state - Optional state to pass to the new route
 */
export const navigate = (path, state = {}) => {
  window.history.pushState(state, '', path);
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
};

/**
 * Replace the current route
 * @param {string} path - Path to navigate to
 * @param {Object} state - Optional state to pass to the new route
 */
export const replace = (path, state = {}) => {
  window.history.replaceState(state, '', path);
  // Create and dispatch a popstate event to trigger any router listeners
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
};

/**
 * Go back in history
 */
export const goBack = () => {
  window.history.back();
};

/**
 * Go forward in history
 */
export const goForward = () => {
  window.history.forward();
};

/**
 * Navigate to a relative position in history
 * @param {number} delta - Number of steps to go (negative for back, positive for forward)
 */
export const go = (delta) => {
  window.history.go(delta);
};

/**
 * Get the current location
 * @returns {Object} Location object with pathname, search, hash, and state
 */
export const getLocation = () => {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: window.history.state
  };
}; 