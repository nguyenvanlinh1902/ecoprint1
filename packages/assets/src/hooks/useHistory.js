import useNavigationHelper from './useNavigationHelper';

/**
 * COMPATIBILITY HOOK - DO NOT USE FOR NEW CODE
 * 
 * This is a compatibility layer for components that were using the old useHistory hook.
 * For new components, use useNavigate from react-router-dom directly.
 * 
 * @deprecated Use useNavigate from react-router-dom directly
 */
const useHistory = useNavigationHelper;

export default useHistory; 