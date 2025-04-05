import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminUsersPage Loadable Component
 * This is a specialized loadable component for the AdminUsersPage
 */
const AdminUsersPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/UsersPage'))
);

export default AdminUsersPageLoadable; 