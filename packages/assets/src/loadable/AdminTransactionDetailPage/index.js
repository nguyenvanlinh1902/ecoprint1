import React, { lazy, Suspense } from 'react';
import DefaultLoadable from '../DefaultLoadable';
import AdminContextWrapper from '../../components/AdminContextWrapper';
import { CircularProgress, Box, Alert } from '@mui/material';

// Error boundary component for catching lazy loading errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error loading AdminTransactionDetailPage:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ mt: 4 }}>
          Error loading page. Please try refreshing or contact support.
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * AdminTransactionDetailPage Loadable Component
 * Wrapped with AdminContextWrapper to ensure AdminContext is available
 * and ErrorBoundary for graceful error handling
 */
const AdminTransactionDetailPageLoadable = (props) => (
  <ErrorBoundary>
    <AdminContextWrapper>
      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      }>
        {DefaultLoadable(
          lazy(() => import('../../pages/admin/TransactionDetailPage'))
        )(props)}
      </Suspense>
    </AdminContextWrapper>
  </ErrorBoundary>
);

export default AdminTransactionDetailPageLoadable; 