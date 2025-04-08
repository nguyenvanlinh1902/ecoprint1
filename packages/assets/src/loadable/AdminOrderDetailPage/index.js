import React, { lazy, Suspense } from 'react';
import DefaultLoadable from '../DefaultLoadable';
import AdminContextWrapper from '../../components/AdminContextWrapper';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * AdminOrderDetailPage Loadable Component
 * Wrapped with AdminContextWrapper to ensure AdminContext is available
 * Added error handling
 */
const ErrorBoundary = ({ children }) => {
  try {
    return children;
  } catch (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error loading component: {error.message}</Typography>
      </Box>
    );
  }
};

const AdminOrderDetailPageComponent = lazy(() => import('../../pages/admin/OrderDetailPage'));

const AdminOrderDetailPage = (props) => (
  <ErrorBoundary>
    <AdminContextWrapper>
      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      }>
        <AdminOrderDetailPageComponent {...props} />
      </Suspense>
    </AdminContextWrapper>
  </ErrorBoundary>
);

export default AdminOrderDetailPage; 