import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminUserDetailPage Loadable Component
 */
const AdminUserDetailPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/UserDetailPage'))
);

export default AdminUserDetailPageLoadable; 