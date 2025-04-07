import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';
import AdminContextWrapper from '../../components/AdminContextWrapper';

/**
 * AdminUserDetailPage Loadable Component
 * Wrapped with AdminContextWrapper to ensure AdminContext is available
 */
const AdminUserDetailPage = (props) => (
  <AdminContextWrapper>
    {DefaultLoadable(
      lazy(() => import('../../pages/admin/UserDetailPage'))
    )(props)}
  </AdminContextWrapper>
);

export default AdminUserDetailPage; 