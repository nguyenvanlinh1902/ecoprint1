export { useCollection, createFilter, createSort, createPagination } from './useCollection';

// Export CRUD API hooks directly
export { default as useFetchApi } from './api/useFetchApi';
export { default as useCreateApi } from './api/useCreateApi';
export { default as useEditApi } from './api/useEditApi';
export { default as useDeleteApi } from './api/useDeleteApi';

// Auth hooks
import { useAuth, AuthProvider } from './useAuth';
import useHistory from './useHistory';
import useNavigationHelper from './useNavigationHelper';
import useSessionPersistence from './useSessionPersistence';
import useRouteProtection from './useRouteProtection';

// Error hooks
import useErrorHandler from './useErrorHandler';

export {
  // Auth
  useAuth,
  AuthProvider,
  useHistory,
  useNavigationHelper,
  useSessionPersistence,
  useRouteProtection,
  
  // Error handling
  useErrorHandler
}; 