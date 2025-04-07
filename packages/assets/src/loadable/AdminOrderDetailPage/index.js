import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';
import AdminContextWrapper from '../../components/AdminContextWrapper';

/**
 * AdminOrderDetailPage Loadable Component
 * Wrapped with AdminContextWrapper to ensure AdminContext is available
 */
const AdminOrderDetailPage = (props) => (
  <AdminContextWrapper>
    {DefaultLoadable(
      lazy(() => import('../../pages/admin/OrderDetailPage'))
    )(props)}
  </AdminContextWrapper>
);

export default AdminOrderDetailPage; 