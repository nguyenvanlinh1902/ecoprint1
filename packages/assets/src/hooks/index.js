// Firebase hooks - Using API hooks instead
export { useCollection, createFilter, createSort, createPagination } from './useCollection';

// API hooks - import from ./api instead
import * as ApiHooks from './api';
export { ApiHooks };

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