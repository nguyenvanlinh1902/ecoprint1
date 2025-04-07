import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';
import AdminContextWrapper from '../../components/AdminContextWrapper';

/**
 * AdminTransactionDetailPage Loadable Component
 * Wrapped with AdminContextWrapper to ensure AdminContext is available
 */
const AdminTransactionDetailPageLoadable = (props) => (
  <AdminContextWrapper>
    {DefaultLoadable(
      lazy(() => import('../../pages/admin/TransactionDetailPage'))
    )(props)}
  </AdminContextWrapper>
);

export default AdminTransactionDetailPageLoadable; 