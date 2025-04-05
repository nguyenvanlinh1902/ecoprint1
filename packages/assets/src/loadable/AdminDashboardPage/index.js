import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminDashboardPage Loadable Component
 * This is a specialized loadable component for the AdminDashboardPage
 */
const AdminDashboardPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/DashboardPage'))
);

export default AdminDashboardPageLoadable; 